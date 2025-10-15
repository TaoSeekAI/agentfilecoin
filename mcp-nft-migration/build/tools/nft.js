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
 * NFT scanning and discovery tools
 */
export const nftTools = {
    getToolDefinitions() {
        return [
            {
                name: 'nft_scan',
                description: '扫描以太坊 NFT 合约，获取 NFT 列表和元数据',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contract_address: {
                            type: 'string',
                            description: 'NFT 合约地址',
                        },
                        token_ids: {
                            type: 'array',
                            description: 'Token ID 列表（可选，不提供则扫描所有）',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                    required: ['contract_address'],
                },
            },
            {
                name: 'get_nft_metadata',
                description: '获取单个 NFT 的元数据（从 IPFS 或 HTTP）',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contract_address: {
                            type: 'string',
                            description: 'NFT 合约地址',
                        },
                        token_id: {
                            type: 'string',
                            description: 'Token ID',
                        },
                    },
                    required: ['contract_address', 'token_id'],
                },
            },
        ];
    },
    hasHandler(toolName) {
        return ['nft_scan', 'get_nft_metadata'].includes(toolName);
    },
    async handleTool(toolName, args) {
        switch (toolName) {
            case 'nft_scan':
                return await this.nftScan(args);
            case 'get_nft_metadata':
                return await this.getNftMetadata(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    },
    async nftScan(args) {
        try {
            // Create scan script dynamically
            const scanScript = `
import { Phase1_ScanNFT } from './phases/Phase1_ScanNFT.js';

async function main() {
  const scanner = new Phase1_ScanNFT({
    contractAddress: '${args.contract_address}',
    ${args.token_ids ? `tokenIds: ${JSON.stringify(args.token_ids)},` : ''}
  });

  const result = await scanner.execute();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-scan-script.js');
            await fs.writeFile(scriptPath, scanScript);
            // Execute scan
            const { stdout, stderr } = await execAsync('node temp-scan-script.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 120000, // 2 minutes
            });
            // Clean up
            await fs.unlink(scriptPath).catch(() => { });
            // Parse result
            const output = stdout + stderr;
            let result;
            try {
                const jsonMatch = output.match(/\{[\s\S]*"nfts"[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                }
            }
            catch (e) {
                // If parsing fails, return raw output
            }
            if (result && result.nfts) {
                const nftCount = result.nfts.length;
                const nftList = result.nfts
                    .slice(0, 10)
                    .map((nft) => `- Token ID: ${nft.tokenId}\n  Owner: ${nft.owner}\n  URI: ${nft.tokenURI}`)
                    .join('\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# 📊 NFT 扫描结果\n\n**合约**: ${args.contract_address}\n**NFT 数量**: ${nftCount}\n\n## NFT 列表 (前 10 个):\n\n${nftList}\n\n${nftCount > 10 ? `\n...还有 ${nftCount - 10} 个 NFT\n` : ''}\n完整数据:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 扫描结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
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
                        text: `❌ 扫描失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async getNftMetadata(args) {
        try {
            // Create metadata fetch script
            const fetchScript = `
import { Phase2_FetchMetadata } from './phases/Phase2_FetchMetadata.js';

async function main() {
  const fetcher = new Phase2_FetchMetadata({
    contractAddress: '${args.contract_address}',
    tokenId: '${args.token_id}',
  });

  const result = await fetcher.execute();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
`;
            const scriptPath = path.join(MVP_DEMO_PATH, 'temp-metadata-script.js');
            await fs.writeFile(scriptPath, fetchScript);
            // Execute fetch
            const { stdout, stderr } = await execAsync('node temp-metadata-script.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
                timeout: 60000, // 1 minute
            });
            // Clean up
            await fs.unlink(scriptPath).catch(() => { });
            // Parse result
            const output = stdout + stderr;
            let result;
            try {
                const jsonMatch = output.match(/\{[\s\S]*"metadata"[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                }
            }
            catch (e) {
                // If parsing fails, return raw output
            }
            if (result && result.metadata) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# 📄 NFT 元数据\n\n**Token ID**: ${args.token_id}\n**合约**: ${args.contract_address}\n\n\`\`\`json\n${JSON.stringify(result.metadata, null, 2)}\n\`\`\``,
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ 获取元数据失败\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
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
                        text: `❌ 获取元数据失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
//# sourceMappingURL=nft.js.map