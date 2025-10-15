#!/usr/bin/env node

/**
 * Setup Approvals and Test Real Filecoin Upload
 *
 * 使用 ethers.js 直接设置所有授权，然后用 Synapse SDK 上传
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// 配置
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ 未找到 PRIVATE_KEY 环境变量！');
  process.exit(1);
}
const RPC_URL = 'https://api.calibration.node.glif.io/rpc/v1';

// 合约地址 (Calibration 测试网) - 小写地址避免校验和问题
const USDFC_ADDRESS = '0xb3042734b608a1b16e9e86b374a3f3e389b4cdf0';
const WARM_STORAGE_ADDRESS = '0x80617b65fd2eea1d7fde2b4f85977670690ed348';

// 授权参数
const DEPOSIT_AMOUNT = ethers.parseUnits('10', 18); // 存入 10 USDFC
const RATE_ALLOWANCE = ethers.parseUnits('0.1', 18); // 每 epoch 0.1 USDFC
const LOCKUP_ALLOWANCE = ethers.parseUnits('10', 18); // 锁定额度 10 USDFC
const MAX_LOCKUP_PERIOD = 30 * 2880; // 30天 (epochs)

// ABI
const USDFC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

const WARM_STORAGE_ABI = [
  'function paymentsService() view returns (address)'
];

const PAYMENTS_ABI = [
  'function deposit(address token, uint256 amount) returns (bool)',
  'function balances(address account, address token) view returns (uint256)',
  'function serviceApprovals(address account, address service, address token) view returns (uint256 rateAllowance, uint256 lockupAllowance, uint256 maxLockupPeriod)',
  'function approveService(address service, address token, uint256 rateAllowance, uint256 lockupAllowance, uint256 maxLockupPeriod) returns (bool)',
  'event ServiceApproved(address indexed account, address indexed service, address indexed token, uint256 rateAllowance, uint256 lockupAllowance, uint256 maxLockupPeriod)'
];

function fmt(amount) {
  return `${ethers.formatUnits(amount, 18)}`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔐 设置授权并测试 Filecoin 真实上传');
  console.log('='.repeat(80));
  console.log();

  // 创建 provider 和 signer
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    polling: 4000,
    batchMaxCount: 1
  });
  provider._getConnection().timeout = 120000;

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log(`📍 钱包地址: ${address}\n`);

  // 步骤 1: 检查 USDFC 余额
  console.log('💰 步骤 1: 检查 USDFC 余额');
  const usdfcContract = new ethers.Contract(USDFC_ADDRESS, USDFC_ABI, wallet);
  const usdfcBalance = await usdfcContract.balanceOf(address);
  console.log(`   USDFC 余额: ${fmt(usdfcBalance)} USDFC`);

  if (usdfcBalance < DEPOSIT_AMOUNT) {
    console.log(`   ❌ USDFC 不足！需要至少 ${fmt(DEPOSIT_AMOUNT)} USDFC`);
    process.exit(1);
  }
  console.log();

  // 步骤 2: 获取 Payments 合约地址
  console.log('📍 步骤 2: 获取 Payments 合约地址');
  const warmStorage = new ethers.Contract(WARM_STORAGE_ADDRESS, WARM_STORAGE_ABI, provider);
  const paymentsAddress = await warmStorage.paymentsService();
  console.log(`   Warm Storage: ${WARM_STORAGE_ADDRESS}`);
  console.log(`   Payments: ${paymentsAddress}`);
  console.log();

  // 步骤 3: 授权 USDFC 给 Payments 合约
  console.log('🔓 步骤 3: 授权 USDFC 给 Payments 合约');
  const currentAllowance = await usdfcContract.allowance(address, paymentsAddress);
  console.log(`   当前授权额度: ${fmt(currentAllowance)} USDFC`);

  if (currentAllowance < DEPOSIT_AMOUNT) {
    console.log(`   📝 授权 ${fmt(DEPOSIT_AMOUNT)} USDFC...`);
    const approveTx = await usdfcContract.approve(paymentsAddress, DEPOSIT_AMOUNT);
    console.log(`   交易哈希: ${approveTx.hash}`);
    console.log(`   等待确认...`);

    const receipt = await approveTx.wait();
    if (receipt.status === 1) {
      console.log('   ✅ USDFC 授权成功！');
    } else {
      throw new Error('授权交易失败');
    }
  } else {
    console.log('   ✅ 已有足够授权额度');
  }
  console.log();

  // 步骤 4: 存入 USDFC 到 Payments 合约
  console.log('💳 步骤 4: 存入 USDFC 到 Payments 合约');
  const paymentsContract = new ethers.Contract(paymentsAddress, PAYMENTS_ABI, wallet);
  const currentBalance = await paymentsContract.balances(address, USDFC_ADDRESS);
  console.log(`   当前存款余额: ${fmt(currentBalance)} USDFC`);

  if (currentBalance < DEPOSIT_AMOUNT) {
    console.log(`   📤 存入 ${fmt(DEPOSIT_AMOUNT)} USDFC...`);
    const depositTx = await paymentsContract.deposit(USDFC_ADDRESS, DEPOSIT_AMOUNT);
    console.log(`   交易哈希: ${depositTx.hash}`);
    console.log(`   等待确认...`);

    const receipt = await depositTx.wait();
    if (receipt.status === 1) {
      console.log('   ✅ 存款成功！');
      const newBalance = await paymentsContract.balances(address, USDFC_ADDRESS);
      console.log(`   新余额: ${fmt(newBalance)} USDFC`);
    } else {
      throw new Error('存款交易失败');
    }
  } else {
    console.log('   ✅ 已有足够存款');
  }
  console.log();

  // 步骤 5: 授权 Warm Storage 作为服务提供商
  console.log('✅ 步骤 5: 授权 Warm Storage 服务');
  const approval = await paymentsContract.serviceApprovals(address, WARM_STORAGE_ADDRESS, USDFC_ADDRESS);
  console.log(`   当前服务授权:`);
  console.log(`     Rate Allowance: ${fmt(approval.rateAllowance)} USDFC/epoch`);
  console.log(`     Lockup Allowance: ${fmt(approval.lockupAllowance)} USDFC`);
  console.log(`     Max Lockup Period: ${approval.maxLockupPeriod} epochs`);

  if (approval.rateAllowance < RATE_ALLOWANCE || approval.lockupAllowance < LOCKUP_ALLOWANCE) {
    console.log();
    console.log('   📝 设置服务授权...');
    console.log(`     Rate Allowance: ${fmt(RATE_ALLOWANCE)} USDFC/epoch`);
    console.log(`     Lockup Allowance: ${fmt(LOCKUP_ALLOWANCE)} USDFC`);
    console.log(`     Max Lockup Period: ${MAX_LOCKUP_PERIOD} epochs`);

    const approveServiceTx = await paymentsContract.approveService(
      WARM_STORAGE_ADDRESS,
      USDFC_ADDRESS,
      RATE_ALLOWANCE,
      LOCKUP_ALLOWANCE,
      MAX_LOCKUP_PERIOD
    );
    console.log(`   交易哈希: ${approveServiceTx.hash}`);
    console.log(`   等待确认...`);

    const receipt = await approveServiceTx.wait();
    if (receipt.status === 1) {
      console.log('   ✅ 服务授权成功！');
    } else {
      throw new Error('服务授权失败');
    }
  } else {
    console.log('   ✅ 服务授权已配置');
  }
  console.log();

  // 完成
  console.log('='.repeat(80));
  console.log('🎉 所有授权设置完成！');
  console.log('='.repeat(80));
  console.log();
  console.log('✅ 已完成:');
  console.log(`   - USDFC 授权给 Payments 合约`);
  console.log(`   - 存入 ${fmt(DEPOSIT_AMOUNT)} USDFC`);
  console.log(`   - Warm Storage 服务已授权`);
  console.log();
  console.log('🚀 现在可以运行真实上传测试:');
  console.log('   node test-real-upload-small.js');
  console.log();

}

main().catch((error) => {
  console.error('\n❌ 错误:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
