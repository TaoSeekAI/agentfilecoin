#!/usr/bin/env node
/**
 * 验证授权状态脚本
 */

import { ethers } from 'ethers';
import { Synapse } from '@filoz/synapse-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

async function main() {
  console.log('\n🔐 验证授权状态\n');
  
  const synapse = await Synapse.create({
    privateKey: process.env.PRIVATE_KEY,
    rpcURL: process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
  });
  
  const signer = synapse.getSigner();
  const address = await signer.getAddress();
  
  console.log(`钱包: ${address}\n`);
  
  // 1. 检查 USDFC 余额
  console.log('1️⃣  USDFC 余额:');
  const usdfcBalance = await synapse.payments.walletBalance('USDFC');
  console.log(`   钱包: ${ethers.formatUnits(usdfcBalance, 18)} USDFC`);
  
  const paymentsBalance = await synapse.payments.balance('USDFC');
  console.log(`   Payments: ${ethers.formatUnits(paymentsBalance, 18)} USDFC`);
  
  if (paymentsBalance === 0n) {
    console.log('   ❌ Payments 合约余额为 0！');
    console.log('   需要运行: node setup-via-sdk.js\n');
    process.exit(1);
  } else {
    console.log('   ✅ Payments 合约有余额\n');
  }
  
  // 2. 检查服务授权
  console.log('2️⃣  服务授权:');
  const warmAddr = synapse.getWarmStorageAddress();
  console.log(`   Warm Storage: ${warmAddr}`);
  
  const approval = await synapse.payments.serviceApproval(warmAddr, 'USDFC');
  console.log(`   Rate Allowance: ${ethers.formatUnits(approval.rateAllowance, 18)} USDFC/epoch`);
  console.log(`   Lockup Allowance: ${ethers.formatUnits(approval.lockupAllowance, 18)} USDFC`);
  console.log(`   Max Lockup Period: ${approval.maxLockupPeriod} epochs`);
  
  if (approval.rateAllowance === 0n || approval.lockupAllowance === 0n) {
    console.log('   ❌ 服务授权未设置！');
    console.log('   需要运行: node setup-via-sdk.js\n');
    process.exit(1);
  } else {
    console.log('   ✅ 服务授权已设置\n');
  }
  
  // 3. 获取合约地址
  console.log('3️⃣  合约地址:');
  const paymentsAddr = synapse.getPaymentsAddress();
  console.log(`   Payments: ${paymentsAddr}`);
  console.log(`   Warm Storage: ${warmAddr}`);
  console.log('   ✅ 地址已获取\n');
  
  console.log('='.repeat(60));
  console.log('✅ 所有授权验证通过！');
  console.log('='.repeat(60));
  console.log('\n可以开始上传测试: node test-real-upload-small.js\n');
}

main().catch(error => {
  console.error('\n❌ 验证失败:', error.message);
  process.exit(1);
});
