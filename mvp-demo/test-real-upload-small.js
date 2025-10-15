#!/usr/bin/env node

/**
 * Test Real Filecoin Upload - Small Scale (5 USDFC)
 *
 * This script tests real Filecoin upload with limited USDFC balance.
 * Uses small metadata files to stay within 5 USDFC budget.
 *
 * What it does:
 * 1. Initialize Synapse SDK v0.33.0
 * 2. Check balances (FIL, USDFC, Payments)
 * 3. Deposit 5 USDFC to Payments contract
 * 4. Approve Warm Storage service
 * 5. Create storage context (selects real Storage Provider)
 * 6. Upload small test metadata (< 1KB)
 * 7. Verify on pdp.vxb.ai/calibration
 * 8. Download back to verify integrity
 */

import { ethers } from 'ethers';
import { Synapse } from '@filoz/synapse-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
const WALLET_ADDRESS = '0xB34d4c8E3AcCB5FA62455228281649Be525D4e59';

// Test metadata (small size to conserve USDFC)
const TEST_METADATA = {
  name: 'Test NFT Metadata',
  description: 'Small test upload to verify Filecoin integration',
  tokenId: 0,
  timestamp: new Date().toISOString(),
  network: 'Filecoin Calibration Testnet',
  wallet: WALLET_ADDRESS
};

function formatUSDFC(amount) {
  return `${(Number(amount) / 1e18).toFixed(6)} USDFC`;
}

function formatFIL(amount) {
  return `${(Number(amount) / 1e18).toFixed(6)} FIL`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 Test Real Filecoin Upload (Small Scale - 5 USDFC)');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Initialize Synapse SDK
    console.log('📦 Step 1: Initialize Synapse SDK v0.33.0');
    console.log(`   RPC URL: ${RPC_URL}`);
    console.log(`   Wallet: ${WALLET_ADDRESS}`);

    const synapse = await Synapse.create({
      privateKey: PRIVATE_KEY,
      rpcURL: RPC_URL,
    });

    console.log('   ✅ Synapse instance created\n');

    // Step 2: Check balances
    console.log('💰 Step 2: Check Balances');

    const filBalance = await synapse.payments.walletBalance();
    console.log(`   FIL Balance: ${formatFIL(filBalance)}`);

    const usdfcBalance = await synapse.payments.walletBalance('USDFC');
    console.log(`   USDFC Balance (Wallet): ${formatUSDFC(usdfcBalance)}`);

    const paymentsBalance = await synapse.payments.balance('USDFC');
    console.log(`   USDFC Balance (Payments): ${formatUSDFC(paymentsBalance)}`);
    console.log();

    // Step 3: Deposit USDFC to Payments contract if needed
    console.log('💳 Step 3: Deposit USDFC to Payments Contract');

    const depositAmount = 5n * 10n**18n; // 5 USDFC
    const minPaymentsBalance = 4n * 10n**18n; // Need at least 4 USDFC in Payments

    if (paymentsBalance < minPaymentsBalance) {
      console.log(`   📤 Depositing ${formatUSDFC(depositAmount)} to Payments contract...`);

      const depositTx = await synapse.payments.deposit(depositAmount, 'USDFC');
      console.log(`   Transaction hash: ${depositTx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const depositReceipt = await depositTx.wait();

      if (depositReceipt.status === 1) {
        console.log(`   ✅ Deposit successful!`);

        const newPaymentsBalance = await synapse.payments.balance('USDFC');
        console.log(`   New Payments Balance: ${formatUSDFC(newPaymentsBalance)}`);
      } else {
        throw new Error('Deposit transaction failed');
      }
    } else {
      console.log(`   ✅ Sufficient balance in Payments contract (${formatUSDFC(paymentsBalance)})`);
    }
    console.log();

    // Step 4: Approve Warm Storage service
    console.log('🔐 Step 4: Approve Warm Storage Service');
    console.log('   Checking operator approval...');

    try {
      const isApproved = await synapse.payments.isApprovedOperator();

      if (!isApproved) {
        console.log('   📝 Approving Warm Storage as operator...');
        const approveTx = await synapse.payments.approveOperator();
        console.log(`   Transaction hash: ${approveTx.hash}`);

        const approveReceipt = await approveTx.wait();
        if (approveReceipt.status === 1) {
          console.log('   ✅ Warm Storage approved as operator');
        } else {
          throw new Error('Operator approval failed');
        }
      } else {
        console.log('   ✅ Warm Storage already approved');
      }
    } catch (error) {
      console.log(`   ⚠️  Approval check/set skipped: ${error.message}`);
      console.log('   Continuing with upload attempt...');
    }
    console.log();

    // Step 5: Create storage context (selects real Storage Provider)
    console.log('🌐 Step 5: Create Storage Context');
    console.log('   Selecting Storage Provider...');

    const storageContext = await synapse.storage.createContext({
      withCDN: false,
      callbacks: {
        onProviderSelected: (provider) => {
          console.log(`   ✅ Selected Provider: ${provider.serviceProvider}`);
        },
        onDataSetResolved: (info) => {
          if (info.isExisting) {
            console.log(`   ✅ Using existing Data Set: ${info.dataSetId}`);
          } else {
            console.log(`   ✅ Created new Data Set: ${info.dataSetId}`);
          }
        },
        onDataSetCreationStarted: (transaction) => {
          console.log(`   📝 Creating Data Set, tx: ${transaction.hash}`);
        },
        onDataSetCreationProgress: (progress) => {
          if (progress.transactionMined && !progress.dataSetLive) {
            console.log('   ⏳ Transaction mined, waiting for Data Set to be live...');
          }
        }
      }
    });

    console.log(`   Data Set ID: ${storageContext.dataSetId}`);

    const providerInfo = await storageContext.getProviderInfo();
    console.log(`   Provider Name: ${providerInfo.name}`);
    if (providerInfo.products.PDP?.data.serviceURL) {
      console.log(`   PDP Service: ${providerInfo.products.PDP.data.serviceURL}`);
    }
    console.log();

    // Step 5.5: Preflight check
    console.log('🔍 Step 5.5: Preflight Upload Check');
    const testSize = 256; // Small test size

    try {
      const preflight = await storageContext.preflightUpload(testSize);
      console.log('   Estimated costs:');
      console.log(`     Per epoch: ${formatUSDFC(preflight.estimatedCost.perEpoch)}`);
      console.log(`     Per day: ${formatUSDFC(preflight.estimatedCost.perDay)}`);
      console.log(`     Per month: ${formatUSDFC(preflight.estimatedCost.perMonth)}`);

      if (!preflight.allowanceCheck.sufficient) {
        console.log(`\n   ❌ 授权不足: ${preflight.allowanceCheck.message}`);
        console.log('   需要:');
        console.log('     1. 足够的 USDFC 余额');
        console.log('     2. 授权 USDFC 给 Payments 合约');
        console.log('     3. 授权 Warm Storage 服务作为 operator');
        throw new Error(`Insufficient allowances: ${preflight.allowanceCheck.message}`);
      }

      console.log('   ✅ 授权充足');
    } catch (error) {
      console.log(`   ⚠️  Preflight check failed: ${error.message}`);
      throw error; // Re-throw to stop execution
    }
    console.log();

    // Step 6: Prepare and upload small test metadata
    console.log('📤 Step 6: Upload Small Test Metadata');

    const metadataJson = JSON.stringify(TEST_METADATA, null, 2);
    const metadataBuffer = Buffer.from(metadataJson, 'utf-8');

    console.log(`   Data size: ${formatBytes(metadataBuffer.length)}`);
    console.log(`   Content: ${metadataJson.substring(0, 100)}...`);
    console.log();
    console.log('   🚀 Starting upload to Filecoin...');

    const uploadResult = await storageContext.upload(metadataBuffer, {
      onUploadComplete: (pieceCid) => {
        console.log(`   ✅ Upload complete! PieceCID: ${pieceCid}`);
      },
      onPieceAdded: (transaction) => {
        console.log(`   ✅ Piece added to Data Set, tx: ${transaction.hash}`);
      },
      onPieceConfirmed: (pieceIds) => {
        console.log(`   ✅ Piece confirmed! IDs: ${pieceIds.join(', ')}`);
      }
    });

    console.log();
    console.log('📊 Upload Results:');
    console.log(`   PieceCID: ${uploadResult.pieceCid}`);
    console.log(`   Piece ID: ${uploadResult.pieceId}`);
    console.log(`   Data Set ID: ${storageContext.dataSetId}`);
    console.log(`   Size: ${formatBytes(uploadResult.size)}`);
    console.log();

    // Step 7: Verify on pdp.vxb.ai
    console.log('🔍 Step 7: Verify on pdp.vxb.ai');

    if (providerInfo.products.PDP?.data.serviceURL) {
      const retrievalUrl = `${providerInfo.products.PDP.data.serviceURL.replace(/\/$/, '')}/piece/${uploadResult.pieceCid}`;
      console.log(`   Retrieval URL: ${retrievalUrl}`);
      console.log(`   ✅ You can verify this upload at: https://pdp.vxb.ai/calibration`);
    }
    console.log();

    // Step 8: Download back to verify integrity
    console.log('⬇️  Step 8: Download and Verify');
    console.log(`   Downloading PieceCID: ${uploadResult.pieceCid}...`);

    const downloadedData = await synapse.storage.download(uploadResult.pieceCid);
    console.log(`   ✅ Downloaded ${formatBytes(downloadedData.length)}`);

    const matches = Buffer.from(metadataBuffer).equals(Buffer.from(downloadedData));

    if (matches) {
      console.log(`   ✅ Data integrity verified! Download matches upload.`);
    } else {
      console.log(`   ❌ WARNING: Downloaded data does not match original!`);
    }
    console.log();

    // Step 9: Check piece status
    console.log('📈 Step 9: Check Piece Status');

    const pieceStatus = await storageContext.pieceStatus(uploadResult.pieceCid);
    console.log(`   Exists on Provider: ${pieceStatus.exists}`);

    if (pieceStatus.dataSetLastProven) {
      console.log(`   Last Proven: ${pieceStatus.dataSetLastProven.toLocaleString()}`);
    }
    if (pieceStatus.dataSetNextProofDue) {
      console.log(`   Next Proof Due: ${pieceStatus.dataSetNextProofDue.toLocaleString()}`);
    }
    if (pieceStatus.hoursUntilChallengeWindow && pieceStatus.hoursUntilChallengeWindow > 0) {
      console.log(`   Hours until challenge: ${pieceStatus.hoursUntilChallengeWindow.toFixed(1)}`);
    }
    console.log();

    // Final summary
    console.log('='.repeat(80));
    console.log('🎉 TEST SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log();
    console.log('✅ Summary:');
    console.log(`   - Uploaded to real Filecoin network`);
    console.log(`   - PieceCID: ${uploadResult.pieceCid}`);
    console.log(`   - Data Set: ${storageContext.dataSetId}`);
    console.log(`   - Provider: ${providerInfo.name}`);
    console.log(`   - Size: ${formatBytes(uploadResult.size)}`);
    console.log(`   - Integrity: ${matches ? 'VERIFIED ✅' : 'FAILED ❌'}`);
    console.log();
    console.log('🔗 Next Steps:');
    console.log(`   1. Verify at: https://pdp.vxb.ai/calibration`);
    console.log(`   2. Use this PieceCID in your NFT metadata: ipfs://${uploadResult.pieceCid}`);
    console.log(`   3. Run full demo with: node demo.js`);
    console.log();

  } catch (error) {
    console.error('\n❌ Test Failed!');
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

// Run the test
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
