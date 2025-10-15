/**
 * Real Filecoin Uploader Module - No Mock
 * Uploads data to Filecoin Calibration testnet using Synapse SDK
 * Returns real Filecoin CIDs that can be used as on-chain URIs
 */

import { Synapse } from '@filoz/synapse-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class FilecoinUploaderReal {
  constructor(privateKey, rpcUrl) {
    this.privateKey = privateKey;
    this.rpcUrl = rpcUrl;
    this.synapse = null;
    this.storageService = null;
    this.uploadResults = [];
  }

  /**
   * Initialize Synapse SDK for Real Filecoin Network
   */
  async initialize() {
    console.log('\n🚀 Initializing Synapse SDK (Real Filecoin)...');
    console.log(`   RPC URL: ${this.rpcUrl}`);

    try {
      // Create Synapse instance
      this.synapse = await Synapse.create({
        privateKey: this.privateKey,
        rpcURL: this.rpcUrl,
        withCDN: true,  // Enable CDN for faster retrieval
        disableNonceManager: false
      });

      console.log('✅ Synapse SDK initialized');

      // Get wallet address and balance (if methods are available)
      try {
        if (this.synapse.getAddress) {
          const address = await this.synapse.getAddress();
          console.log(`   Wallet Address: ${address}`);
        }

        if (this.synapse.getBalance) {
          const balance = await this.synapse.getBalance();
          console.log(`   Balance: ${balance} tFIL`);

          if (parseFloat(balance) < 0.01) {
            console.warn('⚠️  Warning: Low balance. Get test FIL from https://faucet.calibration.fildev.network/');
          }
        }
      } catch (infoError) {
        console.log('   Note: Could not retrieve wallet info (this is optional)');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Synapse SDK:', error.message);
      throw error;
    }
  }

  /**
   * Create storage deal on Filecoin
   * Returns real Filecoin CID
   */
  async createStorageDeal(data, metadata = {}) {
    if (!this.synapse) {
      await this.initialize();
    }

    console.log('\n📤 Creating Filecoin Storage Deal...');
    console.log(`   Data size: ${(data.length / 1024).toFixed(2)} KB`);

    try {
      // Create storage deal
      // Note: Synapse SDK on Calibration uses a simplified API
      const result = await this.synapse.upload(data, {
        name: metadata.name || 'nft-data',
        description: metadata.description || 'NFT metadata migrated from IPFS'
      });

      console.log('✅ Storage deal created!');
      console.log(`   CID: ${result.cid}`);
      console.log(`   Deal ID: ${result.dealId || 'pending'}`);

      return {
        success: true,
        cid: result.cid,  // This is the real Filecoin CID
        dealId: result.dealId,
        url: `https://calibration.filswan.com/ipfs/${result.cid}`,  // Retrieval URL
        metadata,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to create storage deal:', error.message);

      // Fallback: Try alternative upload method
      try {
        console.log('   Trying alternative upload method...');
        const result = await this.alternativeUpload(data, metadata);
        return result;
      } catch (fallbackError) {
        throw new Error(`All upload methods failed: ${error.message}`);
      }
    }
  }

  /**
   * Alternative upload method using storage provider directly
   */
  async alternativeUpload(data, metadata) {
    console.log('   Using direct storage provider upload...');

    try {
      // Convert data to Buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      // Use Synapse's storage service
      if (!this.storageService) {
        this.storageService = await this.synapse.createStorage({
          proofSetId: `nft-migration-${Date.now()}`,
          storageProvider: null  // Auto-select
        });
      }

      // Upload data
      const uploadTask = await this.storageService.upload(buffer);

      // Wait for CommP (Piece CID)
      const pieceCid = await uploadTask.commp();

      // Try to get full CID (might not be available immediately)
      let fullCid = pieceCid;

      // For Calibration, the Piece CID can be used to construct retrieval URL
      const retrievalUrl = `https://calibration.filswan.com/ipfs/${pieceCid}`;

      console.log('✅ Alternative upload successful!');
      console.log(`   Piece CID: ${pieceCid}`);

      return {
        success: true,
        cid: fullCid,
        pieceCid: pieceCid,
        url: retrievalUrl,
        metadata,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Alternative upload failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload JSON metadata to Filecoin
   * Returns Filecoin URI (f://... or https://...)
   */
  async uploadMetadata(metadata, name = 'metadata') {
    console.log(`\n📝 Uploading metadata to Filecoin: ${name}`);

    try {
      const jsonData = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      const result = await this.createStorageDeal(buffer, {
        name: `${name}.json`,
        type: 'application/json',
        size: buffer.length
      });

      if (result.success) {
        // Return Filecoin URI that can be used on-chain
        const filecoinUri = `ipfs://${result.cid}`;
        console.log(`✅ Metadata uploaded!`);
        console.log(`   Filecoin URI: ${filecoinUri}`);
        console.log(`   Retrieval URL: ${result.url}`);

        return {
          ...result,
          uri: filecoinUri,
          retrievalUrl: result.url
        };
      }

      throw new Error('Upload failed');
    } catch (error) {
      console.error(`❌ Failed to upload metadata:`, error.message);
      throw error;
    }
  }

  /**
   * Download file from IPFS
   */
  async downloadFromIPFS(cid, ipfsGateway = 'https://ipfs.io/ipfs/', outputDir = './downloads') {
    console.log(`\n📥 Downloading from IPFS: ${cid}`);

    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const url = `${ipfsGateway}${cid}`;
      const outputPath = path.join(outputDir, cid);

      console.log(`   Gateway URL: ${url}`);
      console.log(`   Output path: ${outputPath}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,  // Increased timeout
        headers: {
          'User-Agent': 'Filecoin-Uploader-Real/1.0'
        }
      });

      fs.writeFileSync(outputPath, response.data);

      const sizeKB = (response.data.length / 1024).toFixed(2);
      console.log(`✅ Downloaded successfully (${sizeKB} KB)`);

      return {
        cid,
        localPath: outputPath,
        size: response.data.length,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Failed to download ${cid}:`, error.message);
      throw error;
    }
  }

  /**
   * Migrate IPFS CID to Filecoin
   * Returns real Filecoin CID and retrieval URL
   */
  async migrateIPFSToFilecoin(ipfsCid, ipfsGateway = 'https://ipfs.io/ipfs/') {
    console.log('\n' + '='.repeat(60));
    console.log(`🔄 Migrating IPFS to Filecoin: ${ipfsCid}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Download from IPFS
      const downloadResult = await this.downloadFromIPFS(ipfsCid, ipfsGateway);

      // Step 2: Upload to Filecoin
      const uploadResult = await this.createStorageDeal(downloadResult.data, {
        originalIPFSCID: ipfsCid,
        originalSize: downloadResult.size,
        sourceGateway: ipfsGateway,
        name: `ipfs-${ipfsCid.substring(0, 10)}`
      });

      console.log('\n✅ Migration Complete!');
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Filecoin CID: ${uploadResult.cid}`);
      console.log(`   Retrieval URL: ${uploadResult.url}`);

      this.uploadResults.push({
        ...uploadResult,
        ipfsCid
      });

      return {
        ipfsCid,
        filecoinCid: uploadResult.cid,
        filecoinUri: `ipfs://${uploadResult.cid}`,
        retrievalUrl: uploadResult.url,
        size: downloadResult.size,
        success: true
      };
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);

      const failedResult = {
        ipfsCid,
        success: false,
        error: error.message
      };

      this.uploadResults.push(failedResult);

      return failedResult;
    }
  }

  /**
   * Batch migrate multiple IPFS CIDs
   */
  async batchMigrate(ipfsCids, ipfsGateway = 'https://ipfs.io/ipfs/', delayMs = 2000) {
    console.log('\n' + '='.repeat(60));
    console.log(`📦 Batch Migration: ${ipfsCids.length} IPFS CIDs`);
    console.log('='.repeat(60));

    const results = [];

    for (let i = 0; i < ipfsCids.length; i++) {
      const cid = ipfsCids[i];
      console.log(`\n[${i + 1}/${ipfsCids.length}] Processing: ${cid}`);

      try {
        const result = await this.migrateIPFSToFilecoin(cid, ipfsGateway);
        results.push(result);

        // Delay between uploads
        if (i < ipfsCids.length - 1) {
          console.log(`\n⏳ Waiting ${delayMs}ms before next upload...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`\n❌ Failed to migrate ${cid}:`, error.message);
        results.push({
          ipfsCid: cid,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Migration Summary:');
    console.log('='.repeat(60));
    console.log(`   Total: ${results.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

    // Save report
    const report = {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        successRate: (successful / results.length) * 100
      }
    };

    // Save migration report with Filecoin CIDs
    fs.writeFileSync(
      './output/migration-report.json',
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  /**
   * Verify data on Filecoin
   */
  async verifyOnFilecoin(cid) {
    console.log(`\n🔍 Verifying on Filecoin: ${cid}`);

    try {
      // Try to retrieve data to verify it exists
      const url = `https://calibration.filswan.com/ipfs/${cid}`;

      const response = await axios.head(url, {
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('✅ Data verified on Filecoin');
        return {
          verified: true,
          cid,
          url
        };
      }

      return {
        verified: false,
        cid,
        error: 'Not found'
      };
    } catch (error) {
      console.log('⚠️  Verification pending (data may still be processing)');
      return {
        verified: false,
        cid,
        error: error.message,
        note: 'Data may still be processing on Filecoin network'
      };
    }
  }

  /**
   * Get all upload results
   */
  getUploadResults() {
    return this.uploadResults;
  }

  /**
   * Get successful uploads with Filecoin CIDs
   */
  getSuccessfulUploads() {
    return this.uploadResults.filter(r => r.success);
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const successful = this.uploadResults.filter(r => r.success);
    const failed = this.uploadResults.filter(r => !r.success);

    return {
      timestamp: new Date().toISOString(),
      network: 'Filecoin Calibration Testnet',
      summary: {
        total: this.uploadResults.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / this.uploadResults.length) * 100
      },
      uploads: this.uploadResults,
      filecoinCIDs: successful.map(r => ({
        ipfsCid: r.ipfsCid,
        filecoinCid: r.filecoinCid || r.cid,
        filecoinUri: r.filecoinUri || `ipfs://${r.cid}`,
        retrievalUrl: r.retrievalUrl || r.url,
        metadata: r.metadata
      }))
    };
  }
}

export default FilecoinUploaderReal;
