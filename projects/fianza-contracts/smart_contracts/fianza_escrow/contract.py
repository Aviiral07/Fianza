from algopy import (
    ARC4Contract,
    GlobalState,
    UInt64,
    Account,
    Txn,
    itxn,
    op,
)
from algopy.arc4 import abimethod, String


class FianzaEscrow(ARC4Contract):
    """
    Fianza Rental Escrow Smart Contract
    ------------------------------------
    Roles:
      - tenant:   the wallet that funds the escrow
      - landlord: the wallet that can release or raise a dispute
    Status values:
      0 = UNFUNDED
      1 = FUNDED
      2 = DISPUTED
    """

    def __init__(self) -> None:
        self.status = GlobalState(UInt64)          # 0=UNFUNDED, 1=FUNDED, 2=DISPUTED
        self.tenant = GlobalState(Account)         # wallet that deposited
        self.landlord = GlobalState(Account)       # wallet that can release/dispute
        self.deposit_amount = GlobalState(UInt64)  # amount locked in microALGO
        self.move_in_cid = GlobalState(String)     # IPFS CID for move-in photos

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    @abimethod
    def set_landlord(self, landlord: Account) -> String:
        """Called once by the tenant to register the landlord address."""
        assert self.status.value == UInt64(0), "Already funded"
        self.landlord.value = landlord
        return String("Landlord set")

    # ------------------------------------------------------------------
    # Tenant actions
    # ------------------------------------------------------------------

    @abimethod(allow_actions=["NoOp"])
    def fund_deposit(self) -> String:
        """
        Tenant sends ALGO to this contract to lock the deposit.
        The payment must be attached as a grouped PayTxn.
        """
        assert self.status.value == UInt64(0), "Already funded"

        # Record the tenant wallet
        self.tenant.value = Txn.sender

        # Get the payment amount from the grouped transaction
        pay = op.GTxn.amount(0)
        assert pay > UInt64(0), "Must send ALGO"
        self.deposit_amount.value = pay
        self.status.value = UInt64(1)

        return String("FUNDED")

    @abimethod
    def store_cid(self, cid: String) -> String:
        """Tenant stores IPFS CID of move-in/move-out photos on-chain."""
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.tenant.value, "Only tenant can store CID"
        self.move_in_cid.value = cid
        return String("CID stored")

    # ------------------------------------------------------------------
    # Landlord actions
    # ------------------------------------------------------------------

    @abimethod
    def release_deposit(self) -> String:
        """
        Landlord releases the full deposit back to the tenant.
        Sends the locked ALGO back via inner transaction.
        """
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.landlord.value, "Only landlord can release"

        amount = self.deposit_amount.value
        tenant = self.tenant.value

        # Send ALGO back to tenant
        itxn.Payment(
            receiver=tenant,
            amount=amount,
            fee=UInt64(1000),
        ).submit()

        self.status.value = UInt64(0)
        self.deposit_amount.value = UInt64(0)

        return String("RELEASED")

    @abimethod
    def raise_dispute(self) -> String:
        """
        Landlord freezes the escrow — funds are locked until resolved.
        In a full implementation, an oracle or arbitrator would resolve.
        """
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.landlord.value, "Only landlord can raise dispute"

        self.status.value = UInt64(2)

        return String("DISPUTED")

    # ------------------------------------------------------------------
    # Read-only
    # ------------------------------------------------------------------

    @abimethod(readonly=True)
    def get_status(self) -> String:
        """Returns current escrow status as a string."""
        if self.status.value == UInt64(1):
            return String("FUNDED")
        if self.status.value == UInt64(2):
            return String("DISPUTED")
        return String("UNFUNDED")

    @abimethod(readonly=True)
    def get_deposit_amount(self) -> UInt64:
        """Returns the locked deposit amount in microALGO."""
        return self.deposit_amount.value

    @abimethod(readonly=True)
    def get_cid(self) -> String:
        """Returns the stored IPFS CID."""
        return self.move_in_cid.value
