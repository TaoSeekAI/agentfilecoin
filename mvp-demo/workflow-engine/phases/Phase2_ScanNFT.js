/**
 * Phase 2: Scan NFT Project
 * 扫描 NFT 合约，提取 IPFS CID
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { NFTScanner } from '../../nft-scanner.js';

export class Phase2_ScanNFT extends PhaseBase {
  constructor() {
    super(
      'Scan NFT Project',
      'Scan NFT contract on Ethereum Mainnet and extract IPFS CIDs from metadata'
    );
  }

  async execute(context) {
    this.logSection('Phase 2: Scan NFT Project');

    // 需要 Phase 1 完成
    if (!context.phase1Result) {
      throw new Error('Phase 1 must be completed first');
    }

    // 初始化 NFT 网络 Provider
    const nftProvider = new ethers.JsonRpcProvider(
      process.env.NFT_NETWORK_RPC_URL
    );

    // 配置
    const nftContract = context.params.nftContract || process.env.NFT_CONTRACT_ADDRESS;
    const startTokenId = context.params.startTokenId || parseInt(process.env.NFT_START_TOKEN_ID);
    const endTokenId = context.params.endTokenId || parseInt(process.env.NFT_END_TOKEN_ID);

    this.log(`Contract: ${nftContract}`);
    this.log(`Token Range: ${startTokenId} - ${endTokenId}`);
    this.log(`Network: ${process.env.NFT_NETWORK_NAME}`);

    // 初始化 Scanner (contractAddress, provider, ipfsGateway)
    const scanner = new NFTScanner(nftContract, nftProvider, process.env.IPFS_GATEWAY);

    // 扫描 NFT
    this.log('\n📡 Scanning NFT project...');
    const scanResult = await scanner.scan(startTokenId, endTokenId);

    this.logSuccess(`Scanned ${scanResult.scanResults.summary.total} tokens`);
    this.log(`Unique IPFS CIDs: ${scanResult.uniqueCIDs.length}`);

    // 显示 CID 列表
    if (scanResult.uniqueCIDs.length > 0) {
      this.log('\n📦 IPFS CIDs found:');
      scanResult.uniqueCIDs.forEach((cid, index) => {
        this.log(`   ${index + 1}. ${cid}`);
      });
    }

    return {
      contractInfo: scanResult.contractInfo,
      scanSummary: scanResult.scanResults.summary,
      uniqueCIDs: scanResult.uniqueCIDs,
      tokenDetails: scanResult.scanResults.results,
      scannedRange: {
        start: startTokenId,
        end: endTokenId
      },
      timestamp: new Date().toISOString()
    };
  }

  validateParams(params) {
    const errors = [];

    if (params.nftContract && !ethers.isAddress(params.nftContract)) {
      errors.push('Invalid NFT contract address');
    }

    if (params.startTokenId !== undefined && params.startTokenId < 0) {
      errors.push('Invalid start token ID');
    }

    if (params.endTokenId !== undefined && params.endTokenId < 0) {
      errors.push('Invalid end token ID');
    }

    if (params.startTokenId !== undefined && params.endTokenId !== undefined) {
      if (params.startTokenId > params.endTokenId) {
        errors.push('Start token ID must be <= end token ID');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
