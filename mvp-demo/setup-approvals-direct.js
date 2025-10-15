#!/usr/bin/env node
/**
 * 直接设置所有授权 - 增加额度
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// 合约地址
const USDFC = '0xb3042734b608a1b16e9e86b374a3f3e389b4cdf0';
const PAYMENTS = '0x6e5c2ddd3e1e0796ddf4ff7c4ba4677393f0c66c';
const WARM_STORAGE = '0x80617b65fd2eea1d7fde2b4f85977670690ed348';

// 增加授权额度
const ADDITIONAL_DEPOSIT = ethers.parseUnits('30', 18); // 再存 30 USDFC
const RATE = ethers.parseUnits('1', 18); // 每 epoch 1 USDFC
const LOCKUP = ethers.parseUnits('50', 18); // 锁定 50 USDFC
const PERIOD = 86400; // 30天

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function main() {
  console.log('\n🔐 增加授权额度\n');
  console.log(`钱包: ${await wallet.getAddress()}\n`);

  // 1. 授权更多 USDFC
  console.log('1️⃣ 授权更多 USDFC...');
  const usdfc = new ethers.Contract(USDFC, ['function approve(address,uint256)'], wallet);
  let tx = await usdfc.approve(PAYMENTS, ethers.parseUnits('50', 18)); // 授权 50 USDFC
  console.log(`   交易: ${tx.hash}`);
  await tx.wait();
  console.log('   ✅ 完成\n');

  // 2. 存入更多
  console.log('2️⃣ 存入更多 USDFC...');
  const payments = new ethers.Contract(PAYMENTS, ['function deposit(address,uint256)', 'function balances(address,address) view returns (uint256)'], wallet);
  tx = await payments['deposit(address,uint256)'](USDFC, ADDITIONAL_DEPOSIT);
  console.log(`   交易: ${tx.hash}`);
  await tx.wait();
  console.log('   ✅ 完成\n');

  // 3. 更新服务授权
  console.log('3️⃣ 更新服务授权（更高额度）...');
  const paymentsWithApprove = new ethers.Contract(
    PAYMENTS,
    ['function approveService(address,address,uint256,uint256,uint256)'],
    wallet
  );
  tx = await paymentsWithApprove.approveService(WARM_STORAGE, USDFC, RATE, LOCKUP, PERIOD);
  console.log(`   交易: ${tx.hash}`);
  await tx.wait();
  console.log('   ✅ 完成\n');

  // 4. 检查余额
  console.log('4️⃣ 检查最终余额...');
  const balance = await payments['balances(address,address)'](await wallet.getAddress(), USDFC);
  console.log(`   Payments 余额: ${ethers.formatUnits(balance, 18)} USDFC\n`);

  console.log('🎉 设置完成！现在重试上传。\n');
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
