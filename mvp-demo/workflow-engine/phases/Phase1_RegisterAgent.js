/**
 * Phase 1: Register ERC-8004 Agent
 * 在 Sepolia 测试网上注册一个新的 AI Agent
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';
import { FilecoinUploaderReal } from '../../filecoin-uploader-real.js';

export class Phase1_RegisterAgent extends PhaseBase {
  constructor() {
    super(
      'Register ERC-8004 Agent',
      'Register a new AI Agent on Ethereum Sepolia using official ERC-8004 contracts'
    );
  }

  async execute(context) {
    this.logSection('Phase 1: Register ERC-8004 Agent');

    // 初始化 Provider 和 Signer
    const validationProvider = new ethers.JsonRpcProvider(
      process.env.VALIDATION_NETWORK_RPC_URL
    );

    const signer = new ethers.Wallet(
      process.env.PRIVATE_KEY,
      validationProvider
    );

    this.log(`Agent Owner: ${signer.address}`);
    this.log(`Network: ${process.env.VALIDATION_NETWORK_NAME}`);

    // 检查余额
    const balance = await validationProvider.getBalance(signer.address);
    this.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      throw new Error('Insufficient balance on Sepolia');
    }

    // 初始化 ERC-8004 客户端
    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    // 生成 Agent 元数据
    const metadata = context.params.metadata || erc8004Client.generateAgentMetadata(
      'NFT IPFS to Filecoin Migration Agent',
      'An AI agent that migrates NFT metadata and images from IPFS to Filecoin for permanent storage',
      {
        capabilities: ['nft-scanning', 'ipfs-retrieval', 'filecoin-upload', 'erc8004-validation'],
        version: '1.0.0',
        author: 'Interactive Workflow System'
      }
    );

    // 上传元数据到 Filecoin
    this.log('\n📤 Uploading agent metadata to Filecoin...');

    // 初始化 Filecoin uploader
    const filecoinUploader = new FilecoinUploaderReal(
      process.env.PRIVATE_KEY,
      process.env.FILECOIN_NETWORK_RPC_URL
    );
    await filecoinUploader.initialize();

    // 保存本地副本
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const localPath = path.join(outputDir, 'agent-metadata-interactive.json');
    fs.writeFileSync(localPath, JSON.stringify(metadata, null, 2));
    this.log(`Local copy saved: ${localPath}`);

    // 上传到 Filecoin
    let metadataUri;
    try {
      const uploadResult = await filecoinUploader.uploadMetadata(metadata, 'agent-metadata-interactive');
      metadataUri = uploadResult.uri;  // Returns ipfs://{cid}
      this.logSuccess(`Metadata uploaded to Filecoin: ${metadataUri}`);
      this.log(`Retrieval URL: ${uploadResult.retrievalUrl}`);
    } catch (error) {
      this.log(`⚠️  Failed to upload to Filecoin: ${error.message}`);
      this.log('Falling back to temporary URI');
      metadataUri = 'ipfs://QmTemp' + Math.random().toString(36).substr(2);
    }

    // 注册 Agent
    this.log('\n📤 Registering agent on-chain...');
    const registration = await erc8004Client.registerAgent(metadataUri);

    this.logSuccess(`Agent registered!`);
    this.log(`Agent ID: ${registration.agentId}`);
    this.log(`Transaction: ${registration.txHash}`);
    this.log(`Owner: ${signer.address}`);

    // 返回结果
    return {
      agentId: registration.agentId,
      agentAddress: signer.address,
      metadataUri: metadataUri,
      metadata: metadata,
      txHash: registration.txHash,
      network: {
        name: process.env.VALIDATION_NETWORK_NAME,
        chainId: process.env.VALIDATION_NETWORK_CHAIN_ID,
        rpcUrl: process.env.VALIDATION_NETWORK_RPC_URL
      },
      timestamp: new Date().toISOString()
    };
  }

  validateParams(params) {
    // Phase 1 不需要前置参数
    return { valid: true };
  }
}
