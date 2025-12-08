import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { Address } from 'viem';

export type NetworkName = 'polygonAmoy' | 'arbitrumSepolia';

export interface AddressBook {
  USDCp?: Address;
  USDTp?: Address;
  WETH9?: Address;
  UniswapV2Factory?: Address;
  UniswapV2Router02?: Address;
  USDC_USDT_Pair?: Address;
}

const ADDRESSES_DIR = path.join(process.cwd(), 'addresses');

export function assertNetworkName(name: string | undefined): NetworkName {
  if (name === 'polygonAmoy' || name === 'arbitrumSepolia') {
    return name;
  }
  throw new Error(
    `Unsupported network "${name ?? 'unknown'}". Use polygonAmoy or arbitrumSepolia.`,
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadAddressBook(networkName: NetworkName): Promise<AddressBook> {
  const file = path.join(ADDRESSES_DIR, `${networkName}.json`);
  if (!(await fileExists(file))) {
    return {};
  }
  const raw = await readFile(file, 'utf-8');
  return JSON.parse(raw) as AddressBook;
}

async function ensureDir(): Promise<void> {
  if (!(await fileExists(ADDRESSES_DIR))) {
    await mkdir(ADDRESSES_DIR, { recursive: true });
  }
}

export async function saveAddressBook(networkName: NetworkName, data: AddressBook): Promise<void> {
  await ensureDir();
  const file = path.join(ADDRESSES_DIR, `${networkName}.json`);
  await writeFile(file, JSON.stringify(data, null, 2));
}

export function mergeAddressBook(current: AddressBook, updates: Partial<AddressBook>): AddressBook {
  return { ...current, ...updates };
}
