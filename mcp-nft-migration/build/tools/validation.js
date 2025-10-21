import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MVP_DEMO_PATH = path.resolve(__dirname, '../../../mvp-demo');
/**
 * ERC-8004 validation tools
 */
export const validationTools = {
    getToolDefinitions() {
        return [
            {
                name: 'register_agent',
                description: '在 ERC-8004 合约上注册 AI Agent，获得 Agent ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Agent 名称',
                        },
                        description: {
                            type: 'string',
                            description: 'Agent 描述',
                        },
                        capabilities: {
                            type: 'array',
                            description: 'Agent 能力列表',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                    required: ['name', 'description'],
                },
            },
            {
                name: 'get_agent_info',
                description: '查询 Agent 信息',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agent_id: {
                            type: 'string',
                            description: 'Agent ID (Token ID)',
                        },
                    },
                    required: ['agent_id'],
                },
            },
            {
                name: 'create_validation_request',
                description: '创建 ERC-8004 验证请求，记录迁移任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agent_id: {
                            type: 'string',
                            description: 'Agent ID',
                        },
                        task_description: {
                            type: 'string',
                            description: '任务描述',
                        },
                        nft_contract: {
                            type: 'string',
                            description: 'NFT 合约地址',
                        },
                        token_range: {
                            type: 'object',
                            description: 'Token ID 范围',
                            properties: {
                                start: { type: 'number' },
                                end: { type: 'number' },
                            },
                        },
                        ipfs_cids: {
                            type: 'array',
                            description: 'IPFS CID 列表',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                    required: ['agent_id', 'task_description', 'nft_contract'],
                },
            },
            {
                name: 'submit_validation',
                description: '提交验证结果和证明',
                inputSchema: {
                    type: 'object',
                    properties: {
                        request_hash: {
                            type: 'string',
                            description: '验证请求的哈希',
                        },
                        is_valid: {
                            type: 'boolean',
                            description: '迁移是否成功',
                        },
                        migration_results: {
                            type: 'array',
                            description: '迁移结果列表',
                            items: {
                                type: 'object',
                                properties: {
                                    ipfsCid: { type: 'string' },
                                    filecoinPieceCid: { type: 'string' },
                                    success: { type: 'boolean' },
                                },
                            },
                        },
                    },
                    required: ['request_hash', 'is_valid', 'migration_results'],
                },
            },
            {
                name: 'get_validation_status',
                description: '查询验证请求的状态',
                inputSchema: {
                    type: 'object',
                    properties: {
                        request_hash: {
                            type: 'string',
                            description: '验证请求的哈希',
                        },
                    },
                    required: ['request_hash'],
                },
            },
        ];
    },
    hasHandler(toolName) {
        return [
            'register_agent',
            'get_agent_info',
            'create_validation_request',
            'submit_validation',
            'get_validation_status',
        ].includes(toolName);
    },
    async handleTool(toolName, args) {
        switch (toolName) {
            case 'register_agent':
                return await this.registerAgent(args);
            case 'get_agent_info':
                return await this.getAgentInfo(args);
            case 'create_validation_request':
                return await this.createValidationRequest(args);
            case 'submit_validation':
                return await this.submitValidation(args);
            case 'get_validation_status':
                return await this.getValidationStatus(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    },
    async registerAgent(args) {
        try {
            // Create registration script using ERC8004Client
            const registerScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate agent metadata
  const metadata = client.generateAgentMetadata(
    '${args.name}',
    '${args.description}',
    ['https://api.nft-migration.example.com'],
    ${JSON.stringify(args.capabilities || ['nft-scan', 'filecoin-upload', 'metadata-migration'])}
  );

  console.log('METADATA_START');
  console.log(JSON.stringify(metadata, null, 2));
  console.log('METADATA_END');

  // For now, use a placeholder metadata URI
  // In production, upload to IPFS first
  const metadataURI = 'ipfs://QmAgentMetadata' + Date.now();

  const result = await client.registerAgent(metadataURI);

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-register-agent.js');
            await fs.writeFile(scriptPath, registerScript);
            // Execute registration
            const { stdout, stderr } = await execAsync('node temp-register-agent.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 120000, // 2 minutes
            });
            // Clean up
            await fs.unlink(scriptPath).catch(() => { });
            // Parse result
            const output = stdout + stderr;
            let metadata, result;
            const metadataMatch = output.match(/METADATA_START\n([\s\S]*?)\nMETADATA_END/);
            if (metadataMatch) {
                metadata = JSON.parse(metadataMatch[1]);
            }
            const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
            if (resultMatch) {
                result = JSON.parse(resultMatch[1]);
            }
            if (result && result.agentId) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ✅ Agent 注册成功

**Agent ID**: ${result.agentId}
**名称**: ${args.name}
**描述**: ${args.description}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}
- **Owner**: ${result.owner}

## 元数据

\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

使用此 Agent ID 创建验证请求：
\`\`\`
请使用 create_validation_request 工具创建验证请求
Agent ID: ${result.agentId}
\`\`\``,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 注册结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
                        },
                    ],
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 注册失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async getAgentInfo(args) {
        try {
            const getAgentScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  const result = await client.getAgent(${args.agent_id});

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-get-agent.js');
            await fs.writeFile(scriptPath, getAgentScript);
            const { stdout, stderr } = await execAsync('node temp-get-agent.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 60000,
            });
            await fs.unlink(scriptPath).catch(() => { });
            const output = stdout + stderr;
            let result;
            const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
            if (resultMatch) {
                result = JSON.parse(resultMatch[1]);
            }
            if (result) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# 📋 Agent 信息

**Agent ID**: ${result.agentId}
**Owner**: ${result.owner}
**元数据 URI**: ${result.metadataURI}
**状态**: ${result.isActive ? '✅ 活跃' : '❌ 未激活'}

## 链上查询

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/token/${process.env.AGENT_IDENTITY_ADDRESS}?a=${result.agentId})`,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 查询结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
                        },
                    ],
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 查询失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async createValidationRequest(args) {
        try {
            const createRequestScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
  const signerAddress = await signer.getAddress();

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate task metadata
  const taskMetadata = client.generateTaskMetadata(
    '${args.task_description}',
    '${args.nft_contract}',
    ${JSON.stringify(args.token_range || { start: 0, end: 4 })},
    ${JSON.stringify(args.ipfs_cids || [])}
  );

  console.log('TASK_METADATA_START');
  console.log(JSON.stringify(taskMetadata, null, 2));
  console.log('TASK_METADATA_END');

  // For now, use a placeholder task URI
  // In production, upload to IPFS first
  const taskURI = 'ipfs://QmTaskMetadata' + Date.now();

  const result = await client.createValidationRequest(
    ${args.agent_id},
    taskURI,
    signerAddress
  );

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-create-request.js');
            await fs.writeFile(scriptPath, createRequestScript);
            const { stdout, stderr } = await execAsync('node temp-create-request.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 120000,
            });
            await fs.unlink(scriptPath).catch(() => { });
            const output = stdout + stderr;
            let taskMetadata, result;
            const taskMatch = output.match(/TASK_METADATA_START\n([\s\S]*?)\nTASK_METADATA_END/);
            if (taskMatch) {
                taskMetadata = JSON.parse(taskMatch[1]);
            }
            const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
            if (resultMatch) {
                result = JSON.parse(resultMatch[1]);
            }
            if (result && result.requestHash) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ✅ 验证请求已创建

**Request Hash**: \`${result.requestHash}\`
**Agent ID**: ${args.agent_id}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}

## 任务信息

- **描述**: ${args.task_description}
- **NFT 合约**: ${args.nft_contract}
- **Token 范围**: #${args.token_range?.start || 0} - #${args.token_range?.end || 4}

## 任务元数据

\`\`\`json
${JSON.stringify(taskMetadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

1. 使用 MCP 工具执行 NFT 迁移
2. 收集迁移结果
3. 提交验证：

\`\`\`
请使用 submit_validation 工具提交验证结果
Request Hash: ${result.requestHash}
\`\`\``,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 创建请求结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
                        },
                    ],
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 创建请求失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async submitValidation(args) {
        try {
            const submitScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate proof metadata
  const migrationResults = ${JSON.stringify(args.migration_results)};
  const proofMetadata = client.generateProofMetadata(
    'ipfs://QmTaskMetadata',
    migrationResults
  );

  console.log('PROOF_METADATA_START');
  console.log(JSON.stringify(proofMetadata, null, 2));
  console.log('PROOF_METADATA_END');

  // For now, use a placeholder proof URI
  // In production, upload to IPFS first
  const proofURI = 'ipfs://QmProofMetadata' + Date.now();

  const result = await client.submitValidation(
    '${args.request_hash}',
    ${args.is_valid},
    proofURI
  );

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-submit-validation.js');
            await fs.writeFile(scriptPath, submitScript);
            const { stdout, stderr } = await execAsync('node temp-submit-validation.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 120000,
            });
            await fs.unlink(scriptPath).catch(() => { });
            const output = stdout + stderr;
            let proofMetadata, result;
            const proofMatch = output.match(/PROOF_METADATA_START\n([\s\S]*?)\nPROOF_METADATA_END/);
            if (proofMatch) {
                proofMetadata = JSON.parse(proofMatch[1]);
            }
            const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
            if (resultMatch) {
                result = JSON.parse(resultMatch[1]);
            }
            if (result && result.txHash) {
                const summary = proofMetadata?.proof?.summary || {};
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ✅ 验证结果已提交

**Request Hash**: \`${args.request_hash}\`
**验证状态**: ${args.is_valid ? '✅ 通过' : '❌ 失败'}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}

## 迁移统计

- **总计**: ${summary.total || args.migration_results.length} 个 NFT
- **成功**: ${summary.successful || args.migration_results.filter((r) => r.success).length}
- **失败**: ${summary.failed || 0}
- **成功率**: ${summary.successRate || 100}%

## 证明元数据

\`\`\`json
${JSON.stringify(proofMetadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

查询验证状态：

\`\`\`
请使用 get_validation_status 工具查询验证状态
Request Hash: ${args.request_hash}
\`\`\``,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 提交结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
                        },
                    ],
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 提交验证失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async getValidationStatus(args) {
        try {
            const getStatusScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  const result = await client.getValidationRequest('${args.request_hash}');

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-get-status.js');
            await fs.writeFile(scriptPath, getStatusScript);
            const { stdout, stderr } = await execAsync('node temp-get-status.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 60000,
            });
            await fs.unlink(scriptPath).catch(() => { });
            const output = stdout + stderr;
            let result;
            const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
            if (resultMatch) {
                result = JSON.parse(resultMatch[1]);
            }
            if (result) {
                const statusEmoji = result.status === 'Completed' ? '✅' : result.status === 'Pending' ? '⏳' : '❌';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ${statusEmoji} 验证请求状态

**Request Hash**: \`${result.requestHash}\`
**状态**: ${result.status}
**验证通过**: ${result.isValid ? '✅ 是' : result.status === 'Pending' ? '⏳ 待验证' : '❌ 否'}

## 详细信息

- **Agent ID**: ${result.agentId}
- **请求者**: ${result.requester}
- **验证者**: ${result.validator}
- **任务 URI**: ${result.workURI}
- **证明 URI**: ${result.proofURI || '尚未提交'}
- **请求时间**: ${result.requestedAt ? new Date(Number(result.requestedAt) * 1000).toLocaleString() : 'N/A'}
- **提交时间**: ${result.submittedAt ? new Date(Number(result.submittedAt) * 1000).toLocaleString() : '尚未提交'}

## 链上查询

[在 Sepolia Etherscan 查看合约](https://sepolia.etherscan.io/address/${process.env.AGENT_VALIDATION_ADDRESS})

${result.status === 'Completed' && result.isValid ? '## 🎉 验证完成\n\nNFT 迁移已通过 ERC-8004 验证，所有数据已记录在区块链上！' : ''}`,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 查询结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
                        },
                    ],
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 查询状态失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
//# sourceMappingURL=validation.js.map