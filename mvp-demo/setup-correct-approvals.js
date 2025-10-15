#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// 正确的合约地址！
const USDFC = '0xb3042734b608a1b16e9e86b374a3f3e389b4cdf0';
const PAYMENTS = '0x1096025c9d6b29e12e2f04965f6e64d564ce0750'; // 真实地址！
const WARM_STORAGE = '0x80617b65fd2eea1d7fde2b4f85977670690ed348';

// 授权金额
const DEPOSIT = ethers.parseUnits('35', 18); // 35 USDFC
const RATE = ethers.parseUnits('1', 18);
const LOCKUP = ethers.parseUnits('50', 18);
const PERIOD = 86400;

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function main() {
  console.log('\n🔐 使用正确的 Payments 地址重新设置授权\n');
  console.log(`钱包: ${await wallet.getAddress()}\n`);
  console.log(`✅ 正确的 Payments 地址: ${PAYMENTS}\n`);

  // 1. 授权 USDFC
  console.log('1️⃣ 授权 USDFC...');
  const usdfc = new ethers.Contract(USDFC, ['function approve(address,uint256)'], wallet);
  let tx = await usdfc.approve(PAYMENTS, DEPOSIT);
  console.log(`   交易: ${tx.hash}`);
  await tx.wait();
  console.log('   ✅ 完成\n');

  // 2. 存入
  console.log('2️⃣ 存入 USDFC...');
  const payments = new ethers.Contract(PAYMENTS, ['function deposit(address,uint256)'], wallet);
  tx = await payments.deposit(USDFC, DEPOSIT);
  console.log(`   交易: ${tx.hash}`);
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
  console.log(`   交易: ${tx.hash}`);
  await tx.wait();
  console.log('   ✅ 完成\n');

  console.log('🎉 设置完成！\n');
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
