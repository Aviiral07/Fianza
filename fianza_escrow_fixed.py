"""
Fianza escrow - remediation sketch for audit findings F-01 to F-05.

STATUS: UNTESTED. Not compiled, not deployed, not audited. Treat it as a
reference design to review, compile with a pinned Algorand Python version,
and cover with adversarial tests before any real use.

What it fixes
  F-01  fund_deposit takes a typed payment and validates every field.
  F-02  arbiters are fixed at creation; each can vote once; 2 of 3 decide.
  F-03  landlord, tenant and arbiters are set atomically at creation;
        funding needs the tenant's own payment, and only the tenant can fund.
  F-04  every state has an exit: mutual checkout, tenant claim after a
        grace period, arbiter vote, or a 50/50 split if arbiters stall.
  F-05  the minimum-balance reserve is funded separately and checked before
        funding; inner transactions use fee=0 (caller covers via fee pooling).

Setup flow
  1. Landlord calls create_agreement (creator becomes landlord).
  2. Anyone sends a plain payment to the app address covering its minimum
     balance (reserve). Funding is refused until this is done.
  3. Tenant sends [payment, fund_deposit] as one group.
  4. Exit through checkout, claim_after_grace, or dispute + arbiter_vote.

Not covered here: F-06 to F-19 (repo hygiene, evidence CID handling,
one-escrow-per-app, deploy config, frontend). The evidence CID from v1 is
left out on purpose; if you keep it, make it write-once (F-08).
"""

from algopy import (
    Account,
    ARC4Contract,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
)

CREATED = UInt64(0)
FUNDED = UInt64(1)
DISPUTED = UInt64(2)
CLOSED = UInt64(3)

GRACE_SECONDS = UInt64(30 * 24 * 60 * 60)  # tenant may claim after lease end + 30 days
DISPUTE_STALL_SECONDS = UInt64(60 * 24 * 60 * 60)  # arbiters get 60 days


class FianzaEscrow(ARC4Contract):
    def __init__(self) -> None:
        self.status = GlobalState(UInt64)
        self.landlord = GlobalState(Account)
        self.tenant = GlobalState(Account)
        self.arbiter1 = GlobalState(Account)
        self.arbiter2 = GlobalState(Account)
        self.arbiter3 = GlobalState(Account)
        self.deposit_amount = GlobalState(UInt64)
        self.lease_end = GlobalState(UInt64)
        self.landlord_signed = GlobalState(UInt64)
        self.tenant_signed = GlobalState(UInt64)
        self.voted_mask = GlobalState(UInt64)
        self.tenant_votes = GlobalState(UInt64)
        self.landlord_votes = GlobalState(UInt64)
        self.dispute_started = GlobalState(UInt64)

    # ---------------------------------------------------------------- create
    @arc4.abimethod(create="require")
    def create_agreement(
        self,
        tenant: Account,
        arbiter1: Account,
        arbiter2: Account,
        arbiter3: Account,
        lease_end: UInt64,
    ) -> None:
        landlord = Txn.sender
        # Six distinct roles-by-address checks (F-03, F-07).
        assert tenant != landlord, "Tenant must differ from landlord"
        assert arbiter1 != arbiter2, "Arbiters must be distinct"
        assert arbiter1 != arbiter3, "Arbiters must be distinct"
        assert arbiter2 != arbiter3, "Arbiters must be distinct"
        for a in (arbiter1, arbiter2, arbiter3):
            assert a != landlord, "Arbiter cannot be landlord"
            assert a != tenant, "Arbiter cannot be tenant"
        assert lease_end > Global.latest_timestamp, "Lease end must be in the future"

        self.landlord.value = landlord
        self.tenant.value = tenant
        self.arbiter1.value = arbiter1
        self.arbiter2.value = arbiter2
        self.arbiter3.value = arbiter3
        self.lease_end.value = lease_end
        self.deposit_amount.value = UInt64(0)
        self.landlord_signed.value = UInt64(0)
        self.tenant_signed.value = UInt64(0)
        self.voted_mask.value = UInt64(0)
        self.tenant_votes.value = UInt64(0)
        self.landlord_votes.value = UInt64(0)
        self.dispute_started.value = UInt64(0)
        self.status.value = CREATED

    # ------------------------------------------------------------------ fund
    @arc4.abimethod
    def fund_deposit(self, payment: gtxn.PaymentTransaction) -> None:
        assert self.status.value == CREATED, "Not fundable"
        assert Txn.sender == self.tenant.value, "Only tenant funds"
        # F-01: validate every field of the payment.
        assert payment.sender == Txn.sender, "Payment must come from caller"
        assert payment.receiver == Global.current_application_address, "Wrong receiver"
        assert payment.amount > UInt64(0), "Zero deposit"
        assert payment.close_remainder_to == Global.zero_address, "close-to set"
        assert payment.rekey_to == Global.zero_address, "rekey-to set"
        # F-05: the deposit must sit on top of the minimum-balance reserve.
        app = Global.current_application_address
        assert app.balance >= app.min_balance + payment.amount, "Fund reserve first"

        self.deposit_amount.value = payment.amount
        self.status.value = FUNDED

    # -------------------------------------------------------------- checkout
    @arc4.abimethod
    def sign_checkout(self) -> None:
        """Both parties sign; the full deposit then returns to the tenant."""
        assert self.status.value == FUNDED, "Not in FUNDED state"
        if Txn.sender == self.landlord.value:
            self.landlord_signed.value = UInt64(1)
        elif Txn.sender == self.tenant.value:
            self.tenant_signed.value = UInt64(1)
        else:
            assert False, "Not a party"
        if self.landlord_signed.value == UInt64(1) and self.tenant_signed.value == UInt64(1):
            self._pay_all(self.tenant.value)

    @arc4.abimethod
    def claim_after_grace(self) -> None:
        """F-04 exit: landlord silent after lease end, so the tenant recovers."""
        assert self.status.value == FUNDED, "Not in FUNDED state"
        assert Txn.sender == self.tenant.value, "Only tenant"
        assert Global.latest_timestamp >= self.lease_end.value + GRACE_SECONDS, "Too early"
        self._pay_all(self.tenant.value)

    # --------------------------------------------------------------- dispute
    @arc4.abimethod
    def raise_dispute(self) -> None:
        assert self.status.value == FUNDED, "Not in FUNDED state"
        assert (
            Txn.sender == self.landlord.value or Txn.sender == self.tenant.value
        ), "Not a party"
        self.status.value = DISPUTED
        self.dispute_started.value = Global.latest_timestamp

    @arc4.abimethod
    def arbiter_vote(self, for_tenant: arc4.Bool) -> None:
        assert self.status.value == DISPUTED, "No dispute"
        # F-02: caller must be a registered arbiter and may vote once.
        bit = UInt64(0)
        if Txn.sender == self.arbiter1.value:
            bit = UInt64(1)
        elif Txn.sender == self.arbiter2.value:
            bit = UInt64(2)
        elif Txn.sender == self.arbiter3.value:
            bit = UInt64(4)
        assert bit != UInt64(0), "Not an arbiter"
        assert (self.voted_mask.value & bit) == UInt64(0), "Already voted"
        self.voted_mask.value = self.voted_mask.value | bit

        if for_tenant.native:
            self.tenant_votes.value += UInt64(1)
        else:
            self.landlord_votes.value += UInt64(1)

        if self.tenant_votes.value >= UInt64(2):
            self._pay_all(self.tenant.value)
        elif self.landlord_votes.value >= UInt64(2):
            self._pay_all(self.landlord.value)

    @arc4.abimethod
    def resolve_stalled_dispute(self) -> None:
        """F-04 exit: arbiters never reached 2 votes, so split 50/50."""
        assert self.status.value == DISPUTED, "No dispute"
        assert (
            Global.latest_timestamp >= self.dispute_started.value + DISPUTE_STALL_SECONDS
        ), "Too early"
        amount = self.deposit_amount.value
        half = amount // UInt64(2)
        self.status.value = CLOSED  # state first, then pay
        self.deposit_amount.value = UInt64(0)
        itxn.Payment(receiver=self.tenant.value, amount=half, fee=0).submit()
        itxn.Payment(receiver=self.landlord.value, amount=amount - half, fee=0).submit()

    # ----------------------------------------------------------------- reads
    @arc4.abimethod(readonly=True)
    def get_status(self) -> UInt64:
        return self.status.value

    # --------------------------------------------------------------- helpers
    def _pay_all(self, to: Account) -> None:
        amount = self.deposit_amount.value
        # Effects before interaction; the reserve stays because only the
        # recorded deposit leaves the account (F-05).
        self.status.value = CLOSED
        self.deposit_amount.value = UInt64(0)
        # fee=0: the caller covers it by raising the outer fee (fee pooling).
        itxn.Payment(receiver=to, amount=amount, fee=0).submit()
