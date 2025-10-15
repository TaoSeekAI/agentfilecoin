/**
 * Setup Test Script
 * Verifies configuration and network connectivity before running full demo
 */

import 'dotenv/config';
import { ethers } from 'ethers';

const CONFIG = {
  rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.org',
  privateKey: process.env.PRIVATE_KEY,
  chainId: parseInt(process.env.CHAIN_ID || '11155111'),
  identityContract: process.env.AGENT_IDENTITY_ADDRESS,
  validationContract: process.env.AGENT_VALIDATION_ADDRESS,
  nftContract: process.env.NFT_CONTRACT_ADDRESS,
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

  // Test 2: RPC connectivity
  console.log('\n2️⃣  Testing RPC connectivity...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const network = await provider.getNetwork();
    console.log(`   ✅ Connected to network: ${network.name || 'unknown'} (Chain ID: ${network.chainId})`);

    if (Number(network.chainId) !== CONFIG.chainId) {
      console.warn(`   ⚠️  Chain ID mismatch: expected ${CONFIG.chainId}, got ${network.chainId}`);
    }
    passed++;
  } catch (error) {
    console.error('   ❌ RPC connection failed:', error.message);
    failed++;
    return { passed, failed };
  }

  // Test 3: Wallet
  console.log('\n3️⃣  Checking wallet...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const signer = new ethers.Wallet(CONFIG.privateKey, provider);
    console.log(`   ✅ Wallet address: ${signer.address}`);

    const balance = await provider.getBalance(signer.address);
    console.log(`   💰 Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn('   ⚠️  Balance is low. Consider getting more test ETH from faucet.');
    }
    passed++;
  } catch (error) {
    console.error('   ❌ Wallet check failed:', error.message);
    failed++;
    return { passed, failed };
  }

  // Test 4: ERC-8004 contracts
  console.log('\n4️⃣  Verifying ERC-8004 contracts...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);

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
    console.error('   ❌ Contract verification failed:', error.message);
    failed++;
  }

  // Test 5: NFT contract
  console.log('\n5️⃣  Checking NFT contract...');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const nftContract = new ethers.Contract(CONFIG.nftContract, ERC721_ABI, provider);

    const name = await nftContract.name();
    const symbol = await nftContract.symbol();

    console.log(`   ✅ NFT contract at ${CONFIG.nftContract}`);
    console.log(`   📋 Name: ${name}`);
    console.log(`   📋 Symbol: ${symbol}`);
    passed++;
  } catch (error) {
    console.error('   ❌ NFT contract check failed:', error.message);
    console.error('   Make sure the address is correct and the contract is ERC-721');
    failed++;
  }

  // Test 6: IPFS gateway
  console.log('\n6️⃣  Testing IPFS gateway...');
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
