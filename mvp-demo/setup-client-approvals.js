#!/usr/bin/env node

/**
 * Setup Client Approvals for Filecoin Storage
 *
 * This script sets up all necessary approvals for a client to use Filecoin storage via Synapse SDK.
 * Based on the official post-deploy-setup.js from Synapse SDK.
 *
 * What it does:
 * 1. Approve USDFC token spending for Payments contract
 * 2. Deposit USDFC to Payments contract
 * 3. Approve Warm Storage service as operator (with rate and lockup allowances)
 *
 * Required environment variables:
 * - PRIVATE_KEY: Client wallet private key
 * - FILECOIN_NETWORK_RPC_URL: Filecoin RPC endpoint
 */

import { ethers } from 'ethers';
import { Synapse } from '@filoz/synapse-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'; // Calibration USDFC

// Approval constants (from post-deploy-setup.js)
const RATE_ALLOWANCE_PER_EPOCH = ethers.parseUnits('0.1', 18); // 0.1 USDFC per epoch
const LOCKUP_ALLOWANCE = ethers.parseUnits('10', 18); // 10 USDFC lockup allowance
const MAX_LOCKUP_PERIOD = 30 * 2880; // 30 days in epochs (30 * 2880 epochs/day)
const DEPOSIT_AMOUNT = ethers.parseUnits('5', 18); // 5 USDFC deposit

function formatUSDFC(amount) {
  return `${(Number(amount) / 1e18).toFixed(6)} USDFC`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔐 Setup Client Approvals for Filecoin Storage');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Initialize Synapse SDK
    console.log('📦 Step 1: Initialize Synapse SDK');
    console.log(`   RPC URL: ${RPC_URL}`);

    const synapse = await Synapse.create({
      privateKey: PRIVATE_KEY,
      rpcURL: RPC_URL,
    });

    const signer = synapse.getSigner();
    const address = await signer.getAddress();
    console.log(`   Client Wallet: ${address}`);
    console.log('   ✅ Synapse instance created\n');

    // Step 2: Check balances
    console.log('💰 Step 2: Check Balances');

    const filBalance = await synapse.payments.walletBalance();
    console.log(`   FIL Balance (Wallet): ${formatUSDFC(filBalance).replace('USDFC', 'FIL')}`);

    const usdfcBalance = await synapse.payments.walletBalance('USDFC');
    console.log(`   USDFC Balance (Wallet): ${formatUSDFC(usdfcBalance)}`);

    if (usdfcBalance === 0n) {
      console.log('   ❌ No USDFC tokens! Please acquire USDFC before proceeding.');
      process.exit(1);
    }

    const paymentsBalance = await synapse.payments.balance('USDFC');
    console.log(`   USDFC Balance (Payments): ${formatUSDFC(paymentsBalance)}`);
    console.log();

    // Step 3: Get Payments and Warm Storage addresses
    console.log('📍 Step 3: Get Contract Addresses');

    // Create a minimal provider to get contract addresses
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Warm Storage address for Calibration (from SDK constants)
    const warmStorageAddress = '0x80617B65FD2EEA1d7fDE2B4F85977670690eD348';
    console.log(`   Warm Storage: ${warmStorageAddress}`);

    // Get Payments address from Warm Storage contract
    const warmStorageAbi = [
      'function paymentsService() view returns (address)'
    ];
    const warmStorageContract = new ethers.Contract(warmStorageAddress, warmStorageAbi, provider);
    const paymentsAddress = await warmStorageContract.paymentsService();
    console.log(`   Payments Service: ${paymentsAddress}`);
    console.log();

    // Step 4: Approve USDFC spending for Payments contract
    console.log('🔓 Step 4: Approve USDFC Token Spending');

    const usdfcAbi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ];
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, usdfcAbi, signer);

    const currentAllowance = await usdfcContract.allowance(address, paymentsAddress);
    console.log(`   Current Allowance: ${formatUSDFC(currentAllowance)}`);

    if (currentAllowance < DEPOSIT_AMOUNT) {
      console.log(`   📝 Approving ${formatUSDFC(DEPOSIT_AMOUNT)} for Payments contract...`);

      const approveTx = await usdfcContract.approve(paymentsAddress, DEPOSIT_AMOUNT);
      console.log(`   Transaction hash: ${approveTx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const approveReceipt = await approveTx.wait();
      if (approveReceipt.status === 1) {
        console.log('   ✅ USDFC spending approved!');
      } else {
        throw new Error('Approval transaction failed');
      }
    } else {
      console.log('   ✅ Sufficient allowance already set');
    }
    console.log();

    // Step 5: Deposit USDFC to Payments contract
    console.log('💳 Step 5: Deposit USDFC to Payments Contract');

    if (paymentsBalance < DEPOSIT_AMOUNT) {
      console.log(`   📤 Depositing ${formatUSDFC(DEPOSIT_AMOUNT)}...`);

      const depositTx = await synapse.payments.deposit(DEPOSIT_AMOUNT, 'USDFC');
      console.log(`   Transaction hash: ${depositTx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const depositReceipt = await depositTx.wait();
      if (depositReceipt.status === 1) {
        console.log('   ✅ Deposit successful!');

        const newPaymentsBalance = await synapse.payments.balance('USDFC');
        console.log(`   New Payments Balance: ${formatUSDFC(newPaymentsBalance)}`);
      } else {
        throw new Error('Deposit transaction failed');
      }
    } else {
      console.log(`   ✅ Sufficient balance already deposited (${formatUSDFC(paymentsBalance)})`);
    }
    console.log();

    // Step 6: Approve Warm Storage service as operator
    console.log('✅ Step 6: Approve Warm Storage Service as Operator');
    console.log('   This allows Warm Storage to charge for storage automatically.');
    console.log();

    // Check current service approval
    const currentApproval = await synapse.payments.serviceApproval(warmStorageAddress, 'USDFC');
    console.log(`   Current Approvals:`);
    console.log(`     Rate Allowance: ${formatUSDFC(currentApproval.rateAllowance)} per epoch`);
    console.log(`     Lockup Allowance: ${formatUSDFC(currentApproval.lockupAllowance)}`);
    console.log(`     Max Lockup Period: ${currentApproval.maxLockupPeriod} epochs`);

    if (
      currentApproval.rateAllowance < RATE_ALLOWANCE_PER_EPOCH ||
      currentApproval.lockupAllowance < LOCKUP_ALLOWANCE
    ) {
      console.log();
      console.log('   📝 Setting service approvals...');
      console.log(`     Rate Allowance: ${formatUSDFC(RATE_ALLOWANCE_PER_EPOCH)} per epoch`);
      console.log(`     Lockup Allowance: ${formatUSDFC(LOCKUP_ALLOWANCE)}`);
      console.log(`     Max Lockup Period: ${MAX_LOCKUP_PERIOD} epochs (~30 days)`);

      const approvalTx = await synapse.payments.approveService(
        warmStorageAddress,
        RATE_ALLOWANCE_PER_EPOCH,
        LOCKUP_ALLOWANCE,
        MAX_LOCKUP_PERIOD,
        'USDFC'
      );
      console.log(`   Transaction hash: ${approvalTx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const approvalReceipt = await approvalTx.wait();
      if (approvalReceipt.status === 1) {
        console.log('   ✅ Service approval set!');
      } else {
        throw new Error('Service approval failed');
      }
    } else {
      console.log('   ✅ Service approvals already configured');
    }
    console.log();

    // Step 7: Summary
    console.log('='.repeat(80));
    console.log('🎉 CLIENT SETUP COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('✅ All approvals set:');
    console.log(`   - USDFC token approved for Payments contract`);
    console.log(`   - ${formatUSDFC(DEPOSIT_AMOUNT)} deposited to Payments`);
    console.log(`   - Warm Storage approved as operator`);
    console.log();
    console.log('🚀 Next Steps:');
    console.log('   1. Run: node test-real-upload-small.js');
    console.log('   2. Verify upload at: https://pdp.vxb.ai/calibration');
    console.log('   3. Run full demo: node demo.js');
    console.log();

  } catch (error) {
    console.error('\n❌ Setup Failed!');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}`);

    if (error.code) {
      console.error(`Code: ${error.code}`);
    }

    if (error.cause) {
      console.error(`Cause: ${error.cause.message}`);
    }

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the setup
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
