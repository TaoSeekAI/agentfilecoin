/**
 * Setup Test Script
 * Verifies configuration and network connectivity before running full demo
 */

import 'dotenv/config';
import { ethers } from 'ethers';

const CONFIG = {
  // NFT Network (typically Mainnet)
  nftNetwork: {
    rpcUrl: process.env.NFT_NETWORK_RPC_URL || process.env.RPC_URL || 'https://eth.llamarpc.com',
    chainId: parseInt(process.env.NFT_NETWORK_CHAIN_ID || '1'),
    name: 'NFT Network (Mainnet)',
  },
  // Validation Network (typically Sepolia)
  validationNetwork: {
    rpcUrl: process.env.VALIDATION_NETWORK_RPC_URL || process.env.RPC_URL || 'https://rpc.sepolia.org',
    chainId: parseInt(process.env.VALIDATION_NETWORK_CHAIN_ID || process.env.CHAIN_ID || '11155111'),
    name: 'Validation Network (Sepolia)',
  },
  // Shared configuration
  privateKey: process.env.PRIVATE_KEY,
  identityContract: process.env.AGENT_IDENTITY_ADDRESS,
  validationContract: process.env.AGENT_VALIDATION_ADDRESS,
  nftContract: process.env.NFT_CONTRACT_ADDRESS,
  // Proxy configuration
  httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
};

const ERC721_ABI = ['function name() view returns (string)', 'function symbol() view returns (string)'];
const IDENTITY_ABI = ['function registrationFee() external view returns (uint256)'];

async function testSetup() {
  console.log('\n🧪 Testing MVP Setup...');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Environment variables
  console.log('\n1️⃣  Checking environment variables...');
  const requiredVars = ['PRIVATE_KEY', 'AGENT_IDENTITY_ADDRESS', 'AGENT_VALIDATION_ADDRESS', 'NFT_CONTRACT_ADDRESS'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('   ❌ Missing variables:', missing.join(', '));
    console.error('   Please check your .env file');
    failed++;
  } else {
    console.log('   ✅ All required variables present');
    passed++;
  }

  // Test 2: NFT Network connectivity
  console.log('\n2️⃣  Testing NFT Network (Mainnet) connectivity...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.nftNetwork.rpcUrl);
    const network = await provider.getNetwork();
    console.log(`   ✅ Connected to ${CONFIG.nftNetwork.name}`);
    console.log(`   📋 Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== CONFIG.nftNetwork.chainId) {
      console.warn(`   ⚠️  Chain ID mismatch: expected ${CONFIG.nftNetwork.chainId}, got ${network.chainId}`);
    }
    passed++;
  } catch (error) {
    console.error(`   ❌ NFT Network connection failed: ${error.message}`);
    console.error(`   RPC URL: ${CONFIG.nftNetwork.rpcUrl}`);
    if (CONFIG.httpProxy) {
      console.error(`   Proxy configured: ${CONFIG.httpProxy}`);
    }
    failed++;
  }

  // Test 3: Validation Network connectivity
  console.log('\n3️⃣  Testing Validation Network (Sepolia) connectivity...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.validationNetwork.rpcUrl);
    const network = await provider.getNetwork();
    console.log(`   ✅ Connected to ${CONFIG.validationNetwork.name}`);
    console.log(`   📋 Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== CONFIG.validationNetwork.chainId) {
      console.warn(`   ⚠️  Chain ID mismatch: expected ${CONFIG.validationNetwork.chainId}, got ${network.chainId}`);
    }
    passed++;
  } catch (error) {
    console.error(`   ❌ Validation Network connection failed: ${error.message}`);
    console.error(`   RPC URL: ${CONFIG.validationNetwork.rpcUrl}`);
    if (CONFIG.httpProxy) {
      console.error(`   Proxy configured: ${CONFIG.httpProxy}`);
    }
    failed++;
    return { passed, failed };
  }

  // Test 4: Wallet balance on Sepolia
  console.log('\n4️⃣  Checking wallet balance on Sepolia...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.validationNetwork.rpcUrl);
    const signer = new ethers.Wallet(CONFIG.privateKey, provider);
    console.log(`   ✅ Wallet address: ${signer.address}`);

    const balance = await provider.getBalance(signer.address);
    console.log(`   💰 Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn('   ⚠️  Balance is low. Consider getting more test ETH from faucet.');
      console.warn('   Sepolia faucet: https://sepoliafaucet.com/');
    }
    passed++;
  } catch (error) {
    console.error('   ❌ Wallet check failed:', error.message);
    failed++;
    return { passed, failed };
  }

  // Test 5: ERC-8004 contracts on Sepolia
  console.log('\n5️⃣  Verifying ERC-8004 contracts on Sepolia...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.validationNetwork.rpcUrl);

    // Check Identity contract
    const identityContract = new ethers.Contract(CONFIG.identityContract, IDENTITY_ABI, provider);
    const fee = await identityContract.registrationFee();
    console.log(`   ✅ Identity contract at ${CONFIG.identityContract}`);
    console.log(`   📋 Registration fee: ${ethers.formatEther(fee)} ETH`);

    // Check Validation contract (just check bytecode exists)
    const validationCode = await provider.getCode(CONFIG.validationContract);
    if (validationCode === '0x') {
      console.error(`   ❌ Validation contract not found at ${CONFIG.validationContract}`);
      failed++;
    } else {
      console.log(`   ✅ Validation contract at ${CONFIG.validationContract}`);
      passed++;
    }
  } catch (error) {
    console.error('   ❌ Contract verification failed on Sepolia:', error.message);
    failed++;
  }

  // Test 6: NFT contract on Mainnet (read-only)
  console.log('\n6️⃣  Checking NFT contract on Mainnet (read-only)...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.nftNetwork.rpcUrl);
    const nftContract = new ethers.Contract(CONFIG.nftContract, ERC721_ABI, provider);

    const name = await nftContract.name();
    const symbol = await nftContract.symbol();

    console.log(`   ✅ NFT contract at ${CONFIG.nftContract}`);
    console.log(`   📋 Name: ${name}`);
    console.log(`   📋 Symbol: ${symbol}`);
    console.log(`   📋 Network: ${CONFIG.nftNetwork.name}`);
    passed++;
  } catch (error) {
    console.error('   ❌ NFT contract check failed on Mainnet:', error.message);
    console.error('   Make sure the address is correct and the contract is ERC-721');
    console.error(`   Network: ${CONFIG.nftNetwork.rpcUrl}`);
    failed++;
  }

  // Test 7: IPFS gateway
  console.log('\n7️⃣  Testing IPFS gateway...');
  try {
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // Popular test CID
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    const url = `${gateway}${testCid}`;

    console.log(`   Testing: ${url}`);
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });

    if (response.ok) {
      console.log('   ✅ IPFS gateway accessible');
      passed++;
    } else {
      console.warn('   ⚠️  IPFS gateway returned:', response.status);
      console.warn('   You may need to use a different gateway');
      passed++;
    }
  } catch (error) {
    console.error('   ❌ IPFS gateway test failed:', error.message);
    console.error('   Consider configuring HTTP_PROXY or using alternative gateway');
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  console.log('\n📋 Network Configuration:');
  console.log(`   NFT Network:        ${CONFIG.nftNetwork.name}`);
  console.log(`   NFT RPC URL:        ${CONFIG.nftNetwork.rpcUrl}`);
  console.log(`   NFT Chain ID:       ${CONFIG.nftNetwork.chainId}`);
  console.log(`   Validation Network: ${CONFIG.validationNetwork.name}`);
  console.log(`   Validation RPC URL: ${CONFIG.validationNetwork.rpcUrl}`);
  console.log(`   Validation Chain:   ${CONFIG.validationNetwork.chainId}`);
  if (CONFIG.httpProxy) {
    console.log(`   HTTP Proxy:         ${CONFIG.httpProxy}`);
  }
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! You can now run:');
    console.log('   npm run demo');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above before running demo.');
    process.exit(1);
  }

  return { passed, failed };
}

testSetup().catch(console.error);
