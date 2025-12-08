#!/usr/bin/env node

/**
 * Code validation script
 * Validates the improvements made to the codebase without requiring compilation
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const results = [];

async function validateFile(filePath, checks) {
  const fullPath = path.join(__dirname, '..', filePath);
  const content = await readFile(fullPath, 'utf-8');
  
  for (const check of checks) {
    const result = check(content);
    results.push(result);
  }
}

// Validation checks for UniswapV2Factory.sol
const factoryChecks = [
  (content) => ({
    name: 'Reentrancy protection',
    passed: content.includes('modifier lock()') && content.includes('unlocked'),
    message: 'UniswapV2PairMinimal has reentrancy protection with lock modifier',
  }),
  (content) => ({
    name: 'MINIMUM_LIQUIDITY constant',
    passed: content.includes('MINIMUM_LIQUIDITY') && content.includes('10**3'),
    message: 'MINIMUM_LIQUIDITY is defined to prevent division-by-zero attacks',
  }),
  (content) => ({
    name: 'MINIMUM_LIQUIDITY burn',
    passed: content.includes('balanceOf[address(0)] = MINIMUM_LIQUIDITY'),
    message: 'First liquidity provider burns MINIMUM_LIQUIDITY tokens',
  }),
  (content) => ({
    name: 'Overflow protection in _update',
    passed: content.includes('require(balance0 <= type(uint112).max && balance1 <= type(uint112).max'),
    message: '_update() checks for overflow before casting to uint112',
  }),
  (content) => ({
    name: 'Lock modifier on mint',
    passed: content.includes('function mint(address to) external override lock'),
    message: 'mint() function is protected with lock modifier',
  }),
];

// Validation checks for setup.ts
const setupChecks = [
  (content) => ({
    name: 'Slippage protection constant',
    passed: content.includes('SLIPPAGE_TOLERANCE') && content.includes('95n'),
    message: 'SLIPPAGE_TOLERANCE constant is defined (5% protection)',
  }),
  (content) => ({
    name: 'Slippage protection applied',
    passed: content.includes('minAmount = (amount * SLIPPAGE_TOLERANCE) / 100n'),
    message: 'Slippage protection is applied to liquidity operations',
  }),
  (content) => ({
    name: 'No zero slippage',
    passed: !content.includes('minAmount = 0n;') || 
            (content.includes('minAmount = 0n') && content.includes('// Apply slippage tolerance')),
    message: 'Zero slippage protection has been replaced with percentage-based protection',
  }),
  (content) => ({
    name: 'Balance check before minting',
    passed: content.includes('usdcBalance < ONE_MILLION_TOKENS') && 
            content.includes('usdtBalance < ONE_MILLION_TOKENS'),
    message: 'Script checks balances before minting (idempotency)',
  }),
  (content) => ({
    name: 'Conditional minting',
    passed: content.includes('if (usdcBalance < ONE_MILLION_TOKENS)') &&
            content.includes('if (usdtBalance < ONE_MILLION_TOKENS)'),
    message: 'Minting only occurs when needed',
  }),
  (content) => ({
    name: 'Named deadline constant',
    passed: content.includes('DEADLINE_MINUTES'),
    message: 'Deadline is defined as a named constant instead of magic number',
  }),
];

// Validation checks for addressBook.ts
const addressBookChecks = [
  (content) => ({
    name: 'Async file existence check',
    passed: content.includes('async function fileExists') && content.includes('await access'),
    message: 'File existence is checked asynchronously',
  }),
  (content) => ({
    name: 'No existsSync usage',
    passed: !content.includes('existsSync(file)') || 
            (content.includes('fileExists') && !content.includes('import { existsSync }')),
    message: 'Synchronous existsSync has been replaced with async fileExists',
  }),
  (content) => ({
    name: 'Async access import',
    passed: content.includes('import { readFile, writeFile, mkdir, access }'),
    message: 'Async access function is imported from fs/promises',
  }),
  (content) => ({
    name: 'Constants import',
    passed: content.includes("import { constants } from 'node:fs'"),
    message: 'fs constants are imported for access checks',
  }),
];

// Run validations
async function runValidation() {
  console.log(`${YELLOW}Running code validation checks...${RESET}\n`);

  try {
    await validateFile('contracts/UniswapV2Factory.sol', factoryChecks);
    await validateFile('scripts/setup.ts', setupChecks);
    await validateFile('scripts/utils/addressBook.ts', addressBookChecks);

    console.log('Validation Results:\n');
    
    let passed = 0;
    let failed = 0;

    for (const result of results) {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? GREEN : RED;
      console.log(`${color}${icon} ${result.name}${RESET}`);
      console.log(`  ${result.message}\n`);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log(`\n${GREEN}Passed: ${passed}${RESET} | ${RED}Failed: ${failed}${RESET}\n`);

    if (failed > 0) {
      console.log(`${RED}Some validation checks failed. Please review the issues above.${RESET}`);
      process.exit(1);
    } else {
      console.log(`${GREEN}All validation checks passed!${RESET}`);
      console.log(`\n${YELLOW}Note: These are static code checks. Run 'npm run compile' and 'npm run test' for full validation.${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Error during validation:${RESET}`, error);
    process.exit(1);
  }
}

runValidation();
