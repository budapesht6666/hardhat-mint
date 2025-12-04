## Liquidity Infrastructure Builder (Uniswap V2, Hardhat, Viem)

Проект на Hardhat 3 + TypeScript, который разворачивает минимальную инфраструктуру Uniswap V2‑подобного DEX и тестовые токены в сетях Polygon Amoy и Arbitrum Sepolia.

После запуска единого скрипта `scripts/setup.ts` в каждой сети будут:

- тестовые токены: `TestUSDC`, `TestUSDT`;
- токен обёрнутого нативного актива: `WETH9` (локальный mock);
- `UniswapV2Factory`;
- `UniswapV2Router02Minimal` (упрощённый Router02);
- пул ликвидности `USDC–USDT` (локальный для каждой сети);
- заминченные балансы для добавления ликвидности.

Это создаёт две независимые DEX‑зоны (Polygon Amoy и Arbitrum Sepolia), которые можно использовать для будущего офф‑чейн роутинга и кросс‑сетевых swap’ов.

---

## 1. Установка Node.js, npm, Hardhat

1. Установи Node.js LTS (18+):
   - https://nodejs.org
2. Проверь версии:

```bash
node -v
npm -v
```

3. Локальная установка Hardhat уже описана в `package.json`, глобально ставить не обязательно – всё запускается через `npx hardhat ...`.

---

## 2. Установка зависимостей

```bash
cd /c/projects/hardhat-mint
npm install
```

Зависимости включают:

- `hardhat` 3;
- `@nomicfoundation/hardhat-toolbox-viem`;
- `viem`;
- `@openzeppelin/contracts` (для ERC20).

---

## 3. Настройка `.env`

Создай файл `.env` в корне проекта (рядом с `hardhat.config.ts`):

```env
# RPC эндпоинты тестовых сетей
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/ТВОЙ_ALCHEMY_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/ТВОЙ_ALCHEMY_KEY

# Один приватный ключ (EOA), из которого деплоим и минтим
WALLET_PRIVATE_KEY=0xТВОЙ_ПРИВАТНЫЙ_КЛЮЧ
```

Где взять значения:

- `*_RPC_URL` — в Alchemy/Infura/QuickNode и т.п.: создаёшь App под сеть Polygon Amoy / Arbitrum Sepolia и копируешь HTTPS URL.
- `WALLET_PRIVATE_KEY` — экспорт приватного ключа из Rabby/MetaMask (строка hex, обязательно с префиксом `0x`).

`hardhat.config.ts` уже использует эти переменные через `configVariable(...)`.

Убедись, что `.env` не коммитится (он уже в `.gitignore`).

---

## 4. Компиляция контрактов

```bash
npx hardhat compile
```

Ожидаемый результат: сообщение вида

```text
Compiled Solidity files with solc 0.8.28 (evm target: cancun)
```

---

## 5. Единый скрипт `setup.ts`

Главная точка входа — `scripts/setup.ts`. Он выполняет все шаги:

1. **Deploy Tokens**
   - деплой `TestUSDC` и `TestUSDT` в выбранной сети;
   - адреса сохраняются в `addresses/<network>.json`.
2. **Deploy DEX Infrastructure**
   - деплой `WETH9` (локальный wrapped native);
   - деплой `UniswapV2Factory` (с `feeToSetter = deployer`);
   - деплой `UniswapV2Router02Minimal` (передаётся `factory` и `WETH`).
3. **Create Pairs**
   - вызов `factory.createPair(TestUSDC, TestUSDT)`;
   - адрес пары сохраняется в `addresses/<network>.json` как `USDC_USDT_Pair`.
4. **Mint Tokens**
   - минтит на адрес деплоера:
     - `TestUSDC`: `1_000_000 * 10^18`;
     - `TestUSDT`: `1_000_000 * 10^18`.
5. **Approve Router**
   - `TestUSDC.approve(router, max)`;
   - `TestUSDT.approve(router, max)`.
6. **Add Liquidity**
   - вызов `router.addLiquidity(USDC, USDT, amountA, amountB, amountAMin, amountBMin, to, deadline)` с симметричными суммами;
   - ликвидность отправляется на адрес деплоера.

Скрипт использует `hardhat-viem` API:

- `viem.deployContract('ContractName', [...args])`;
- `viem.getContractAt('ContractName', address)`;
- `contract.write.<method>([args...])`.

---

## 6. Как запустить `setup.ts` для каждой сети

Команды уже прописаны в `package.json`:

### Polygon Amoy

```bash
npm run setup:polygonAmoy
```

### Arbitrum Sepolia

```bash
npm run setup:arbitrumSepolia
```

Под капотом это эквивалентно:

```bash
npx hardhat run scripts/setup.ts --network polygonAmoy
npx hardhat run scripts/setup.ts --network arbitrumSepolia
```

После успешного выполнения для каждой сети появится файл:

- `addresses/polygonAmoy.json`;
- `addresses/arbitrumSepolia.json`.

Внутри будут адреса вида:

```json
{
  "TestUSDC": "0x...",
  "TestUSDT": "0x...",
  "WETH9": "0x...",
  "UniswapV2Factory": "0x...",
  "UniswapV2Router02": "0x...",
  "USDC_USDT_Pair": "0x..."
}
```

---

## 7. Как проверить пулы и ликвидность на сканере

1. Открой файл `addresses/<network>.json` и возьми оттуда:
   - адреса `TestUSDC`, `TestUSDT`;
   - адрес `USDC_USDT_Pair`;
   - адрес `UniswapV2Router02` и `UniswapV2Factory` (при необходимости).
2. Перейди на соответствующий блокчейн‑сканер:
   - Polygon Amoy: https://www.oklink.com/amoy;
   - Arbitrum Sepolia: https://sepolia.arbiscan.io/.
3. Вставь адрес контракта `USDC_USDT_Pair`:
   - должен быть виден контракт с токен‑балансами `TestUSDC` и `TestUSDT`;
   - вкладка `Holders` покажет держателя ликвидности (адрес деплоера).
4. Проверь адреса токенов `TestUSDC` и `TestUSDT`:
   - на вкладке `Holders` увидишь баланс деплоера (около 1 000 000 - часть ушла в пул).

---

## 8. Как увидеть токены и LP в кошельке

### Токены TestUSDC / TestUSDT

1. Переключись в кошельке на нужную сеть:
   - Polygon Amoy (`80002`);
   - Arbitrum Sepolia (`421614`).
2. Добавь токены вручную:
   - `Token contract address` = адрес `TestUSDC` или `TestUSDT` из `addresses/<network>.json`;
   - `Symbol` можно указать `TUSDC` / `TUSDT` (либо оставить как в контракте);
   - `Decimals` = `18`.

### LP‑токен (пара USDC–USDT)

1. Вставь адрес пары `USDC_USDT_Pair` как кастомный токен в сети;
2. Кошелёк покажет баланс LP‑токена у деплоера.

---

## 9. Что подготовлено для будущего UI и кросс‑сетевых swap’ов

На данный момент скрипт **не делает swap’ы**, но создаёт инфраструктуру:

- в каждой сети есть локальный пул `TestUSDC–TestUSDT`;
- есть унифицированные интерфейсы (ERC20, factory, router);
- адреса всех сущностей лежат в `addresses/*.json` и могут быть автоматически подхвачены фронтендом.

Будущий UI/роутер сможет:

- делать внутрисетевые swap’ы:
  - `USDC (Polygon) → USDT (Polygon)`;
  - `USDC (Arbitrum) → USDT (Arbitrum)`;
- делать кросс‑сетевые варианты через мост:
  - `USDC (Arbitrum) → [swap → мост → swap] → USDT (Polygon)`;
  - `USDT (Polygon) → [swap → мост → swap] → USDC (Arbitrum)`.

Инфраструктура совместима с любыми мостами (LayerZero / Hyperlane / Axelar / кастомный).

---

## 10. Дополнительные скрипты токенов (исторический функционал)

В проекте также остаются исходные токены `USDCp` / `USDTp` и скрипты:

- `scripts/deploy-tokens.ts` — деплой `USDCp`/`USDTp` в выбранную сеть;
- `scripts/mint-token.ts` — CLI для минта этих токенов.

Они не конфликтуют с новой DEX‑инфраструктурой и могут использоваться отдельно для тестов.

---

## 11. Кратко: как запустить всё с нуля

```bash
cd /c/projects/hardhat-mint
npm install

# настроить .env

npx hardhat compile

# Polygon Amoy
npm run setup:polygonAmoy

# Arbitrum Sepolia
npm run setup:arbitrumSepolia
```

После этого у тебя:

- в каждой сети развернуты токены, фабрика, роутер и пул USDC–USDT;
- в `addresses/*.json` лежат все адреса для фронтенда и сервисов;
- деплоер владеет LP‑токенами и большими балансами USDC/USDT для тестирования ликвидности и swap‑логики.
