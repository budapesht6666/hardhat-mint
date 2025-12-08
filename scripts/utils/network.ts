import { network } from 'hardhat';
import { createWalletClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, arbitrumSepolia } from 'viem/chains';

import { assertNetworkName, type NetworkName } from './addressBook.js';

const RPC_URL: Record<NetworkName, string | undefined> = {
  polygonAmoy: process.env.POLYGON_AMOY_RPC_URL,
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL,
};

const CHAINS: Record<NetworkName, Chain> = {
  polygonAmoy,
  arbitrumSepolia,
};

function resolveNetworkFromCliArgs(): string | undefined {
  const inline = process.argv.find((arg) => arg.startsWith('--network='));
  if (inline) {
    return inline.split('=')[1];
  }

  for (const flag of ['--network', '-n']) {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv[idx + 1]) {
      return process.argv[idx + 1];
    }
  }
  return undefined;
}

export function resolveNetworkName(): NetworkName {
  const candidate =
    resolveNetworkFromCliArgs() ??
    process.env.HARDHAT_NETWORK ??
    (network as unknown as { name?: string }).name ??
    'polygonAmoy';
  return assertNetworkName(candidate);
}

export function buildWalletClient(networkName: NetworkName) {
  const rpcUrl = RPC_URL[networkName];
  if (!rpcUrl) {
    throw new Error(`RPC URL is not configured for ${networkName}`);
  }
  const privateKey = process.env.WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) {
    throw new Error('WALLET_PRIVATE_KEY is not configured');
  }

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: CHAINS[networkName],
    transport: http(rpcUrl),
  });
}
