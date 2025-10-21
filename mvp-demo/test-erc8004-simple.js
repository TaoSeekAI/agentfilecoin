#!/usr/bin/env node
/**
 * 简化的 ERC-8004 验证测试
 * 演示完整的验证流程
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  console.log('\n🧪 ERC-8004 验证流程测试');
  console.log('═'.repeat(70));

  try {
    // 1. 连接 Sepolia 测试网
    console.log('\n📡 连接 Sepolia 测试网...');
    const provider = new ethers.JsonRpcProvider(
      process.env.VALIDATION_NETWORK_RPC_URL,
      undefined,
      { staticNetwork: true }
    );

    const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);

    console.log(`   地址: ${address}`);
    console.log(`   余额: ${ethers.formatEther(balance)} ETH`);

    // 2. 初始化 ERC-8004 客户端
    console.log('\n🔧 初始化 ERC-8004 客户端...');
    const client = new ERC8004Client(
      provider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );
    console.log(`   Identity 合约: ${process.env.AGENT_IDENTITY_ADDRESS}`);
    console.log(`   Validation 合约: ${process.env.AGENT_VALIDATION_ADDRESS}`);

    // 3. 生成 Agent 元数据
    console.log('\n📋 生成 Agent 元数据...');
    const agentMetadata = client.generateAgentMetadata(
      'NFT Migration Agent v1.0',
      'AI Agent for migrating NFT metadata from IPFS to Filecoin',
      ['https://api.nft-migration.example.com'],
      ['nft-scan', 'filecoin-upload', 'metadata-migration', 'erc8004-validation']
    );
    console.log('   元数据:', JSON.stringify(agentMetadata, null, 2));

    // 模拟上传到 IPFS（实际应该调用 IPFS API）
    const agentMetadataURI = 'ipfs://QmAgentMetadataExample12345';
    console.log(`   元数据 URI: ${agentMetadataURI}`);

    // 4. 注册 Agent
    console.log('\n📝 注册 Agent...');
    console.log('   注意: 这将发送真实的区块链交易！');
    console.log('   继续将消耗少量 Sepolia ETH...');

    const registration = await client.registerAgent(agentMetadataURI);

    console.log('\n✅ Agent 注册成功！');
    console.log(`   Agent ID: ${registration.agentId}`);
    console.log(`   交易哈希: ${registration.txHash}`);
    console.log(`   区块号: ${registration.blockNumber}`);

    // 5. 查询 Agent 信息（验证注册）
    console.log('\n🔍 查询 Agent 信息...');
    const agentInfo = await client.getAgent(registration.agentId);
    console.log('   验证通过: Agent 已成功注册');

    // 6. 生成任务元数据
    console.log('\n📋 生成任务元数据...');
    const taskMetadata = client.generateTaskMetadata(
      'Migrate Azuki NFT #0-#4 from IPFS to Filecoin',
      '0xED5AF388653567Af2F388E6224dC7C4b3241C544', // Azuki contract
      { start: 0, end: 4 },
      [
        'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4', // metadata CID
        'QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg'  // image CID
      ]
    );
    console.log('   任务:', taskMetadata.task);
    console.log('   NFT 合约:', taskMetadata.nftContract);
    console.log('   Token 范围: #', taskMetadata.tokenRange.start, '-', taskMetadata.tokenRange.end);

    // 模拟上传任务元数据到 IPFS
    const taskURI = 'ipfs://QmTaskMetadataExample12345';
    console.log(`   任务 URI: ${taskURI}`);

    // 7. 创建验证请求
    console.log('\n📝 创建验证请求...');
    const validationRequest = await client.createValidationRequest(
      registration.agentId,
      taskURI,
      address // 使用自己的地址作为验证者
    );

    console.log('\n✅ 验证请求已创建！');
    console.log(`   Request Hash: ${validationRequest.requestHash}`);
    console.log(`   交易哈希: ${validationRequest.txHash}`);
    console.log(`   区块号: ${validationRequest.blockNumber}`);

    // 8. 模拟执行迁移任务
    console.log('\n🔄 模拟 NFT 迁移过程...');
    console.log('   （实际应该使用 MCP upload_to_filecoin 工具）');

    const migrationResults = [
      {
        ipfsCid: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/0',
        filecoinPieceCid: 'bafkzcibeucad6ecm43isurbsfynxklsgkoq6bsphu2lk5ntez4vtlqk3hhw6zcccbu',
        filecoinCarCid: 'bagaexample1',
        success: true
      },
      {
        ipfsCid: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/1',
        filecoinPieceCid: 'bafkzexample2',
        filecoinCarCid: 'bagaexample2',
        success: true
      },
      {
        ipfsCid: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/2',
        filecoinPieceCid: 'bafkzexample3',
        filecoinCarCid: 'bagaexample3',
        success: true
      },
      {
        ipfsCid: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/3',
        filecoinPieceCid: 'bafkzexample4',
        filecoinCarCid: 'bagaexample4',
        success: true
      },
      {
        ipfsCid: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/4',
        filecoinPieceCid: 'bafkzexample5',
        filecoinCarCid: 'bagaexample5',
        success: true
      }
    ];

    console.log(`   迁移完成: ${migrationResults.length} 个 NFT`);
    console.log(`   成功率: ${(migrationResults.filter(r => r.success).length / migrationResults.length * 100).toFixed(0)}%`);

    // 9. 生成证明元数据
    console.log('\n📋 生成证明元数据...');
    const proofMetadata = client.generateProofMetadata(taskURI, migrationResults);
    console.log('   证明类型:', proofMetadata.proof.type);
    console.log('   总计:', proofMetadata.proof.summary.total);
    console.log('   成功:', proofMetadata.proof.summary.successful);
    console.log('   失败:', proofMetadata.proof.summary.failed);
    console.log('   成功率:', proofMetadata.proof.summary.successRate, '%');

    // 模拟上传证明到 IPFS
    const proofURI = 'ipfs://QmProofMetadataExample12345';
    console.log(`   证明 URI: ${proofURI}`);

    // 10. 提交验证结果
    console.log('\n📤 提交验证结果...');
    const validation = await client.submitValidation(
      validationRequest.requestHash,
      true, // 迁移成功
      proofURI
    );

    console.log('\n✅ 验证结果已提交！');
    console.log(`   交易哈希: ${validation.txHash}`);
    console.log(`   区块号: ${validation.blockNumber}`);

    // 11. 查询验证状态（最终验证）
    console.log('\n🔍 查询最终验证状态...');
    const finalStatus = await client.getValidationRequest(validationRequest.requestHash);

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 ERC-8004 验证流程完成！');
    console.log('═'.repeat(70));

    console.log('\n📊 最终验证结果:');
    console.log(`   Request Hash: ${finalStatus.requestHash}`);
    console.log(`   Agent ID: ${finalStatus.agentId}`);
    console.log(`   状态: ${finalStatus.status}`);
    console.log(`   验证通过: ${finalStatus.isValid ? '✅ 是' : '❌ 否'}`);
    console.log(`   证明 URI: ${finalStatus.proofURI}`);
    console.log(`   请求者: ${finalStatus.requester}`);
    console.log(`   验证者: ${finalStatus.validator}`);

    console.log('\n🔗 链上查询:');
    console.log(`   Agent (Identity): https://sepolia.etherscan.io/token/${process.env.AGENT_IDENTITY_ADDRESS}?a=${finalStatus.agentId}`);
    console.log(`   Validation Tx: https://sepolia.etherscan.io/tx/${validation.txHash}`);

    console.log('\n✅ 所有测试通过！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
