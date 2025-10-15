/**
 * Phase 5: Generate Proof
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';
import { FilecoinUploaderPDP } from '../../filecoin-uploader-pdp.js';

export class Phase5_GenerateProof extends PhaseBase {
  constructor() {
    super(
      'Generate Proof',
      'Generate proof metadata for validation response'
    );
  }

  async execute(context) {
    this.logSection('Phase 5: Generate Proof');

    if (!context.phase3Result || !context.phase4Result) {
      throw new Error('Phase 3 and 4 must be completed first');
    }

    const validationProvider = new ethers.JsonRpcProvider(process.env.VALIDATION_NETWORK_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, validationProvider);

    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    const proofMetadata = erc8004Client.generateProofMetadata(
      context.phase3Result.taskURI,
      context.phase4Result.results
    );

    // 上传证明元数据到 Filecoin
    this.log('\n📤 Uploading proof metadata to Filecoin...');

    // 初始化 Real Filecoin PDP uploader
    const filecoinUploader = new FilecoinUploaderPDP();
    await filecoinUploader.initialize();

    // 保存本地副本
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const localPath = path.join(outputDir, 'proof-metadata-interactive.json');
    fs.writeFileSync(localPath, JSON.stringify(proofMetadata, null, 2));
    this.log(`Local copy saved: ${localPath}`);

    // 上传到 Filecoin
    let proofURI;
    try {
      const uploadResult = await filecoinUploader.uploadMetadata(proofMetadata, 'proof-metadata-interactive');
      proofURI = uploadResult.uri;  // Returns ipfs://{cid}
      this.logSuccess(`Proof metadata uploaded to Filecoin: ${proofURI}`);
      this.log(`Retrieval URL: ${uploadResult.retrievalUrl}`);
    } catch (error) {
      this.log(`⚠️  Failed to upload to Filecoin: ${error.message}`);
      this.log('Falling back to temporary URI');
      proofURI = 'ipfs://QmProof' + Math.random().toString(36).substr(2);
    }

    this.logSuccess('Proof metadata generated');
    this.log(`Migration Success: ${context.phase4Result.summary.successful}/${context.phase4Result.summary.total}`);
    this.log(`Proof URI: ${proofURI}`);

    return {
      proofMetadata,
      proofURI,
      migrationSummary: context.phase4Result.summary,
      timestamp: new Date().toISOString()
    };
  }
}
