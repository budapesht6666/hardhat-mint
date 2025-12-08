# Liquidity Infra Builder

Minimal Uniswap V2 style stack for Polygon Amoy & Arbitrum Sepolia using Hardhat 3 + TypeScript + viem.

---

## English

### What you get

- Mock ERC20 tokens `USDCp` & `USDTp` (6 decimals) with 1M minted to the deployer.
- Local `WETH9`, `UniswapV2Factory`, `UniswapV2Router02Minimal`, and a USDC/USDT pair per network.
- Address book per chain in `addresses/<network>.json` for frontends or scripts.

### Prerequisites

- Node.js 18+, npm, Git.
- RPC URLs for Polygon Amoy & Arbitrum Sepolia (Alchemy/Infura/etc.).
- One funded EOA private key (store in `.env`, do not commit).

`.env` example:

```env
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<KEY>
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/<KEY>
WALLET_PRIVATE_KEY=0x<PRIVATE_KEY>
```

### Bootstrap

```bash
npm install
npm run compile
npm run test
```

### Deploy everything

```bash
npm run setup:polygonAmoy
npm run setup:arbitrumSepolia
```

Each run refreshes `addresses/*.json` with new contract addresses.

### Testing

Run the test suite to verify contract functionality:

```bash
npm run test
```

Tests cover:
- Token minting and transfers
- Factory pair creation
- Liquidity pool operations
- Reentrancy protection
- Overflow protection
- Router functionality

### Extra scripts

- `npm run deploy:<network>` – deploy only `USDCp`/`USDTp` if you need clean tokens.
- `npm run mint -- --network <net> --token USDCp --to <addr> --amount 123000 --token-address <erc20>` – mint extra supply.

### Verifying pools

1. Copy `USDC_USDT_Pair` from `addresses/<network>.json`.
2. Inspect it on Arbiscan (Arbitrum) or OKLink (Polygon Amoy) to see `Add Liquidity` events.
3. Optionally verify `contracts/UniswapV2Factory.sol` on the scanner to unlock the _Read Contract_ tab (`getReserves`).

---

## Русский

### Что разворачивается

- Тестовые ERC20 `USDCp`/`USDTp` (6 знаков) с миллионным запасом у деплоера.
- Локальные `WETH9`, `UniswapV2Factory`, `UniswapV2Router02Minimal` и пул USDC/USDT в каждой сети.
- Файлы адресов `addresses/<network>.json` для UI и автоматизации.

### Что нужно

- Node.js 18+, npm.
- RPC URL для Polygon Amoy и Arbitrum Sepolia.
- Один приватный ключ EOA (добавь в `.env`, не коммить).

Пример `.env` выше.

### Запуск

```bash
npm install
npm run compile
npm run setup:polygonAmoy
npm run setup:arbitrumSepolia
```

После каждой команды проверяй `addresses/*.json` – там актуальные адреса фабрики, роутера, пары и токенов.

### Полезные дополнения

- `npm run deploy:<network>` – только токены, если хочешь их пересоздать.
- `npm run mint ...` – команда `mint-token.ts` позволяет быстро добросить USDCp/USDTp.

### Проверка пулов

1. Возьми адрес пары из `addresses/<network>.json`.
2. Открой сканер сети (Arbiscan / OKLink), вставь адрес и посмотри события `Add Liquidity`.
3. Чтобы получить вкладку `Read Contract`, верифицируй исходник пары (файл `contracts/UniswapV2Factory.sol`).

---

Happy hacking!
