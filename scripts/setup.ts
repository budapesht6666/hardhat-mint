import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { network } from 'hardhat';
import { createWalletClient, http } from 'viem';
import type { Address, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, arbitrumSepolia } from 'viem/chains';

const ONE_MILLION = 1_000_000n * 10n ** 18n;

type NetworkName = 'polygonAmoy' | 'arbitrumSepolia';
interface AddressBook {
  USDCpx?: Address;
  USDTpx?: Address;
  WETH9?: Address;
  UniswapV2Factory?: Address;
  UniswapV2Router02?: Address;
  USDC_USDT_Pair?: Address;
}

const RPC_URL: Record<NetworkName, string | undefined> = {
  polygonAmoy: process.env.POLYGON_AMOY_RPC_URL,
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL,
};

const CHAINS: Record<NetworkName, Chain> = {
  polygonAmoy,
  arbitrumSepolia,
};

function buildWalletClient(networkName: NetworkName) {
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

async function loadAddresses(networkName: NetworkName): Promise<AddressBook> {
  const dir = path.join(process.cwd(), 'addresses');
  const file = path.join(dir, `${networkName}.json`);
  if (!existsSync(file)) return {};
  const raw = await readFile(file, 'utf-8');
  return JSON.parse(raw) as AddressBook;
}

async function saveAddresses(networkName: NetworkName, data: AddressBook): Promise<void> {
  const dir = path.join(process.cwd(), 'addresses');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const file = path.join(dir, `${networkName}.json`);
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function main() {
  const networkName = (process.env.HARDHAT_NETWORK ?? 'polygonAmoy') as NetworkName;
  const { viem } = await network.connect();
  const walletClient = buildWalletClient(networkName);

  const addresses = await loadAddresses(networkName);

  // 1. Deploy Tokens
  if (!addresses.USDCpx) {
    const usdc = await viem.deployContract('USDCpx', [], {
      client: { wallet: walletClient },
    });
    addresses.USDCpx = usdc.address;
    console.log(`[${networkName}] USDCpx deployed at`, usdc.address);
  }
  if (!addresses.USDTpx) {
    const usdt = await viem.deployContract('USDTpx', [], {
      client: { wallet: walletClient },
    });
    addresses.USDTpx = usdt.address;
    console.log(`[${networkName}] USDTpx deployed at`, usdt.address);
  }

  // 2. Deploy DEX Infrastructure
  if (!addresses.WETH9) {
    const weth = await viem.deployContract('WETH9', [], {
      client: { wallet: walletClient },
    });
    addresses.WETH9 = weth.address;
    console.log(`[${networkName}] WETH9 deployed at`, weth.address);
  }
  if (!addresses.UniswapV2Factory) {
    const factory = await viem.deployContract('UniswapV2Factory', [walletClient.account.address], {
      client: { wallet: walletClient },
    });
    addresses.UniswapV2Factory = factory.address;
    console.log(`[${networkName}] UniswapV2Factory deployed at`, factory.address);
  }
  if (!addresses.UniswapV2Router02) {
    const router = await viem.deployContract(
      'UniswapV2Router02Minimal',
      [addresses.UniswapV2Factory, addresses.WETH9],
      {
        client: { wallet: walletClient },
      },
    );
    addresses.UniswapV2Router02 = router.address;
    console.log(`[${networkName}] UniswapV2Router02 deployed at`, router.address);
  }

  // 3. Create Pair
  if (!addresses.USDC_USDT_Pair) {
    const factory = await viem.getContractAt('UniswapV2Factory', addresses.UniswapV2Factory!, {
      client: { wallet: walletClient },
    });
    const hash = await factory.write.createPair([addresses.USDCpx!, addresses.USDTpx!]);
    console.log(`[${networkName}] createPair tx:`, hash);
    // В учебных целях просто читаем getPair после майнинга
    const pairAddress = (await factory.read.getPair([
      addresses.USDCpx!,
      addresses.USDTpx!,
    ])) as Address;
    addresses.USDC_USDT_Pair = pairAddress;
    console.log(`[${networkName}] USDC-USDT pair at`, pairAddress);
  }

  // 4. Mint Tokens
  const usdcpx = await viem.getContractAt('USDCpx', addresses.USDCpx!, {
    client: { wallet: walletClient },
  });
  const usdtpx = await viem.getContractAt('USDTpx', addresses.USDTpx!, {
    client: { wallet: walletClient },
  });

  await usdcpx.write.mint([walletClient.account.address, ONE_MILLION]);
  await usdtpx.write.mint([walletClient.account.address, ONE_MILLION]);
  console.log(`[${networkName}] Minted 1,000,000 USDCpx & USDTpx to`, walletClient.account.address);

  // 5. Approve Router
  const routerAddress = addresses.UniswapV2Router02!;
  await usdcpx.write.approve([routerAddress, ONE_MILLION]);
  await usdtpx.write.approve([routerAddress, ONE_MILLION]);
  console.log(`[${networkName}] Approved router for USDCpx/USDTpx`);

  // 6. Add Liquidity
  const router = await viem.getContractAt('UniswapV2Router02Minimal', routerAddress, {
    client: { wallet: walletClient },
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
  const amount = 100_000n * 10n ** 18n;
  await router.write.addLiquidity([
    addresses.USDCpx!,
    addresses.USDTpx!,
    amount,
    amount,
    amount,
    amount,
    walletClient.account.address,
    deadline,
  ]);
  console.log(`[${networkName}] addLiquidity called for USDCpx/USDTpx`);

  await saveAddresses(networkName, addresses);
  console.log(`[${networkName}] Addresses saved to addresses/${networkName}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
