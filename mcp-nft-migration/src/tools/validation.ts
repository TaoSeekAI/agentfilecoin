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
 * ERC-8004 validation tools
 */
export const validationTools = {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'erc8004_validate',
        description: '使用 ERC-8004 验证合约验证 NFT 迁移',
        inputSchema: {
          type: 'object',
          properties: {
            piece_cid: {
              type: 'string',
              description: 'Filecoin PieceCID (ipfs://... 格式)',
            },
            token_id: {
              type: 'string',
              description: 'NFT Token ID',
            },
            contract_address: {
              type: 'string',
              description: 'NFT 合约地址',
            },
          },
          required: ['piece_cid', 'token_id', 'contract_address'],
        },
      },
      {
        name: 'update_contract_uri',
        description: '更新 NFT 合约的 tokenURI 为 Filecoin CID',
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
            new_uri: {
              type: 'string',
              description: '新的 URI (ipfs://... 格式)',
            },
          },
          required: ['contract_address', 'token_id', 'new_uri'],
        },
      },
    ];
  },

  hasHandler(toolName: string): boolean {
    return ['erc8004_validate', 'update_contract_uri'].includes(toolName);
  },

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'erc8004_validate':
        return await this.erc8004Validate(args);
      case 'update_contract_uri':
        return await this.updateContractUri(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  },

  async erc8004Validate(args: {
    piece_cid: string;
    token_id: string;
    contract_address: string;
  }): Promise<any> {
    try {
      // Create validation script
      const validateScript = `
import { Phase5_ERC8004Validation } from './phases/Phase5_ERC8004Validation.js';

async function main() {
  const validator = new Phase5_ERC8004Validation({
    pieceCid: '${args.piece_cid}',
    tokenId: '${args.token_id}',
    contractAddress: '${args.contract_address}',
  });

  const result = await validator.execute();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
`;

      const scriptPath = path.join(MVP_DEMO_PATH, 'temp-validation-script.js');
      await fs.writeFile(scriptPath, validateScript);

      // Execute validation
      const { stdout, stderr } = await execAsync('node temp-validation-script.js', {
        cwd: MVP_DEMO_PATH,
        env: process.env,
        timeout: 120000, // 2 minutes
      });

      // Clean up
      await fs.unlink(scriptPath).catch(() => {});

      // Parse result
      const output = stdout + stderr;
      let result;

      try {
        const jsonMatch = output.match(/\{[\s\S]*"validated"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If parsing fails, return raw output
      }

      if (result) {
        return {
          content: [
            {
              type: 'text',
              text: `# ${result.validated ? '✅' : '❌'} ERC-8004 验证结果\n\n**Token ID**: ${
                args.token_id
              }\n**PieceCID**: ${args.piece_cid}\n**验证状态**: ${
                result.validated ? '通过' : '失败'
              }\n\n完整输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 验证结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 验证失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async updateContractUri(args: {
    contract_address: string;
    token_id: string;
    new_uri: string;
  }): Promise<any> {
    try {
      // Create update script
      const updateScript = `
import { Phase4_UpdateContract } from './phases/Phase4_UpdateContract.js';

async function main() {
  const updater = new Phase4_UpdateContract({
    contractAddress: '${args.contract_address}',
    tokenId: '${args.token_id}',
    newUri: '${args.new_uri}',
  });

  const result = await updater.execute();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
`;

      const scriptPath = path.join(MVP_DEMO_PATH, 'temp-update-script.js');
      await fs.writeFile(scriptPath, updateScript);

      // Execute update
      const { stdout, stderr } = await execAsync('node temp-update-script.js', {
        cwd: MVP_DEMO_PATH,
        env: process.env,
        timeout: 120000, // 2 minutes
      });

      // Clean up
      await fs.unlink(scriptPath).catch(() => {});

      // Parse result
      const output = stdout + stderr;
      let result;

      try {
        const jsonMatch = output.match(/\{[\s\S]*"transactionHash"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If parsing fails, return raw output
      }

      if (result && result.transactionHash) {
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ 合约更新成功\n\n**Token ID**: ${args.token_id}\n**新 URI**: ${args.new_uri}\n**交易哈希**: ${result.transactionHash}\n\n完整输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 更新结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 更新失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },
};
