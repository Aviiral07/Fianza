import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    # Reads ALGOD_SERVER / INDEXER_SERVER / etc. from the .env file (TestNet in our case),
    # instead of always forcing LocalNet.
    algorand = algokit_utils.AlgorandClient.from_environment()
    # Reads the DEPLOYER_MNEMONIC from the .env file to sign the deployment.
    deployer = algorand.account.from_environment("DEPLOYER")

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
