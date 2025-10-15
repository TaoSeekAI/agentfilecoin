/**
 * Real Filecoin Uploader using PDP (Proof of Data Possession)
 * This is the REAL implementation that uploads to Filecoin via PDP servers
 * NOT mock - actual Filecoin Calibration testnet storage!
 */

import { PDPUploadService, PDPDownloadService } from '@filoz/synapse-sdk/pdp';
import { calculate as calculateCommp } from '@filoz/synapse-sdk/commp';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class FilecoinUploaderPDP {
  constructor() {
    // PDP API endpoints for Filecoin Calibration testnet
    this.pdpApiEndpoint = 'https://pdp.vxb.ai/calibration';
    this.serviceName = 'public';

    this.uploadService = null;
    this.downloadService = null;
    this.uploadResults = [];
  }

  /**
   * Initialize PDP Upload/Download services
   */
  async initialize() {
    console.log('\n🚀 Initializing Real Filecoin PDP Uploader...');
    console.log(`   PDP API: ${this.pdpApiEndpoint}`);
    console.log(`   Service: ${this.serviceName}`);
    console.log(`   Network: Filecoin Calibration Testnet`);

    try {
      // Create PDP upload service
      this.uploadService = new PDPUploadService(this.pdpApiEndpoint, this.serviceName);

      // Create PDP download service
      this.downloadService = new PDPDownloadService(this.pdpApiEndpoint, this.serviceName);

      console.log('✅ PDP Services initialized');
      console.log('   This will upload to REAL Filecoin storage!');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PDP services:', error.message);
      throw error;
    }
  }

  /**
   * Upload data to Filecoin via PDP
   * Returns real Filecoin CommP (Piece CID)
   */
  async uploadToFilecoin(data, metadata = {}) {
    if (!this.uploadService) {
      await this.initialize();
    }

    console.log('\n📤 Uploading to Real Filecoin via PDP...');
    console.log(`   Data size: ${(data.length / 1024).toFixed(2)} KB`);

    try {
      // Step 1: Calculate CommP (Piece CID)
      console.log('   ⚙️  Calculating CommP (Piece CID)...');
      const commp = calculateCommp(data);
      console.log(`   ✅ CommP calculated: ${commp}`);

      // Step 2: Upload to PDP server
      console.log('   📡 Uploading to PDP server...');
      await this.uploadService.upload(data, commp);
      console.log('   ✅ Upload successful!');

      // Step 3: Verify upload
      console.log('   🔍 Verifying upload...');
      const verified = await this.verifyUpload(commp);

      if (verified) {
        console.log('   ✅ Upload verified on Filecoin!');
      } else {
        console.warn('   ⚠️  Upload verification pending (may take a few moments)');
      }

      const result = {
        success: true,
        cid: commp,
        pieceCid: commp,
        url: `${this.pdpApiEndpoint}/download/${this.serviceName}/${commp}`,
        metadata,
        timestamp: Date.now(),
        verified
      };

      this.uploadResults.push(result);

      return result;
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
   * Verify that data was uploaded successfully
   */
  async verifyUpload(commp) {
    try {
      // Try to retrieve the data to verify it exists
      const response = await axios.head(
        `${this.pdpApiEndpoint}/download/${this.serviceName}/${commp}`,
        { timeout: 10000 }
      );

      return response.status === 200;
    } catch (error) {
      // Data might still be processing
      return false;
    }
  }

  /**
   * Upload JSON metadata to Filecoin via PDP
   * Returns Filecoin URI (ipfs://{commp})
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
        console.log(`   Filecoin URI (CommP): ${filecoinUri}`);
        console.log(`   Download URL: ${result.url}`);
        console.log(`   Verify at: ${this.pdpApiEndpoint}`);

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
   * Download data from Filecoin via PDP
   */
  async downloadFromFilecoin(commp) {
    if (!this.downloadService) {
      await this.initialize();
    }

    console.log(`\n📥 Downloading from Filecoin: ${commp}`);

    try {
      const data = await this.downloadService.download(commp);

      console.log(`✅ Downloaded successfully (${data.length} bytes)`);

      return data;
    } catch (error) {
      console.error(`❌ Failed to download ${commp}:`, error.message);
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
          'User-Agent': 'Filecoin-PDP-Uploader/1.0'
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
   * Migrate IPFS CID to Filecoin via PDP
   * Returns real Filecoin CommP and retrieval URL
   */
  async migrateIPFSToFilecoin(ipfsCid, ipfsGateway = 'https://ipfs.io/ipfs/') {
    console.log('\n' + '='.repeat(60));
    console.log(`🔄 Migrating IPFS to Real Filecoin: ${ipfsCid}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Download from IPFS
      const downloadResult = await this.downloadFromIPFS(ipfsCid, ipfsGateway);

      // Step 2: Upload to Filecoin via PDP
      const uploadResult = await this.uploadToFilecoin(downloadResult.data, {
        originalIPFSCID: ipfsCid,
        originalSize: downloadResult.size,
        sourceGateway: ipfsGateway,
        name: `ipfs-${ipfsCid.substring(0, 10)}`
      });

      console.log('\n✅ Migration Complete!');
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Filecoin CommP: ${uploadResult.cid}`);
      console.log(`   Retrieval URL: ${uploadResult.url}`);
      console.log(`   Verified: ${uploadResult.verified ? 'Yes' : 'Pending'}`);

      return {
        ipfsCid,
        filecoinCid: uploadResult.cid,
        filecoinUri: `ipfs://${uploadResult.cid}`,
        retrievalUrl: uploadResult.url,
        size: downloadResult.size,
        verified: uploadResult.verified,
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
   * Batch migrate multiple IPFS CIDs to Filecoin
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
    const verified = results.filter(r => r.success && r.verified).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Migration Summary:');
    console.log('='.repeat(60));
    console.log(`   Total: ${results.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Verified: ${verified}`);
    console.log(`   Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

    // Save report
    const report = {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        verified,
        successRate: (successful / results.length) * 100
      },
      pdpEndpoint: this.pdpApiEndpoint,
      timestamp: new Date().toISOString()
    };

    // Save migration report with real Filecoin CommPs
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, 'migration-report-real-filecoin.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n📄 Report saved: ${path.join(outputDir, 'migration-report-real-filecoin.json')}`);

    return report;
  }

  /**
   * Get all upload results
   */
  getUploadResults() {
    return this.uploadResults;
  }

  /**
   * Get successful uploads with Filecoin CommPs
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
    const verified = successful.filter(r => r.verified);

    return {
      timestamp: new Date().toISOString(),
      network: 'Filecoin Calibration Testnet',
      pdpEndpoint: this.pdpApiEndpoint,
      summary: {
        total: this.uploadResults.length,
        successful: successful.length,
        failed: failed.length,
        verified: verified.length,
        successRate: (successful.length / this.uploadResults.length) * 100
      },
      uploads: this.uploadResults,
      filecoinCommPs: successful.map(r => ({
        filecoinCommP: r.cid,
        filecoinUri: `ipfs://${r.cid}`,
        retrievalUrl: r.url,
        verified: r.verified,
        metadata: r.metadata
      }))
    };
  }
}

export default FilecoinUploaderPDP;
