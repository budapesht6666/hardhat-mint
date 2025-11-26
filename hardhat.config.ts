import 'dotenv/config';
import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import { configVariable, defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.28',
      },
      production: {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: 'edr-simulated',
      chainType: 'l1',
    },
    polygonAmoy: {
      type: 'http',
      chainType: 'op',
      url: configVariable('POLYGON_AMOY_RPC_URL'),
      accounts: [configVariable('WALLET_PRIVATE_KEY')],
    },
    arbitrumSepolia: {
      type: 'http',
      chainType: 'op',
      url: configVariable('ARBITRUM_SEPOLIA_RPC_URL'),
      accounts: [configVariable('WALLET_PRIVATE_KEY')],
    },
  },
});
