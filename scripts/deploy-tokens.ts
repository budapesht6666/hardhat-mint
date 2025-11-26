import { network } from 'hardhat';

async function main(): Promise<void> {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log('Network chainId:', await publicClient.getChainId());
  console.log('Deployer:', walletClient.account.address);

  const usdcp = await viem.deployContract('USDCp');
  const usdtp = await viem.deployContract('USDTp');

  console.log('USDCp deployed to:', usdcp.address);
  console.log('USDTp deployed to:', usdtp.address);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
