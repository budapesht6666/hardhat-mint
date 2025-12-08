import { network } from 'hardhat';
import type { Address, Hash } from 'viem';

import {
  assertNetworkName,
  loadAddressBook,
  mergeAddressBook,
  saveAddressBook,
  type AddressBook,
  type NetworkName,
} from './utils/addressBook.js';
import { buildWalletClient, resolveNetworkName } from './utils/network.js';

const TOKEN_DECIMALS = 6n;
const TOKEN_UNIT = 10n ** TOKEN_DECIMALS;
const ONE_MILLION_TOKENS = 1_000_000n * TOKEN_UNIT;
const LIQUIDITY_TOKENS = 100_000n * TOKEN_UNIT;
const SLIPPAGE_TOLERANCE = 95n; // 5% slippage tolerance
const DEADLINE_MINUTES = 20;

async function main() {
  const networkName = resolveNetworkName();
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClient = buildWalletClient(networkName);
  let addressBook = await loadAddressBook(networkName);

  const persist = async (updates: Partial<AddressBook>): Promise<void> => {
    addressBook = mergeAddressBook(addressBook, updates);
    await saveAddressBook(networkName, addressBook);
  };

  const usdcAddress = addressBook.USDCp;
  const usdtAddress = addressBook.USDTp;
  if (!usdcAddress || !usdtAddress) {
    throw new Error(
      `[${networkName}] Missing token addresses. Run "npm run deploy:${networkName}" to deploy USDCp/USDTp first.`,
    );
  }

  if (!addressBook.WETH9) {
    const weth = await viem.deployContract('WETH9', [], {
      client: { wallet: walletClient },
    });
    await persist({ WETH9: weth.address });
    console.log(`[${networkName}] WETH9 deployed at`, weth.address);
  }

  if (!addressBook.UniswapV2Factory) {
    const factory = await viem.deployContract('UniswapV2Factory', [walletClient.account.address], {
      client: { wallet: walletClient },
    });
    await persist({ UniswapV2Factory: factory.address });
    console.log(`[${networkName}] UniswapV2Factory deployed at`, factory.address);
  }

  if (!addressBook.UniswapV2Router02) {
    if (!addressBook.UniswapV2Factory || !addressBook.WETH9) {
      throw new Error(
        `[${networkName}] Unable to deploy router: missing factory or WETH9 address.`,
      );
    }
    const router = await viem.deployContract(
      'UniswapV2Router02Minimal',
      [addressBook.UniswapV2Factory, addressBook.WETH9],
      {
        client: { wallet: walletClient },
      },
    );
    await persist({ UniswapV2Router02: router.address });
    console.log(`[${networkName}] UniswapV2Router02 deployed at`, router.address);
  }

  if (!addressBook.USDC_USDT_Pair) {
    if (!addressBook.UniswapV2Factory) {
      throw new Error(`[${networkName}] Unable to create pair: factory address missing.`);
    }
    const factory = await viem.getContractAt('UniswapV2Factory', addressBook.UniswapV2Factory, {
      client: { wallet: walletClient },
    });
    const createPairHash = await factory.write.createPair([usdcAddress, usdtAddress]);
    console.log(`[${networkName}] createPair tx:`, createPairHash);
    await publicClient.waitForTransactionReceipt({ hash: createPairHash });
    const pairAddress = (await factory.read.getPair([usdcAddress, usdtAddress])) as Address;
    await persist({ USDC_USDT_Pair: pairAddress });
    console.log(`[${networkName}] USDCp-USDTp pair at`, pairAddress);
  }

  const usdc = await viem.getContractAt('USDCp', usdcAddress, {
    client: { wallet: walletClient },
  });
  const usdt = await viem.getContractAt('USDTp', usdtAddress, {
    client: { wallet: walletClient },
  });

  // Check current balances and mint only if needed (idempotency)
  const usdcBalance = (await usdc.read.balanceOf([walletClient.account.address])) as bigint;
  const usdtBalance = (await usdt.read.balanceOf([walletClient.account.address])) as bigint;

  if (usdcBalance < ONE_MILLION_TOKENS) {
    const mintAmount = ONE_MILLION_TOKENS - usdcBalance;
    const mintUsdcHash = (await usdc.write.mint([
      walletClient.account.address,
      mintAmount,
    ])) as Hash;
    await publicClient.waitForTransactionReceipt({ hash: mintUsdcHash });
    console.log(`[${networkName}] Minted ${mintAmount / TOKEN_UNIT} USDCp to`, walletClient.account.address);
  } else {
    console.log(`[${networkName}] Sufficient USDCp balance (${usdcBalance / TOKEN_UNIT}), skipping mint`);
  }

  if (usdtBalance < ONE_MILLION_TOKENS) {
    const mintAmount = ONE_MILLION_TOKENS - usdtBalance;
    const mintUsdtHash = (await usdt.write.mint([
      walletClient.account.address,
      mintAmount,
    ])) as Hash;
    await publicClient.waitForTransactionReceipt({ hash: mintUsdtHash });
    console.log(`[${networkName}] Minted ${mintAmount / TOKEN_UNIT} USDTp to`, walletClient.account.address);
  } else {
    console.log(`[${networkName}] Sufficient USDTp balance (${usdtBalance / TOKEN_UNIT}), skipping mint`);
  }

  const routerAddress = addressBook.UniswapV2Router02;
  if (!routerAddress) {
    throw new Error(`[${networkName}] Router address missing, cannot approve or add liquidity.`);
  }

  const approveUsdcHash = (await usdc.write.approve([routerAddress, ONE_MILLION_TOKENS])) as Hash;
  await publicClient.waitForTransactionReceipt({ hash: approveUsdcHash });
  const approveUsdtHash = (await usdt.write.approve([routerAddress, ONE_MILLION_TOKENS])) as Hash;
  await publicClient.waitForTransactionReceipt({ hash: approveUsdtHash });
  console.log(`[${networkName}] Approved router for USDCp/USDTp`);

  const router = await viem.getContractAt('UniswapV2Router02Minimal', routerAddress, {
    client: { wallet: walletClient },
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * DEADLINE_MINUTES);
  const amount = LIQUIDITY_TOKENS;
  // Apply slippage tolerance: allow 5% deviation from desired amounts
  const minAmount = (amount * SLIPPAGE_TOLERANCE) / 100n;
  const addLiquidityHash = await router.write.addLiquidity([
    usdcAddress,
    usdtAddress,
    amount,
    amount,
    minAmount,
    minAmount,
    walletClient.account.address,
    deadline,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: addLiquidityHash });
  console.log(`[${networkName}] addLiquidity called for USDCp/USDTp with ${SLIPPAGE_TOLERANCE}% slippage protection`);

  console.log(`[${networkName}] Address book stored at addresses/${networkName}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
