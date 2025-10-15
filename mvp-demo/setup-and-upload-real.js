/**
 * Setup USDFC and Upload to Real Filecoin
 *
 * This script:
 * 1. Checks USDFC balance (you have 3662.44 tUSDFC)
 * 2. Deposits USDFC to Payments contract if needed
 * 3. Approves Warm Storage service
 * 4. Uploads test metadata to REAL Filecoin
 * 5. Verifies on https://pdp.vxb.ai/calibration
 */

import 'dotenv/config';
import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

async function setupAndUpload() {
  console.log('🚀 Setup USDFC and Upload to Real Filecoin\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Initialize Synapse
    console.log('\n📡 Step 1: Initializing Synapse SDK v0.33.0...');
    const synapse = await Synapse.create({
      privateKey: process.env.PRIVATE_KEY,
      rpcURL: process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
    });

    const signer = synapse.getSigner();
    const address = await signer.getAddress();
    console.log(`✅ Initialized`);
    console.log(`   Wallet: ${address}`);

    // Step 2: Check balances
    console.log('\n💰 Step 2: Checking balances...');
    const filBalance = await synapse.payments.walletBalance();
    const usdfcBalance = await synapse.payments.walletBalance('USDFC');
    const paymentsBalance = await synapse.payments.balance('USDFC');

    console.log(`✅ Wallet Balances:`);
    console.log(`   FIL: ${(Number(filBalance) / 1e18).toFixed(4)} FIL`);
    console.log(`   USDFC: ${(Number(usdfcBalance) / 1e18).toFixed(4)} USDFC`);
    console.log(`   Payments Contract: ${(Number(paymentsBalance) / 1e18).toFixed(4)} USDFC`);

    // Step 3: Deposit USDFC if needed
    const minBalance = 10n * 10n**18n; // 10 USDFC minimum
    if (paymentsBalance < minBalance) {
      console.log('\n💸 Step 3: Depositing USDFC to Payments contract...');
      const depositAmount = 100n * 10n**18n; // Deposit 100 USDFC
      console.log(`   Depositing: ${(Number(depositAmount) / 1e18).toFixed(2)} USDFC`);

      const txHash = await synapse.payments.deposit(depositAmount, 'USDFC');
      console.log(`✅ Deposit successful!`);
      console.log(`   Transaction: ${txHash}`);

      // Check new balance
      const newBalance = await synapse.payments.balance('USDFC');
      console.log(`   New balance: ${(Number(newBalance) / 1e18).toFixed(4)} USDFC`);
    } else {
      console.log('\n✅ Step 3: Sufficient USDFC balance in Payments contract');
    }

    // Step 4: Approve Warm Storage service
    console.log('\n🔐 Step 4: Checking Warm Storage service approval...');
    const warmStorageAddress = synapse.getWarmStorageAddress();
    console.log(`   Warm Storage Address: ${warmStorageAddress}`);

    // Note: This will be handled automatically by the SDK when creating context
    console.log(`✅ Warm Storage service will be approved during context creation if needed`);

    // Step 5: Create storage context
    console.log('\n📦 Step 5: Creating Storage Context...');
    const storageContext = await synapse.storage.createContext({
      withCDN: false,
      callbacks: {
        onProviderSelected: (provider) => {
          console.log(`   ✅ Selected Provider: ${provider.serviceProvider}`);
        },
        onDataSetResolved: (info) => {
          if (info.isExisting) {
            console.log(`   ✅ Using existing data set: ${info.dataSetId}`);
          } else {
            console.log(`   ✅ Created new data set: ${info.dataSetId}`);
          }
        },
        onDataSetCreationStarted: (transaction) => {
          console.log(`   📝 Creating data set, tx: ${transaction.hash}`);
        },
        onDataSetCreationProgress: (progress) => {
          if (progress.transactionMined && !progress.dataSetLive) {
            console.log('   ⏳ Transaction mined, waiting for data set to be live...');
          }
        },
      },
    });

    console.log(`✅ Storage Context created successfully!`);
    console.log(`   Data Set ID: ${storageContext.dataSetId}`);

    // Get provider details
    const providerInfo = await storageContext.getProviderInfo();
    console.log(`   Provider Name: ${providerInfo.name || 'N/A'}`);
    console.log(`   Provider Active: ${providerInfo.active}`);
    if (providerInfo.products?.PDP?.data?.serviceURL) {
      console.log(`   PDP Service URL: ${providerInfo.products.PDP.data.serviceURL}`);
    }

    // Step 6: Upload test metadata
    console.log('\n📤 Step 6: Uploading test metadata to Real Filecoin...');
    const testMetadata = {
      name: 'NFT IPFS to Filecoin Migration Agent - Real Upload Test',
      description: 'Testing real Filecoin upload with Synapse SDK v0.33.0 and USDFC payments',
      type: 'AI Agent Metadata',
      capabilities: ['nft-scanning', 'ipfs-retrieval', 'filecoin-upload', 'erc8004-validation'],
      version: '1.0.0',
      network: 'Filecoin Calibration Testnet',
      timestamp: new Date().toISOString(),
      realUpload: true
    };

    console.log('   Test Metadata:');
    console.log(JSON.stringify(testMetadata, null, 2).split('\n').map(l => '   ' + l).join('\n'));

    const jsonData = JSON.stringify(testMetadata, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');

    console.log(`\n   Uploading ${buffer.length} bytes...`);

    const result = await storageContext.upload(buffer, {
      onUploadComplete: (pieceCid) => {
        console.log(`   ✅ Upload complete! PieceCID: ${pieceCid}`);
      },
      onPieceAdded: (transaction) => {
        console.log(`   ✅ Piece added to data set, tx: ${transaction.hash}`);
      },
      onPieceConfirmed: (pieceIds) => {
        console.log(`   ✅ Piece confirmed! IDs: ${pieceIds.join(', ')}`);
      },
    });

    // Step 7: Success summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 SUCCESS! Metadata uploaded to Real Filecoin!');
    console.log('='.repeat(80));
    console.log('\n📊 Upload Details:');
    console.log(`   PieceCID: ${result.pieceCid}`);
    console.log(`   Piece ID: ${result.pieceId}`);
    console.log(`   Size: ${result.size} bytes`);
    console.log(`   Data Set ID: ${storageContext.dataSetId}`);
    console.log(`   Filecoin URI: ipfs://${result.pieceCid}`);

    console.log('\n🔍 Verification:');
    console.log(`   1. Visit: https://pdp.vxb.ai/calibration`);
    console.log(`   2. Search for PieceCID: ${result.pieceCid}`);
    console.log(`   3. Search for Data Set ID: ${storageContext.dataSetId}`);

    if (providerInfo.products?.PDP?.data?.serviceURL) {
      const retrievalUrl = `${providerInfo.products.PDP.data.serviceURL.replace(/\/$/, '')}/piece/${result.pieceCid}`;
      console.log(`   4. Retrieval URL: ${retrievalUrl}`);
    }

    // Step 8: Download back to verify
    console.log('\n📥 Step 8: Downloading back to verify...');
    const downloadedData = await synapse.storage.download(result.pieceCid);
    const downloadedJson = JSON.parse(new TextDecoder().decode(downloadedData));

    console.log(`✅ Download successful! Size: ${downloadedData.length} bytes`);
    console.log(`   Name matches: ${downloadedJson.name === testMetadata.name}`);
    console.log(`   Timestamp matches: ${downloadedJson.timestamp === testMetadata.timestamp}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All steps completed successfully!');
    console.log('='.repeat(80));
    console.log('\n🎊 Your metadata is now permanently stored on Filecoin Calibration testnet!');
    console.log('   It can be verified and retrieved by anyone using the PieceCID.');

    return {
      success: true,
      pieceCid: result.pieceCid,
      pieceId: result.pieceId,
      dataSetId: storageContext.dataSetId,
      size: result.size,
      filecoinUri: `ipfs://${result.pieceCid}`,
      verificationUrl: 'https://pdp.vxb.ai/calibration'
    };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause.message);
    }
    console.error('\nStack:', error.stack);
    throw error;
  }
}

// Run the setup and upload
setupAndUpload()
  .then((result) => {
    console.log('\n✅ Script completed successfully!');
    console.log('\nResult:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
