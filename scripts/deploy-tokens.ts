import { network } from 'hardhat';

import {
  loadAddressBook,
  mergeAddressBook,
  saveAddressBook,
  type AddressBook,
} from './utils/addressBook.js';
import { buildWalletClient, resolveNetworkName } from './utils/network.js';

async function main(): Promise<void> {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const networkName = resolveNetworkName();
  const walletClient = buildWalletClient(networkName);
  let addresses = await loadAddressBook(networkName);

  const persist = async (updates: Partial<AddressBook>): Promise<void> => {
    addresses = mergeAddressBook(addresses, updates);
    await saveAddressBook(networkName, addresses);
  };

  console.log('Network chainId:', await publicClient.getChainId());
  console.log('Deployer:', walletClient.account.address);
  console.log('Hardhat network:', networkName);

  const usdcp = await viem.deployContract('USDCp', [], {
    client: { wallet: walletClient },
  });
  await persist({ USDCp: usdcp.address });
  console.log(`[${networkName}] USDCp deployed to:`, usdcp.address);

  const usdtp = await viem.deployContract('USDTp', [], {
    client: { wallet: walletClient },
  });
  await persist({ USDTp: usdtp.address });
  console.log(`[${networkName}] USDTp deployed to:`, usdtp.address);

  console.log(`[${networkName}] Addresses stored in addresses/${networkName}.json`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
