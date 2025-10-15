/**
 * Generate New Wallet for Filecoin Testing
 */

import { ethers } from 'ethers';

console.log('🔑 Generating New Wallet for Filecoin Calibration Testnet\n');
console.log('='.repeat(80));

// Generate new wallet
const wallet = ethers.Wallet.createRandom();

console.log('\n✅ New Wallet Generated!\n');
console.log('📋 Wallet Details:');
console.log('='.repeat(80));
console.log(`Address: ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
console.log(`Mnemonic: ${wallet.mnemonic.phrase}`);
console.log('='.repeat(80));

console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
console.log('   This is a test wallet for Filecoin Calibration testnet only.\n');

console.log('📝 Next Steps:');
console.log('='.repeat(80));
console.log('1. Update your .env file with the new PRIVATE_KEY');
console.log('2. Get test FIL from: https://faucet.calibration.fildev.network/');
console.log(`   Wallet Address: ${wallet.address}`);
console.log('3. Get test USDFC from the faucet or community');
console.log('4. Run: node setup-and-upload-real.js');
console.log('='.repeat(80));

console.log('\n🔧 .env Configuration:');
console.log('='.repeat(80));
console.log('Add this to your .env file:');
console.log('');
console.log(`PRIVATE_KEY=${wallet.privateKey}`);
console.log('FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1');
console.log('FILECOIN_NETWORK_CHAIN_ID=314159');
console.log('FILECOIN_NETWORK_NAME=Filecoin Calibration Testnet');
console.log('='.repeat(80));
