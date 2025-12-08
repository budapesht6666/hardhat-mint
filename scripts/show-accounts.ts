import { network } from 'hardhat';

async function main(): Promise<void> {
  const { viem } = await network.connect();
  const walletClients = await viem.getWalletClients();

  const resolvedNetworkName = process.env.HARDHAT_NETWORK ?? 'polygonAmoy';

  if (walletClients.length === 0) {
    console.log('No wallet clients available for this network.');
    return;
  }

  console.log(`Connected network: ${resolvedNetworkName}`);
  walletClients.forEach((client, index) => {
    console.log(`#${index}: ${client.account.address}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
