import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    algorand = algokit_utils.AlgorandClient.default_localnet()
    deployer = algorand.account.localnet_dispenser()

    from smart_contracts.artifacts.fianza_escrow.fianza_escrow_client import (
        FianzaEscrowFactory,
    )

    factory = FianzaEscrowFactory(
        algorand=algorand,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    client, deploy_result = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.ReplaceApp,
        on_update=algokit_utils.OnUpdate.UpdateApp,
    )

    logger.info(
        f"✅ Fianza escrow deployed!\n"
        f"App ID: {client.app_id}\n"
        f"App Address: {client.app_address}"
    )
