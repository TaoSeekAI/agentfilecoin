/**
 * Transfer FIL to New Wallet
 * 从旧钱包转账 FIL 到新钱包
 */

import { ethers } from 'ethers';
import readline from 'readline';

// 新钱包地址
const NEW_WALLET_ADDRESS = '0xB34d4c8E3AcCB5FA62455228281649Be525D4e59';

// 旧钱包私钥（有余额的钱包）
const OLD_WALLET_PRIVATE_KEY = '0x2ef99a70ceaef2a6a24899b503f95a3e3d2e3887d278643d78a443836cc1fde9';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function transferFIL() {
  console.log('💸 Transfer FIL to New Wallet\n');
  console.log('='.repeat(80));

  try {
    // 创建 Filecoin Calibration 提供者
    const filecoinProvider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/rpc/v1');
    const oldWallet = new ethers.Wallet(OLD_WALLET_PRIVATE_KEY, filecoinProvider);

    console.log('\n📋 Transfer Details:');
    console.log(`   From: ${oldWallet.address}`);
    console.log(`   To: ${NEW_WALLET_ADDRESS}`);

    // 检查旧钱包余额
    const oldBalance = await filecoinProvider.getBalance(oldWallet.address);
    console.log(`\n💰 Old Wallet Balance: ${ethers.formatEther(oldBalance)} FIL`);

    if (oldBalance === 0n) {
      console.log('❌ Old wallet has no FIL balance!');
      process.exit(1);
    }

    // 检查新钱包余额
    const newBalance = await filecoinProvider.getBalance(NEW_WALLET_ADDRESS);
    console.log(`💰 New Wallet Balance: ${ethers.formatEther(newBalance)} FIL`);

    // 估算 gas
    const feeData = await filecoinProvider.getFeeData();
    const gasLimit = 21000n;
    const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    const estimatedGasCost = gasLimit * gasPrice;

    console.log(`\n⛽ Estimated Gas Cost: ${ethers.formatEther(estimatedGasCost)} FIL`);

    // 计算可转账金额（留一些作为 gas）
    const transferAmount = oldBalance - estimatedGasCost - ethers.parseEther('0.1'); // 额外留 0.1 FIL

    if (transferAmount <= 0n) {
      console.log('❌ Insufficient balance to cover gas costs!');
      process.exit(1);
    }

    console.log(`\n📤 Amount to Transfer: ${ethers.formatEther(transferAmount)} FIL`);
    console.log(`   (留下 ~${ethers.formatEther(estimatedGasCost + ethers.parseEther('0.1'))} FIL 用于 gas)`);

    // 确认转账
    const confirm = await question('\n⚠️  Proceed with transfer? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Transfer cancelled.');
      process.exit(0);
    }

    console.log('\n📡 Sending transaction...');

    // 发送转账
    const tx = await oldWallet.sendTransaction({
      to: NEW_WALLET_ADDRESS,
      value: transferAmount,
      gasPrice,
      gasLimit
    });

    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    // 等待确认
    const receipt = await tx.wait();

    console.log('\n✅ Transfer Successful!');
    console.log('='.repeat(80));
    console.log(`   Transaction: ${receipt.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Actual Cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} FIL`);

    // 检查新余额
    const finalBalance = await filecoinProvider.getBalance(NEW_WALLET_ADDRESS);
    console.log(`\n💰 New Wallet Final Balance: ${ethers.formatEther(finalBalance)} FIL`);

    console.log('\n🎉 Transfer complete! You can now use the new wallet for Filecoin testing.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    rl.close();
  }
}

// Filecoin 转账
console.log('🔶 Transferring Filecoin Calibration FIL\n');
transferFIL()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
