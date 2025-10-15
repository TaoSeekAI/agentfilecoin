/**
 * Transfer ETH to New Wallet
 * 从旧钱包转账 ETH 到新钱包
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

async function transferETH() {
  console.log('💸 Transfer ETH to New Wallet\n');
  console.log('='.repeat(80));

  try {
    // 创建 Sepolia 提供者
    const sepoliaProvider = new ethers.JsonRpcProvider('https://eth-sepolia.public.blastapi.io');
    const oldWallet = new ethers.Wallet(OLD_WALLET_PRIVATE_KEY, sepoliaProvider);

    console.log('\n📋 Transfer Details:');
    console.log(`   From: ${oldWallet.address}`);
    console.log(`   To: ${NEW_WALLET_ADDRESS}`);

    // 检查旧钱包余额
    const oldBalance = await sepoliaProvider.getBalance(oldWallet.address);
    console.log(`\n💰 Old Wallet Balance: ${ethers.formatEther(oldBalance)} ETH`);

    if (oldBalance === 0n) {
      console.log('❌ Old wallet has no balance!');
      process.exit(1);
    }

    // 检查新钱包余额
    const newBalance = await sepoliaProvider.getBalance(NEW_WALLET_ADDRESS);
    console.log(`💰 New Wallet Balance: ${ethers.formatEther(newBalance)} ETH`);

    // 估算 gas
    const feeData = await sepoliaProvider.getFeeData();
    const gasLimit = 21000n;
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('20', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    console.log(`\n⛽ Estimated Gas Cost: ${ethers.formatEther(estimatedGasCost)} ETH`);

    // 计算可转账金额（留一些作为 gas）
    const transferAmount = oldBalance - estimatedGasCost - ethers.parseEther('0.001'); // 额外留 0.001 ETH

    if (transferAmount <= 0n) {
      console.log('❌ Insufficient balance to cover gas costs!');
      process.exit(1);
    }

    console.log(`\n📤 Amount to Transfer: ${ethers.formatEther(transferAmount)} ETH`);
    console.log(`   (留下 ~${ethers.formatEther(estimatedGasCost + ethers.parseEther('0.001'))} ETH 用于 gas)`);

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
      maxFeePerGas,
      maxPriorityFeePerGas,
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
    console.log(`   Actual Cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);

    // 检查新余额
    const finalBalance = await sepoliaProvider.getBalance(NEW_WALLET_ADDRESS);
    console.log(`\n💰 New Wallet Final Balance: ${ethers.formatEther(finalBalance)} ETH`);

    console.log('\n🎉 Transfer complete! You can now use the new wallet for testing.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    rl.close();
  }
}

// Sepolia 转账
console.log('🔷 Transferring Sepolia ETH\n');
transferETH()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
