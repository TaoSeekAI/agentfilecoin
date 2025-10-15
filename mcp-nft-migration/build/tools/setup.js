import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MVP_DEMO_PATH = path.resolve(__dirname, '../../../mvp-demo');
/**
 * Setup tools for environment verification and authorization setup
 */
export const setupTools = {
    getToolDefinitions() {
        return [
            {
                name: 'verify_setup',
                description: '验证环境配置是否正确，检查私钥、SDK版本、余额和授权状态',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'setup_approvals',
                description: '自动设置 Filecoin 存储所需的所有授权（存入 USDFC 并授权 Warm Storage）',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deposit_amount: {
                            type: 'number',
                            description: 'USDFC 存款金额（默认 35）',
                            default: 35,
                        },
                    },
                },
            },
            {
                name: 'check_balances',
                description: '检查钱包余额（FIL、USDFC、Payments 余额）',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
        ];
    },
    hasHandler(toolName) {
        return ['verify_setup', 'setup_approvals', 'check_balances'].includes(toolName);
    },
    async handleTool(toolName, args) {
        switch (toolName) {
            case 'verify_setup':
                return await this.verifySetup();
            case 'setup_approvals':
                return await this.setupApprovals(args.deposit_amount || 35);
            case 'check_balances':
                return await this.checkBalances();
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    },
    async verifySetup() {
        try {
            const { stdout, stderr } = await execAsync('node pre-upload-check.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
            });
            const output = stdout + stderr;
            const allPassed = !output.includes('❌');
            return {
                content: [
                    {
                        type: 'text',
                        text: `# 环境验证结果\n\n${output}\n\n${allPassed
                            ? '✅ 所有检查通过！环境已准备就绪。'
                            : '⚠️ 某些检查未通过。请运行 setup_approvals 工具来设置授权。'}`,
                    },
                ],
            };
        }
        catch (error) {
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
    async setupApprovals(depositAmount) {
        try {
            const { stdout, stderr } = await execAsync('node setup-via-sdk.js', {
                cwd: MVP_DEMO_PATH,
                env: {
                    ...process.env,
                    DEPOSIT_AMOUNT: depositAmount.toString(),
                },
                timeout: 120000, // 2 minutes
            });
            const output = stdout + stderr;
            const success = output.includes('✅') && !output.includes('❌');
            return {
                content: [
                    {
                        type: 'text',
                        text: `# 授权设置结果\n\n${output}\n\n${success
                            ? '✅ 授权设置成功！已存入 USDFC 并授权 Warm Storage 服务。'
                            : '⚠️ 授权设置过程中可能有问题，请检查输出。'}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 授权设置失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
    async checkBalances() {
        try {
            const { stdout, stderr } = await execAsync('node check-balances.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `# 钱包余额\n\n${stdout}${stderr}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 检查余额失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
//# sourceMappingURL=setup.js.map