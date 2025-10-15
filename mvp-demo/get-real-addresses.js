import { Synapse } from '@filoz/synapse-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const synapse = await Synapse.create({
  privateKey: process.env.PRIVATE_KEY,
  rpcURL: 'https://api.calibration.node.glif.io/rpc/v1',
});

console.log('\n📍 真实合约地址：\n');

// 获取 Payments 地址
try {
  const paymentsAddr = synapse.getPaymentsAddress();
  console.log(`Payments: ${paymentsAddr}`);
} catch (e) {
  console.log(`Payments: 无法获取 - ${e.message}`);
}

// 获取 Warm Storage 地址
try {
  const warmAddr = synapse.getWarmStorageAddress();
  console.log(`Warm Storage: ${warmAddr}`);
} catch (e) {
  console.log(`Warm Storage: 无法获取 - ${e.message}`);
}

// 获取 USDFC 地址
try {
  const usdfcAddr = synapse.getTokenAddress('USDFC');
  console.log(`USDFC: ${usdfcAddr}`);
} catch (e) {
  console.log(`USDFC: 无法获取 - ${e.message}`);
}

console.log();
