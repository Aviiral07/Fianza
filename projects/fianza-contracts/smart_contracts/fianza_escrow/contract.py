from algopy import ARC4Contract, GlobalState, UInt64, Account, Txn, itxn, op
from algopy.arc4 import abimethod, String


class FianzaEscrow(ARC4Contract):
    """
    Fianza Rental Escrow Smart Contract
    ------------------------------------
    Status values:
      0 = UNFUNDED
      1 = FUNDED
      2 = DISPUTED
    """

    def __init__(self) -> None:
        self.status = GlobalState(UInt64)
        self.deposit_amount = GlobalState(UInt64)
        self.tenant = GlobalState(Account)
        self.landlord = GlobalState(Account)
        self.move_in_cid = GlobalState(String)

    @abimethod
    def set_landlord(self, landlord: Account) -> String:
        """Called once by the tenant to register the landlord address."""
        status, exists = self.status.maybe()
        if exists:
            assert status == UInt64(0), "Already funded"
        self.landlord.value = landlord
        if not exists:
            self.status.value = UInt64(0)
            self.deposit_amount.value = UInt64(0)
            self.move_in_cid.value = String("")
        return String("Landlord set")

    @abimethod(allow_actions=["NoOp"])
    def fund_deposit(self) -> String:
        """Tenant sends ALGO to lock deposit."""
        status, exists = self.status.maybe()
        if exists:
            assert status == UInt64(0), "Already funded"
        self.tenant.value = Txn.sender
        pay = op.GTxn.amount(0)
        assert pay > UInt64(0), "Must send ALGO"
        self.deposit_amount.value = pay
        self.status.value = UInt64(1)
        return String("FUNDED")

    @abimethod
    def store_cid(self, cid: String) -> String:
        """Tenant stores IPFS CID on-chain."""
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.tenant.value, "Only tenant can store CID"
        self.move_in_cid.value = cid
        return String("CID stored")

    @abimethod
    def release_deposit(self) -> String:
        """Landlord releases deposit back to tenant."""
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.landlord.value, "Only landlord can release"
        amount = self.deposit_amount.value
        tenant = self.tenant.value
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
        """Landlord freezes the escrow."""
        assert self.status.value == UInt64(1), "Escrow must be FUNDED"
        assert Txn.sender == self.landlord.value, "Only landlord can raise dispute"
        self.status.value = UInt64(2)
        return String("DISPUTED")

    @abimethod(readonly=True)
    def get_status(self) -> String:
        """Returns current escrow status."""
        status, exists = self.status.maybe()
        if not exists:
            return String("UNFUNDED")
        if status == UInt64(1):
            return String("FUNDED")
        if status == UInt64(2):
            return String("DISPUTED")
        return String("UNFUNDED")

    @abimethod(readonly=True)
    def get_deposit_amount(self) -> UInt64:
        """Returns locked deposit amount in microALGO."""
        amount, exists = self.deposit_amount.maybe()
        if not exists:
            return UInt64(0)
        return amount

    @abimethod(readonly=True)
    def get_cid(self) -> String:
        """Returns stored IPFS CID."""
        cid, exists = self.move_in_cid.maybe()
        if not exists:
            return String("")
        return cid
