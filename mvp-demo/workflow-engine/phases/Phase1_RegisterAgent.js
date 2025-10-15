/**
 * Phase 1: Register ERC-8004 Agent
 * 在 Sepolia 测试网上注册一个新的 AI Agent
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';

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

    // 注册 Agent
    this.log('\n📤 Registering agent on-chain...');

    // 保存元数据到临时文件
    const metadataUri = 'ipfs://QmTemp' + Math.random().toString(36).substr(2);

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
