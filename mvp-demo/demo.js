/**
 * NFT IPFS to Filecoin Migration Demo
 * Complete MVP workflow integrating:
 * - NFT scanning
 * - IPFS to Filecoin migration via Synapse SDK
 * - ERC-8004 Agent Identity & Validation
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { NFTScanner } from './nft-scanner.js';
import { FilecoinUploader } from './filecoin-uploader.js';
import { ERC8004Client } from './erc8004-client.js';

// Configuration
const CONFIG = {
  rpcUrl: process.env.RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
  privateKey: process.env.PRIVATE_KEY,
  chainId: parseInt(process.env.CHAIN_ID || '314159'),

  // Contract addresses
  identityContract: process.env.AGENT_IDENTITY_ADDRESS,
  reputationContract: process.env.AGENT_REPUTATION_ADDRESS,
  validationContract: process.env.AGENT_VALIDATION_ADDRESS,

  // NFT configuration
  nftContract: process.env.NFT_CONTRACT_ADDRESS,
  startTokenId: parseInt(process.env.NFT_START_TOKEN_ID || '1'),
  endTokenId: parseInt(process.env.NFT_END_TOKEN_ID || '10'),

  // IPFS gateway
  ipfsGateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',

  // Output
  outputDir: './output',
  downloadsDir: './downloads'
};

/**
 * Setup proxy if configured
 */
function setupProxy() {
  if (process.env.HTTP_PROXY) {
    process.env.http_proxy = process.env.HTTP_PROXY;
    process.env.https_proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    console.log('📡 Proxy configured');
  }
}

/**
 * Validate configuration
 */
function validateConfig() {
  console.log('\n🔧 Validating Configuration...');
  console.log('=' .repeat(80));

  const required = [
    'privateKey',
    'identityContract',
    'validationContract',
    'nftContract'
  ];

  const missing = required.filter(key => !CONFIG[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }

  console.log('✅ Configuration valid');
  console.log(`   Network: ${CONFIG.rpcUrl}`);
  console.log(`   Chain ID: ${CONFIG.chainId}`);
  console.log(`   NFT Contract: ${CONFIG.nftContract}`);
  console.log(`   Token Range: ${CONFIG.startTokenId} - ${CONFIG.endTokenId}`);
}

/**
 * Initialize ethers provider and signer
 */
function initializeEthers() {
  console.log('\n🔐 Initializing Ethers...');

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const signer = new ethers.Wallet(CONFIG.privateKey, provider);

  console.log(`✅ Wallet: ${signer.address}`);

  return { provider, signer };
}

/**
 * Save metadata to file and return URI
 */
function saveMetadata(metadata, filename) {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const filepath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));

  console.log(`   Saved: ${filepath}`);

  // In production, this would be uploaded to IPFS/Filecoin
  // For MVP, we'll use a local file:// URI or simulate ipfs://
  return `file://${path.resolve(filepath)}`;
}

/**
 * Main MVP workflow
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 NFT IPFS to Filecoin Migration MVP');
  console.log('    ERC-8004 Agent Integration Demo');
  console.log('='.repeat(80));

  setupProxy();
  validateConfig();

  const { provider, signer } = initializeEthers();

  try {
    // Check balance
    console.log('\n💰 Checking Balance...');
    const balance = await provider.getBalance(signer.address);

    // Determine network name and currency
    const networkInfo = {
      11155111: { name: 'Sepolia', currency: 'ETH', faucet: 'https://sepoliafaucet.com/' },
      314159: { name: 'Calibration', currency: 'FIL', faucet: 'https://faucet.calibration.fildev.network/' },
      84532: { name: 'Base Sepolia', currency: 'ETH', faucet: 'https://docs.base.org/tools/network-faucets' },
      11155420: { name: 'Optimism Sepolia', currency: 'ETH', faucet: 'https://app.optimism.io/faucet' }
    };

    const network = networkInfo[CONFIG.chainId] || { name: 'Unknown', currency: 'ETH', faucet: 'N/A' };

    console.log(`   Network: ${network.name}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ${network.currency}`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn(`\n⚠️  Warning: Low balance. Get test ${network.currency} from:`);
      console.warn(`   ${network.faucet}`);
    }

    // ========================================================================
    // PHASE 1: Initialize clients
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1: Initialize Clients');
    console.log('='.repeat(80));

    const nftScanner = new NFTScanner(
      CONFIG.nftContract,
      provider,
      CONFIG.ipfsGateway
    );

    const filecoinUploader = new FilecoinUploader(
      CONFIG.privateKey,
      CONFIG.rpcUrl
    );

    const erc8004Client = new ERC8004Client(
      provider,
      signer,
      CONFIG.identityContract,
      CONFIG.validationContract
    );

    // ========================================================================
    // PHASE 2: Register ERC-8004 Agent
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: Register ERC-8004 Agent');
    console.log('='.repeat(80));

    const agentMetadata = erc8004Client.generateAgentMetadata(
      'NFT Migration Agent',
      'Automated agent for migrating NFT metadata from IPFS to Filecoin',
      [],
      ['nft-scanning', 'ipfs-migration', 'filecoin-storage']
    );

    const agentMetadataURI = saveMetadata(agentMetadata, 'agent-metadata.json');

    const agentRegistration = await erc8004Client.registerAgent(agentMetadataURI);
    const agentId = agentRegistration.agentId;

    console.log('\n📊 Agent Registration Result:');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${agentRegistration.owner}`);
    console.log(`   TX: ${agentRegistration.txHash}`);

    // ========================================================================
    // PHASE 3: Scan NFT Project
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 3: Scan NFT Project');
    console.log('='.repeat(80));

    const scanResult = await nftScanner.scan(
      CONFIG.startTokenId,
      CONFIG.endTokenId
    );

    const uniqueCIDs = scanResult.uniqueCIDs;

    if (uniqueCIDs.length === 0) {
      console.error('\n❌ No IPFS CIDs found. Cannot proceed.');
      process.exit(1);
    }

    // Save scan results
    const scanReport = {
      contractInfo: scanResult.contractInfo,
      scanTime: new Date().toISOString(),
      tokenRange: {
        start: CONFIG.startTokenId,
        end: CONFIG.endTokenId
      },
      summary: scanResult.scanResults.summary,
      uniqueCIDs,
      tokens: scanResult.scanResults.results
    };

    saveMetadata(scanReport, 'nft-scan-report.json');

    // ========================================================================
    // PHASE 4: Create ERC-8004 Validation Request
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 4: Create ERC-8004 Validation Request');
    console.log('='.repeat(80));

    const taskMetadata = erc8004Client.generateTaskMetadata(
      `Migrate ${uniqueCIDs.length} IPFS CIDs from NFT project to Filecoin`,
      CONFIG.nftContract,
      { start: CONFIG.startTokenId, end: CONFIG.endTokenId },
      uniqueCIDs
    );

    const taskURI = saveMetadata(taskMetadata, 'task-metadata.json');

    const validationRequest = await erc8004Client.createValidationRequest(
      agentId,
      taskURI
    );

    const requestId = validationRequest.requestId;

    console.log('\n📊 Validation Request Result:');
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   TX: ${validationRequest.txHash}`);

    // ========================================================================
    // PHASE 5: Migrate IPFS to Filecoin
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 5: Migrate IPFS to Filecoin');
    console.log('='.repeat(80));

    const migrationResult = await filecoinUploader.batchMigrate(
      uniqueCIDs,
      CONFIG.ipfsGateway,
      2000 // 2 second delay between uploads
    );

    // Save migration results
    const migrationReport = filecoinUploader.generateReport();
    saveMetadata(migrationReport, 'migration-report.json');

    // ========================================================================
    // PHASE 6: Submit Proof to ERC-8004
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 6: Submit Proof to ERC-8004');
    console.log('='.repeat(80));

    const proofMetadata = erc8004Client.generateProofMetadata(
      taskURI,
      migrationResult.results
    );

    const proofURI = saveMetadata(proofMetadata, 'proof-metadata.json');

    const proofSubmission = await erc8004Client.submitProof(requestId, proofURI);

    console.log('\n📊 Proof Submission Result:');
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Proof URI: ${proofURI}`);
    console.log(`   TX: ${proofSubmission.txHash}`);

    // ========================================================================
    // PHASE 7: Approve Validation (self-validation for MVP)
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 7: Approve Validation');
    console.log('='.repeat(80));

    console.log('\n⏳ Waiting 3 seconds before approval...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const approval = await erc8004Client.approveValidation(requestId);

    console.log('\n📊 Approval Result:');
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Approved: ${approval.approved}`);
    console.log(`   TX: ${approval.txHash}`);

    // ========================================================================
    // PHASE 8: Verify and Generate Final Report
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 8: Verify and Generate Final Report');
    console.log('='.repeat(80));

    // Query final agent state
    const finalAgentState = await erc8004Client.getAgent(agentId);

    // Query final validation state
    const finalValidationState = await erc8004Client.getValidationRequest(requestId);

    // Generate final report
    const finalReport = {
      title: 'NFT IPFS to Filecoin Migration - Complete Report',
      timestamp: new Date().toISOString(),
      network: {
        rpcUrl: CONFIG.rpcUrl,
        chainId: CONFIG.chainId
      },
      contracts: {
        identity: CONFIG.identityContract,
        validation: CONFIG.validationContract,
        nft: CONFIG.nftContract
      },
      agent: {
        id: agentId,
        owner: finalAgentState.owner,
        metadataURI: finalAgentState.metadataURI,
        isActive: finalAgentState.isActive,
        registrationTx: agentRegistration.txHash
      },
      validation: {
        requestId,
        status: finalValidationState.status,
        taskURI: finalValidationState.taskURI,
        proofURI: finalValidationState.proofURI,
        createdAt: new Date(finalValidationState.createdAt * 1000).toISOString(),
        requestTx: validationRequest.txHash,
        proofTx: proofSubmission.txHash,
        approvalTx: approval.txHash
      },
      nftScan: {
        contract: scanResult.contractInfo,
        tokenRange: { start: CONFIG.startTokenId, end: CONFIG.endTokenId },
        summary: scanResult.scanResults.summary,
        uniqueCIDsFound: uniqueCIDs.length
      },
      migration: {
        totalCIDs: migrationResult.summary.total,
        successful: migrationResult.summary.successful,
        failed: migrationResult.summary.failed,
        successRate: migrationResult.summary.successRate.toFixed(2) + '%',
        results: migrationResult.results
      },
      filesGenerated: [
        'agent-metadata.json',
        'task-metadata.json',
        'proof-metadata.json',
        'nft-scan-report.json',
        'migration-report.json',
        'final-report.json'
      ]
    };

    const finalReportPath = saveMetadata(finalReport, 'final-report.json');

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 MVP DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`   ERC-8004 Agent ID: ${agentId}`);
    console.log(`   Validation Request ID: ${requestId}`);
    console.log(`   Validation Status: ${finalValidationState.status}`);
    console.log(`   NFT Contract: ${CONFIG.nftContract}`);
    console.log(`   Tokens Scanned: ${scanResult.scanResults.summary.total}`);
    console.log(`   Unique IPFS CIDs: ${uniqueCIDs.length}`);
    console.log(`   Migrated to Filecoin: ${migrationResult.summary.successful}/${migrationResult.summary.total}`);
    console.log(`   Success Rate: ${migrationResult.summary.successRate.toFixed(1)}%`);

    console.log('\n📁 Output Files:');
    console.log(`   Reports: ${CONFIG.outputDir}/`);
    console.log(`   Downloads: ${CONFIG.downloadsDir}/`);

    console.log('\n🔗 Transactions:');
    console.log(`   Agent Registration: ${agentRegistration.txHash}`);
    console.log(`   Validation Request: ${validationRequest.txHash}`);
    console.log(`   Proof Submission: ${proofSubmission.txHash}`);
    console.log(`   Validation Approval: ${approval.txHash}`);

    console.log('\n✅ All data saved to: ' + path.resolve(CONFIG.outputDir));

    console.log('\n' + '='.repeat(80));
    console.log('💡 ERC-8004 Value Demonstrated:');
    console.log('   ✅ Decentralized Identity - Agent registered on-chain');
    console.log('   ✅ Work Validation - Task and proof recorded immutably');
    console.log('   ✅ Trust Layer - Verifiable migration results');
    console.log('   ✅ Composability - Other agents can verify this work');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error during execution:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
