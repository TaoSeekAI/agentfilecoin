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
 * Resource providers for querying migration status, balances, and contracts
 */
export const resourceProviders = {
    getResourceList() {
        return [
            {
                uri: 'nft-migration://status',
                name: 'Migration Status',
                description: '当前迁移任务的状态',
                mimeType: 'application/json',
            },
            {
                uri: 'nft-migration://balances',
                name: 'Wallet Balances',
                description: '钱包余额（FIL、USDFC、Payments）',
                mimeType: 'application/json',
            },
            {
                uri: 'nft-migration://contracts',
                name: 'Contract Addresses',
                description: 'Filecoin 合约地址（Payments、Warm Storage、USDFC）',
                mimeType: 'application/json',
            },
            {
                uri: 'nft-migration://environment',
                name: 'Environment Info',
                description: '环境配置信息（RPC URLs、钱包地址）',
                mimeType: 'application/json',
            },
        ];
    },
    async readResource(uri) {
        switch (uri) {
            case 'nft-migration://status':
                return await this.getMigrationStatus();
            case 'nft-migration://balances':
                return await this.getBalances();
            case 'nft-migration://contracts':
                return await this.getContracts();
            case 'nft-migration://environment':
                return await this.getEnvironment();
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    },
    async getMigrationStatus() {
        try {
            // Check if workflow state file exists
            const stateFile = path.join(MVP_DEMO_PATH, 'workflow-state.json');
            try {
                const stateData = await fs.readFile(stateFile, 'utf-8');
                return {
                    status: 'active',
                    state: JSON.parse(stateData),
                    lastUpdated: new Date().toISOString(),
                };
            }
            catch (e) {
                return {
                    status: 'idle',
                    message: '没有正在进行的迁移任务',
                    lastUpdated: new Date().toISOString(),
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to get migration status: ${error.message}`);
        }
    },
    async getBalances() {
        try {
            const { stdout } = await execAsync('node check-balances.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
            });
            // Parse output
            const lines = stdout.split('\n');
            const balances = {
                wallet: process.env.WALLET_ADDRESS || 'N/A',
                lastUpdated: new Date().toISOString(),
            };
            // Extract balances from output
            lines.forEach((line) => {
                if (line.includes('FIL:')) {
                    balances.fil = line.split(':')[1]?.trim();
                }
                if (line.includes('USDFC (钱包):')) {
                    balances.usdfc_wallet = line.split(':')[1]?.trim();
                }
                if (line.includes('USDFC (Payments):')) {
                    balances.usdfc_payments = line.split(':')[1]?.trim();
                }
            });
            return balances;
        }
        catch (error) {
            return {
                error: error.message,
                wallet: process.env.WALLET_ADDRESS || 'N/A',
                lastUpdated: new Date().toISOString(),
            };
        }
    },
    async getContracts() {
        try {
            const { stdout } = await execAsync('node get-real-addresses.js', {
                cwd: MVP_DEMO_PATH,
                env: process.env,
            });
            const lines = stdout.split('\n');
            const contracts = {
                network: 'Filecoin Calibration',
                lastUpdated: new Date().toISOString(),
            };
            // Extract contract addresses
            lines.forEach((line) => {
                if (line.includes('Payments:')) {
                    contracts.payments = line.split(':')[1]?.trim();
                }
                if (line.includes('Warm Storage:')) {
                    contracts.warmStorage = line.split(':')[1]?.trim();
                }
                if (line.includes('USDFC:')) {
                    contracts.usdfc = line.split(':')[1]?.trim();
                }
            });
            return contracts;
        }
        catch (error) {
            return {
                error: error.message,
                network: 'Filecoin Calibration',
                lastUpdated: new Date().toISOString(),
            };
        }
    },
    async getEnvironment() {
        return {
            ethereum: {
                mainnet_rpc: process.env.ETHEREUM_MAINNET_RPC_URL || 'N/A',
                sepolia_rpc: process.env.ETHEREUM_NETWORK_RPC_URL || 'N/A',
            },
            filecoin: {
                calibration_rpc: process.env.FILECOIN_NETWORK_RPC_URL || 'N/A',
            },
            wallet: {
                address: process.env.WALLET_ADDRESS || 'N/A',
                hasPrivateKey: !!process.env.PRIVATE_KEY,
            },
            lastUpdated: new Date().toISOString(),
        };
    },
};
//# sourceMappingURL=index.js.map