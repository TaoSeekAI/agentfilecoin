#!/usr/bin/env node
/**
 * 快速设置 USDFC 授权
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// 合约地址（全小写避免校验和问题）
const USDFC = '0xb3042734b608a1b16e9e86b374a3f3e389b4cdf0';
const PAYMENTS = '0x6e5c2ddd3e1e0796ddf4ff7c4ba4677393f0c66c';
const WARM_STORAGE = '0x80617b65fd2eea1d7fde2b4f85977670690ed348';

// 授权金额
const DEPOSIT = ethers.parseUnits('10', 18);
const RATE = ethers.parseUnits('0.5', 18); // 增加到每 epoch 0.5 USDFC
const LOCKUP = ethers.parseUnits('20', 18); // 增加到 20 USDFC
const PERIOD = 86400; // 30天 epochs

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log('\n🔐 快速设置授权\n');
console.log(`钱包: ${await wallet.getAddress()}\n`);

// 1. 授权 USDFC
console.log('1️⃣ 授权 USDFC...');
const usdfc = new ethers.Contract(USDFC, ['function approve(address,uint256)'], wallet);
let tx = await usdfc.approve(PAYMENTS, DEPOSIT);
console.log(`   等待: ${tx.hash}`);
await tx.wait();
console.log('   ✅ 完成\n');

// 2. 存入
console.log('2️⃣ 存入 USDFC...');
const payments = new ethers.Contract(PAYMENTS, ['function deposit(address,uint256)'], wallet);
tx = await payments.deposit(USDFC, DEPOSIT);
console.log(`   等待: ${tx.hash}`);
await tx.wait();
console.log('   ✅ 完成\n');

// 3. 服务授权
console.log('3️⃣ 服务授权...');
const paymentsWithApprove = new ethers.Contract(
  PAYMENTS,
  ['function approveService(address,address,uint256,uint256,uint256)'],
  wallet
);
tx = await paymentsWithApprove.approveService(WARM_STORAGE, USDFC, RATE, LOCKUP, PERIOD);
console.log(`   等待: ${tx.hash}`);
await tx.wait();
console.log('   ✅ 完成\n');

console.log('🎉 设置完成！可以运行: node test-real-upload-small.js\n');
