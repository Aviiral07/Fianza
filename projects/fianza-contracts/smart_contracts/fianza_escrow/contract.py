from algopy import ARC4Contract, GlobalState, UInt64
from algopy.arc4 import abimethod, String


class FianzaEscrow(ARC4Contract):

    def __init__(self) -> None:
        self.is_funded = GlobalState(UInt64)

    @abimethod
    def get_status(self) -> String:
        if self.is_funded.value == UInt64(1):
            return String("FUNDED")
        return String("UNFUNDED")

    @abimethod
    def set_funded(self) -> String:
        self.is_funded.value = UInt64(1)
        return String("Funded")
