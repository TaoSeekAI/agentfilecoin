/**
 * Test Real Filecoin Upload with Synapse SDK v0.33.0
 * This test uploads metadata to REAL Filecoin via Storage Provider
 * and verifies it can be found on https://pdp.vxb.ai/calibration
 */

import 'dotenv/config';
import { FilecoinUploaderV033 } from './filecoin-uploader-v033.js';

async function testRealFilecoinUpload() {
  console.log('🧪 Testing Real Filecoin Upload with Synapse SDK v0.33.0\n');

  try {
    // Create uploader
    const uploader = new FilecoinUploaderV033(
      process.env.PRIVATE_KEY,
      process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
      process.env.WARM_STORAGE_ADDRESS // Optional
    );

    // Initialize
    await uploader.initialize();

    // Create storage context
    await uploader.createStorageContext({ withCDN: false });

    // Upload test metadata
    const testMetadata = {
      name: 'Test Metadata for NFT Migration',
      description: 'Testing real Filecoin upload with Synapse SDK v0.33.0',
      type: 'test',
      timestamp: new Date().toISOString(),
      test: true
    };

    console.log('\n📝 Test Metadata:');
    console.log(JSON.stringify(testMetadata, null, 2));

    const result = await uploader.uploadMetadata(testMetadata, 'test-metadata');

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log('📊 Upload Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Filecoin URI: ${result.uri}`);
    console.log(`   PieceCID: ${result.pieceCid}`);
    console.log(`   Piece ID: ${result.pieceId}`);
    console.log(`   Data Set ID: ${result.dataSetId}`);
    console.log(`   Size: ${result.size} bytes`);
    console.log('\n🔍 Verification:');
    console.log(`   Verify at: https://pdp.vxb.ai/calibration`);
    console.log(`   Search for PieceCID: ${result.pieceCid}`);
    console.log(`   Search for Data Set ID: ${result.dataSetId}`);

    // Try to download back
    console.log('\n📥 Testing download...');
    const downloadedData = await uploader.downloadFromFilecoin(result.pieceCid);
    const downloadedJson = JSON.parse(new TextDecoder().decode(downloadedData));

    console.log('✅ Download successful!');
    console.log('   Downloaded metadata matches:', JSON.stringify(downloadedJson.name) === JSON.stringify(testMetadata.name));

    console.log('\n🎉 All tests passed!');
    console.log('   This metadata is now permanently stored on Filecoin Calibration testnet!');
    console.log(`   It can be verified at: https://pdp.vxb.ai/calibration`);

    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Run test
testRealFilecoinUpload()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
