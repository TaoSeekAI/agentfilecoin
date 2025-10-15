#!/usr/bin/env node

/**
 * Create a new validator wallet for ERC-8004 validation
 */

import { ethers } from 'ethers';

console.log('\n================================================================================');
console.log('🔐 创建新的验证者钱包地址');
console.log('================================================================================\n');

// Create random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ 钱包创建成功！\n');

console.log('📍 地址 (Address):');
console.log('   ' + wallet.address);

console.log('\n🔑 私钥 (Private Key):');
console.log('   ' + wallet.privateKey);

console.log('\n📝 助记词 (Mnemonic):');
console.log('   ' + wallet.mnemonic.phrase);

console.log('\n================================================================================');
console.log('⚠️  重要提示：');
console.log('   1. 请妥善保管私钥和助记词！');
console.log('   2. 请向此地址发送 Sepolia 测试币');
console.log('   3. 测试币到账后，我会配置此地址作为验证者');
console.log('================================================================================\n');

console.log('💰 获取 Sepolia 测试币的方法：');
console.log('   - Alchemy Faucet: https://sepoliafaucet.com/');
console.log('   - Infura Faucet: https://www.infura.io/faucet/sepolia');
console.log('   - 或使用任何其他 Sepolia 水龙头\n');

console.log('================================================================================\n');
