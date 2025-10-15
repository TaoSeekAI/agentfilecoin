/**
 * Real Filecoin Uploader using Synapse SDK v0.33.0 API
 * Based on example-storage-e2e.js from GitHub master branch
 *
 * This uploader uses the REAL Filecoin storage API:
 * - synapse.storage.createContext() - Creates storage context with real SP
 * - storageContext.upload() - Uploads to real Filecoin via Storage Provider
 * - synapse.storage.download() - Downloads from Filecoin
 *
 * Files uploaded will be verifiable on https://pdp.vxb.ai/calibration
 */

import { Synapse } from '@filoz/synapse-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class FilecoinUploaderV033 {
  constructor(privateKey, rpcUrl, warmStorageAddress = null) {
    this.privateKey = privateKey;
    this.rpcUrl = rpcUrl;
    this.warmStorageAddress = warmStorageAddress;

    this.synapse = null;
    this.storageContext = null;
    this.uploadResults = [];
  }

  /**
   * Initialize Synapse SDK v0.33.0
   */
  async initialize() {
    console.log('\n🚀 Initializing Synapse SDK v0.33.0 (Real Filecoin)...');
    console.log(`   RPC URL: ${this.rpcUrl}`);

    try {
      const synapseOptions = {
        privateKey: this.privateKey,
        rpcURL: this.rpcUrl,
      };

      // Add Warm Storage address if provided
      if (this.warmStorageAddress) {
        synapseOptions.warmStorageAddress = this.warmStorageAddress;
        console.log(`   Warm Storage: ${this.warmStorageAddress}`);
      }

      // Create Synapse instance
      this.synapse = await Synapse.create(synapseOptions);

      // Get wallet info
      const signer = this.synapse.getSigner();
      const address = await signer.getAddress();
      console.log(`✅ Synapse SDK initialized`);
      console.log(`   Wallet: ${address}`);

      // Check balances
      const filBalance = await this.synapse.payments.walletBalance();
      const usdfcBalance = await this.synapse.payments.walletBalance('USDFC');
      console.log(`   FIL balance: ${(Number(filBalance) / 1e18).toFixed(4)} FIL`);
      console.log(`   USDFC balance: ${(Number(usdfcBalance) / 1e18).toFixed(4)} USDFC`);

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Synapse SDK:', error.message);
      throw error;
    }
  }

  /**
   * Create storage context with real Storage Provider
   */
  async createStorageContext(options = {}) {
    if (!this.synapse) {
      await this.initialize();
    }

    console.log('\n📦 Creating Storage Context...');

    try {
      // Create storage context
      this.storageContext = await this.synapse.storage.createContext({
        withCDN: options.withCDN || false,
        callbacks: {
          onProviderSelected: (provider) => {
            console.log(`✅ Selected Storage Provider: ${provider.serviceProvider}`);
          },
          onDataSetResolved: (info) => {
            if (info.isExisting) {
              console.log(`✅ Using existing data set: ${info.dataSetId}`);
            } else {
              console.log(`✅ Created new data set: ${info.dataSetId}`);
            }
          },
          onDataSetCreationStarted: (transaction) => {
            console.log(`   Creating data set, tx: ${transaction.hash}`);
          },
          onDataSetCreationProgress: (progress) => {
            if (progress.transactionMined && !progress.dataSetLive) {
              console.log('   Transaction mined, waiting for data set to be live...');
            }
          },
        },
      });

      console.log(`✅ Storage Context created`);
      console.log(`   Data Set ID: ${this.storageContext.dataSetId}`);

      // Get provider details
      const providerInfo = await this.storageContext.getProviderInfo();
      console.log(`   Provider Name: ${providerInfo.name || 'N/A'}`);
      console.log(`   Provider Active: ${providerInfo.active}`);
      if (providerInfo.products?.PDP?.data?.serviceURL) {
        console.log(`   PDP Service URL: ${providerInfo.products.PDP.data.serviceURL}`);
      }

      return this.storageContext;
    } catch (error) {
      console.error('❌ Failed to create storage context:', error.message);
      throw error;
    }
  }

  /**
   * Upload data to Real Filecoin via Storage Provider
   * Returns PieceCID (CommP) that can be verified on-chain
   */
  async uploadToFilecoin(data, metadata = {}) {
    if (!this.storageContext) {
      await this.createStorageContext();
    }

    console.log('\n📤 Uploading to Real Filecoin...');
    console.log(`   Data size: ${(data.length / 1024).toFixed(2)} KB`);

    try {
      // Upload to Filecoin
      const result = await this.storageContext.upload(data, {
        onUploadComplete: (pieceCid) => {
          console.log(`✅ Upload complete! PieceCID: ${pieceCid}`);
        },
        onPieceAdded: (transaction) => {
          console.log(`✅ Piece added to data set, tx: ${transaction.hash}`);
        },
        onPieceConfirmed: (pieceIds) => {
          console.log(`✅ Piece confirmed! IDs: ${pieceIds.join(', ')}`);
        },
      });

      console.log('\n✅ Upload successful to Real Filecoin!');
      console.log(`   PieceCID: ${result.pieceCid}`);
      console.log(`   Piece ID: ${result.pieceId}`);
      console.log(`   Size: ${result.size} bytes`);

      const uploadInfo = {
        success: true,
        cid: result.pieceCid,
        pieceCid: result.pieceCid,
        pieceId: result.pieceId,
        size: result.size,
        dataSetId: this.storageContext.dataSetId,
        metadata,
        timestamp: Date.now()
      };

      this.uploadResults.push(uploadInfo);

      return uploadInfo;
    } catch (error) {
      console.error('❌ Failed to upload to Filecoin:', error.message);

      const failedResult = {
        success: false,
        error: error.message,
        metadata,
        timestamp: Date.now()
      };

      this.uploadResults.push(failedResult);

      throw error;
    }
  }

  /**
   * Upload JSON metadata to Filecoin
   * Returns Filecoin URI (ipfs://{pieceCid})
   */
  async uploadMetadata(metadata, name = 'metadata') {
    console.log(`\n📝 Uploading metadata to Real Filecoin: ${name}`);

    try {
      const jsonData = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      const result = await this.uploadToFilecoin(buffer, {
        name: `${name}.json`,
        type: 'application/json',
        size: buffer.length
      });

      if (result.success) {
        // Return Filecoin URI that can be used on-chain
        const filecoinUri = `ipfs://${result.cid}`;

        console.log(`✅ Metadata uploaded to Real Filecoin!`);
        console.log(`   Filecoin URI: ${filecoinUri}`);
        console.log(`   PieceCID: ${result.pieceCid}`);
        console.log(`   Data Set ID: ${result.dataSetId}`);
        console.log(`   🔍 Verify at: https://pdp.vxb.ai/calibration`);

        return {
          ...result,
          uri: filecoinUri,
          retrievalUrl: `https://pdp.vxb.ai/calibration/piece/${result.pieceCid}`
        };
      }

      throw new Error('Upload failed');
    } catch (error) {
      console.error(`❌ Failed to upload metadata:`, error.message);
      throw error;
    }
  }

  /**
   * Download data from Filecoin
   */
  async downloadFromFilecoin(pieceCid) {
    if (!this.synapse) {
      await this.initialize();
    }

    console.log(`\n📥 Downloading from Filecoin: ${pieceCid}`);

    try {
      // Use synapse.storage.download for SP-agnostic download
      const data = await this.synapse.storage.download(pieceCid);

      console.log(`✅ Downloaded successfully (${data.length} bytes)`);

      return data;
    } catch (error) {
      console.error(`❌ Failed to download ${pieceCid}:`, error.message);
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
        timeout: 60000,
        headers: {
          'User-Agent': 'Filecoin-Uploader-V033/1.0'
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
   * Migrate IPFS CID to Real Filecoin
   * Returns real Filecoin PieceCID and retrieval URL
   */
  async migrateIPFSToFilecoin(ipfsCid, ipfsGateway = 'https://ipfs.io/ipfs/') {
    console.log('\n' + '='.repeat(60));
    console.log(`🔄 Migrating IPFS to Real Filecoin: ${ipfsCid}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Download from IPFS
      const downloadResult = await this.downloadFromIPFS(ipfsCid, ipfsGateway);

      // Step 2: Upload to Real Filecoin
      const uploadResult = await this.uploadToFilecoin(downloadResult.data, {
        originalIPFSCID: ipfsCid,
        originalSize: downloadResult.size,
        sourceGateway: ipfsGateway,
        name: `ipfs-${ipfsCid.substring(0, 10)}`
      });

      console.log('\n✅ Migration Complete!');
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Filecoin PieceCID: ${uploadResult.cid}`);
      console.log(`   Data Set ID: ${uploadResult.dataSetId}`);
      console.log(`   🔍 Verify at: https://pdp.vxb.ai/calibration`);

      return {
        ipfsCid,
        filecoinCid: uploadResult.cid,
        filecoinUri: `ipfs://${uploadResult.cid}`,
        retrievalUrl: `https://pdp.vxb.ai/calibration/piece/${uploadResult.cid}`,
        dataSetId: uploadResult.dataSetId,
        size: downloadResult.size,
        success: true
      };
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);

      return {
        ipfsCid,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch migrate multiple IPFS CIDs to Real Filecoin
   */
  async batchMigrate(ipfsCids, ipfsGateway = 'https://ipfs.io/ipfs/', delayMs = 2000) {
    console.log('\n' + '='.repeat(60));
    console.log(`📦 Batch Migration to Real Filecoin: ${ipfsCids.length} IPFS CIDs`);
    console.log('='.repeat(60));

    const results = [];

    for (let i = 0; i < ipfsCids.length; i++) {
      const cid = ipfsCids[i];
      console.log(`\n[${i + 1}/${ipfsCids.length}] Processing: ${cid}`);

      try {
        const result = await this.migrateIPFSToFilecoin(cid, ipfsGateway);
        results.push(result);

        // Delay between uploads to avoid rate limiting
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
    console.log(`   🔍 Verify at: https://pdp.vxb.ai/calibration`);

    // Save report
    const report = {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        successRate: (successful / results.length) * 100
      },
      network: 'Filecoin Calibration Testnet',
      synapseVersion: '0.33.0',
      timestamp: new Date().toISOString()
    };

    // Save migration report with real Filecoin PieceCIDs
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, 'migration-report-real-v033.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n📄 Report saved: ${path.join(outputDir, 'migration-report-real-v033.json')}`);

    return report;
  }

  /**
   * Get all upload results
   */
  getUploadResults() {
    return this.uploadResults;
  }

  /**
   * Get successful uploads with Filecoin PieceCIDs
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
      synapseVersion: '0.33.0',
      summary: {
        total: this.uploadResults.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / this.uploadResults.length) * 100
      },
      uploads: this.uploadResults,
      filecoinPieceCIDs: successful.map(r => ({
        filecoinPieceCID: r.cid,
        filecoinUri: `ipfs://${r.cid}`,
        dataSetId: r.dataSetId,
        retrievalUrl: `https://pdp.vxb.ai/calibration/piece/${r.cid}`,
        metadata: r.metadata
      }))
    };
  }
}

export default FilecoinUploaderV033;
