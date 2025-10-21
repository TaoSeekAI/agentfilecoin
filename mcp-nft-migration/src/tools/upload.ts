import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MVP_DEMO_PATH = path.resolve(__dirname, '../../../mvp-demo');

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Upload tools for Filecoin storage operations
 */
export const uploadTools = {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'upload_to_filecoin',
        description: '上传 NFT 元数据到 Filecoin，返回 PieceCID',
        inputSchema: {
          type: 'object',
          properties: {
            nft_token_id: {
              type: 'string',
              description: 'NFT Token ID',
            },
            metadata: {
              type: 'object',
              description: 'NFT 元数据对象',
            },
            contract_address: {
              type: 'string',
              description: 'NFT 合约地址',
            },
          },
          required: ['nft_token_id', 'metadata', 'contract_address'],
        },
      },
      {
        name: 'test_upload',
        description: '使用测试数据测试 Filecoin 上传功能',
        inputSchema: {
          type: 'object',
          properties: {
            file_size_mb: {
              type: 'number',
              description: '测试文件大小（MB），默认 1.1',
              default: 1.1,
            },
          },
        },
      },
    ];
  },

  hasHandler(toolName: string): boolean {
    return ['upload_to_filecoin', 'test_upload'].includes(toolName);
  },

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'upload_to_filecoin':
        return await this.uploadToFilecoin(args);
      case 'test_upload':
        return await this.testUpload(args.file_size_mb || 1.1);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  },

  async uploadToFilecoin(args: {
    nft_token_id: string;
    metadata: any;
    contract_address: string;
  }): Promise<any> {
    try {
      // Create a temporary file with metadata
      const tempFile = path.join(MVP_DEMO_PATH, `temp-metadata-${args.nft_token_id}.json`);

      // Ensure minimum 1 MB file size
      const MIN_SIZE = 1048576; // 1 MB
      const metadataStr = JSON.stringify(args.metadata, null, 2);
      const paddingNeeded = Math.max(0, MIN_SIZE - metadataStr.length);
      const paddedMetadata = {
        ...args.metadata,
        _padding: 'X'.repeat(paddingNeeded),
      };

      await fs.writeFile(tempFile, JSON.stringify(paddedMetadata, null, 2));

      // Create upload script dynamically
      const uploadScript = `
import 'dotenv/config';
import { FilecoinUploaderV033 } from './filecoin-uploader-v033.js';
import fs from 'fs/promises';

async function main() {
  // Debug environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not loaded from .env');
  }
  if (!process.env.FILECOIN_NETWORK_RPC_URL) {
    throw new Error('FILECOIN_NETWORK_RPC_URL not loaded from .env');
  }

  const uploader = new FilecoinUploaderV033(
    process.env.PRIVATE_KEY,
    process.env.FILECOIN_NETWORK_RPC_URL
  );
  await uploader.initialize();

  const metadata = JSON.parse(await fs.readFile('${tempFile}', 'utf-8'));
  const data = Buffer.from(JSON.stringify(metadata));

  const ctx = await uploader.createStorageContext({ withCDN: false });
  const result = await uploader.uploadToFilecoin(data, {
    tokenId: '${args.nft_token_id}',
    contractAddress: '${args.contract_address}'
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
`;

      const scriptPath = path.join(MVP_DEMO_PATH, 'temp-upload-script.js');
      await fs.writeFile(scriptPath, uploadScript);

      // Execute upload
      let stdout, stderr;
      try {
        const result = await execAsync('node temp-upload-script.js', {
          cwd: MVP_DEMO_PATH,
          env: process.env, // Pass environment variables from MCP Server
          timeout: 600000, // 10 minutes
        });
        stdout = result.stdout;
        stderr = result.stderr;

        // Clean up on success
        await fs.unlink(tempFile).catch(() => {});
        await fs.unlink(scriptPath).catch(() => {});
      } catch (error: any) {
        stdout = error.stdout || '';
        stderr = error.stderr || '';
        // Keep temp files on error for debugging
        console.error(`Upload failed. Temp files preserved at:`);
        console.error(`  Script: ${scriptPath}`);
        console.error(`  Metadata: ${tempFile}`);
        throw error;
      }

      // Parse result
      const output = stdout + stderr;
      let uploadResult;

      try {
        // Try to extract JSON result
        const jsonMatch = output.match(/\{[\s\S]*"pieceCid"[\s\S]*\}/);
        if (jsonMatch) {
          uploadResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If parsing fails, return raw output
      }

      if (uploadResult && uploadResult.pieceCid) {
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ 上传成功\n\n**PieceCID**: \`ipfs://${uploadResult.pieceCid}\`\n**Piece ID**: ${uploadResult.pieceId}\n**Data Set ID**: ${uploadResult.dataSetId}\n\n完整输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 上传结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 上传失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async testUpload(fileSizeMb: number): Promise<any> {
    try {
      const { stdout, stderr } = await execAsync('node test-real-upload-small.js', {
        cwd: MVP_DEMO_PATH,
        env: {
          ...process.env,
          TEST_FILE_SIZE_MB: fileSizeMb.toString(),
        },
        timeout: 600000, // 10 minutes
      });

      const output = stdout + stderr;
      const success = output.includes('PieceCID:') || output.includes('✅');

      return {
        content: [
          {
            type: 'text',
            text: `# 测试上传结果\n\n${output}\n\n${
              success
                ? '✅ 测试上传成功！'
                : '⚠️ 测试上传可能失败或超时，请检查输出。'
            }`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 测试上传失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },
};
