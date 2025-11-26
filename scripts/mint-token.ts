import 'dotenv/config';
import { createWalletClient, http, type Hex, defineChain, encodeFunctionData } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

type SupportedToken = 'USDCp' | 'USDTp';

interface MintArgs {
  network: 'polygonAmoy' | 'arbitrumSepolia';
  token: SupportedToken;
  to: string;
  amount: bigint;
  tokenAddress: string;
}

function parseArgs(): MintArgs {
  const argv = process.argv.slice(2);

  let network: string | undefined;
  let token: string | undefined;
  let to: string | undefined;
  let amount: string | undefined;
  let tokenAddress: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--network') {
      network = argv[++i];
    } else if (arg === '--token') {
      token = argv[++i];
    } else if (arg === '--to') {
      to = argv[++i];
    } else if (arg === '--amount') {
      amount = argv[++i];
    } else if (arg === '--token-address') {
      tokenAddress = argv[++i];
    }
  }

  if (!network || !token || !to || !amount || !tokenAddress) {
    console.error(
      'Usage: npm run mint -- --network <polygonAmoy|arbitrumSepolia> --token <USDCp|USDTp> --to <0x...> --amount <rawAmount> --token-address <0x...>',
    );
    process.exit(1);
  }

  if (network !== 'polygonAmoy' && network !== 'arbitrumSepolia') {
    console.error('network must be polygonAmoy or arbitrumSepolia');
    process.exit(1);
  }

  if (token !== 'USDCp' && token !== 'USDTp') {
    console.error('token must be USDCp or USDTp');
    process.exit(1);
  }

  const parsedAmount = BigInt(amount);

  return {
    network,
    token: token as SupportedToken,
    to,
    amount: parsedAmount,
    tokenAddress,
  };
}

function getRpcUrl(network: 'polygonAmoy' | 'arbitrumSepolia'): string {
  if (network === 'polygonAmoy') {
    const url = process.env.POLYGON_AMOY_RPC_URL;
    if (!url) {
      console.error('POLYGON_AMOY_RPC_URL is not set');
      process.exit(1);
    }
    return url;
  }

  const url = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!url) {
    console.error('ARBITRUM_SEPOLIA_RPC_URL is not set');
    process.exit(1);
  }
  return url;
}

async function main(): Promise<void> {
  const args = parseArgs();

  const privateKey = process.env.WALLET_PRIVATE_KEY as Hex | undefined;
  if (!privateKey) {
    console.error('WALLET_PRIVATE_KEY is not set');
    process.exit(1);
  }

  const account: PrivateKeyAccount = privateKeyToAccount(privateKey);
  const rpcUrl = getRpcUrl(args.network);

  const chain = defineChain({
    id: args.network === 'polygonAmoy' ? 80002 : 421614,
    name: args.network,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  });

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  console.log('Network:', args.network);
  console.log('RPC URL:', rpcUrl);
  console.log('Minter:', account.address);
  console.log('Token:', args.token);
  console.log('Token address:', args.tokenAddress);
  console.log('To:', args.to);
  console.log('Amount (raw):', args.amount.toString());

  const data = encodeFunctionData({
    abi: [
      {
        type: 'function',
        name: 'mint',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
      },
    ],
    functionName: 'mint',
    args: [args.to as `0x${string}`, args.amount],
  });

  const hash = await client.sendTransaction({
    chain,
    to: args.tokenAddress as `0x${string}`,
    data,
  });

  console.log('Mint tx hash:', hash);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
