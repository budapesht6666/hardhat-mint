## hardhat-mint

Проект на Hardhat 3 + TypeScript для деплоя и минта двух тестовых ERC20‑подобных токенов (`USDCp`, `USDTp`) в сетях Polygon Amoy и Arbitrum Sepolia с удобным CLI.

Контракты:

- `contracts/USDCp.sol` — токен c символом `USDCp`, `decimals = 6`.
- `contracts/USDTp.sol` — токен c символом `USDTp`, `decimals = 6`.

Скрипты:

- `scripts/deploy-tokens.ts` — деплой обоих токенов в выбранную сеть Hardhat.
- `scripts/mint-token.ts` — отдельный CLI (без hardhat run) для минта любого из токенов.

---

## 1. Установка зависимостей

```bash
cd /c/projects/hardhat-mint
npm install
```

---

## 2. Настройка переменных окружения

Создай файл `.env` в корне проекта:

```env
# RPC эндпоинты тестовых сетей
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/ТВОЙ_ALCHEMY_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/ТВОЙ_ALCHEMY_KEY

# Один приватный ключ (EOA), из которого деплоим и минтим
WALLET_PRIVATE_KEY=0xТВОЙ_ПРИВАТНЫЙ_КЛЮЧ
```

Где взять значения:

- `*_RPC_URL` — в Alchemy/Infura/QuickNode и т.п.: создаёшь App под сеть Polygon Amoy / Arbitrum Sepolia и копируешь HTTPS URL.
- `WALLET_PRIVATE_KEY` — экспорт приватного ключа из Rabby/MetaMask (строка hex, добавь префикс `0x`).

Убедись, что `.env` добавлен в `.gitignore` и не коммитится.

---

## 3. Компиляция контрактов

```bash
npx hardhat compile
```

Ожидаемый результат: сообщение вида

```text
Compiled 2 Solidity files with solc 0.8.28 (evm target: cancun)
```

---

## 4. Деплой токенов в тестовую сеть

### Arbitrum Sepolia

```bash
npm run deploy:arbitrumSepolia
```

Пример вывода:

```text
Network chainId: 421614
Deployer: 0x66e5...
USDCp deployed to: 0x482a...
USDTp deployed to: 0xf04d...
```

Сохрани адреса контрактов `USDCp` и `USDTp` для дальнейшего минта.

ВАЖНО!!!
“Сохрани адреса токенов и больше не запускай deploy, если не хочешь получить новые экземпляры контрактов.”

### Polygon Amoy

```bash
npm run deploy:polygonAmoy
```

Вывод будет аналогичный, но с `chainId` сети Polygon Amoy и другими адресами контрактов.

---

## 5. Минт токенов через CLI

Для минта используется отдельный скрипт `scripts/mint-token.ts`, запускаемый через npm‑команду `mint` (без hardhat run).

Общий формат:

```bash
npm run mint -- \
	--network <polygonAmoy|arbitrumSepolia> \
	--token <USDCp|USDTp> \
	--to <0xАДРЕС_ПОЛУЧАТЕЛЯ> \
	--amount <RAW_AMOUNT> \
	--token-address <0xАДРЕС_КОНТРАКТА_ТОКЕНА>
```

Где `RAW_AMOUNT` — значение в минимальных единицах:

- при `decimals = 6` 1 токен = `1 * 10^6 = 1000000`.

### Пример: минт 1 USDCp в Arbitrum Sepolia

```bash
npm run mint -- \
	--network arbitrumSepolia \
	--token USDCp \
	--to 0x66e53658f2415ab234c7afbaecacea9f16ee365c \
	--amount 1000000 \
	--token-address 0x482a..
```

Пример вывода:

```text
Network: arbitrumSepolia
RPC URL: https://arb-sepolia.g.alchemy.com/v2/...
Minter: 0x66E5...
Token: USDCp
Token address: 0x482a...
To: 0x66e5...
Amount (raw): 1000000
Mint tx hash: 0x19daf4...7ef80
```

После появления хеша транзакции дождись её включения в блок (можно открыть в Arbiscan для Sepolia) — баланс токена у получателя увеличится.

---

## 6. Как увидеть новые токены в кошельке

### Rabby Wallet

1. Переключись на нужную сеть:
   - Arbitrum Sepolia (chainId `421614`), либо
   - Polygon Amoy (chainId `80002`).
2. Открой список токенов (Assets / Tokens).
3. Нажми `Add Token` / `Add Custom Token`.
4. Вставь адрес контракта токена:
   - для USDCp (пример Arbitrum Sepolia):
     ```text
     0x482a..
     ```
   - для USDTp: адрес из вывода деплой‑скрипта.
5. Если Rabby не подхватил автоматически:
   - Symbol: `USDCp` / `USDTp`
   - Decimals: `6`
6. Сохрани — токен появится в списке, и ты увидишь баланс, заминченный через CLI.

### MetaMask

1. Переключись на сеть `Arbitrum Sepolia` или `Polygon Amoy`.
2. Внизу списка токенов нажми `Import tokens`.
3. В поле `Token contract address` вставь адрес контракта токена.
4. Убедись, что Symbol и Decimals определились правильно (при необходимости укажи вручную: `USDCp`/`USDTp`, `6`).
5. Нажми `Add custom token` → `Import tokens`.

После этого кошелёк начнёт отображать баланс новых токенов для выбранного адреса.
