# 🤖 LLM + MCP 集成方案 - NFT 迁移自动化

使用 Claude Code + MCP 服务器实现 NFT IPFS 到 Filecoin 的自动化迁移。

---

## 📋 目录

1. [架构设计](#架构设计)
2. [MCP 服务器实现](#mcp-服务器实现)
3. [Claude Code 集成](#claude-code-集成)
4. [使用指南](#使用指南)
5. [示例对话](#示例对话)

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户（自然语言）                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code (Desktop)                      │
│  - 理解用户意图                                               │
│  - 分解任务步骤                                               │
│  - 调用 MCP 工具                                              │
│  - 处理错误和重试                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NFT Migration MCP Server                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tools (工具集)                                      │   │
│  │  - nft_scan: 扫描 NFT                                │   │
│  │  - agent_register: 注册 Agent                        │   │
│  │  - create_validation_request: 创建验证请求          │   │
│  │  - upload_to_filecoin: 上传到 Filecoin              │   │
│  │  - submit_proof: 提交证明                            │   │
│  │  - check_status: 检查状态                            │   │
│  │  - setup_approvals: 设置授权                         │   │
│  │  - verify_setup: 验证配置                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Resources (资源)                                    │   │
│  │  - migration_status: 迁移状态                        │   │
│  │  - wallet_balances: 钱包余额                         │   │
│  │  - contract_addresses: 合约地址                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prompts (提示模板)                                  │   │
│  │  - migration_workflow: 迁移工作流指导                │   │
│  │  - troubleshooting: 故障排查指导                     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 底层实现（现有代码）                          │
│  - Ethereum RPC                                               │
│  - Filecoin Synapse SDK                                       │
│  - ERC-8004 合约                                              │
│  - 本地脚本（demo.js, setup-via-sdk.js 等）                 │
└─────────────────────────────────────────────────────────────┘
```

### 工作流程

```
用户: "帮我迁移 NFT 到 Filecoin"
    ↓
Claude Code: 理解意图，制定计划
    ↓
1. 调用 verify_setup → 检查环境配置
    ↓
2. 调用 setup_approvals → 设置授权（如需要）
    ↓
3. 调用 nft_scan → 扫描 NFT
    ↓
4. 调用 agent_register → 注册 Agent
    ↓
5. 调用 create_validation_request → 创建请求
    ↓
6. 调用 upload_to_filecoin → 上传元数据
    ↓
7. 调用 submit_proof → 提交证明
    ↓
8. 调用 check_status → 验证完成
    ↓
Claude Code: 生成报告，展示给用户
```

---

## MCP 服务器实现

### 目录结构

```
mcp-nft-migration/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── tools/                # 工具实现
│   │   ├── scan.ts           # NFT 扫描
│   │   ├── register.ts       # Agent 注册
│   │   ├── upload.ts         # Filecoin 上传
│   │   ├── validate.ts       # 验证相关
│   │   └── setup.ts          # 环境设置
│   ├── resources/            # 资源提供
│   │   ├── status.ts         # 状态查询
│   │   └── balances.ts       # 余额查询
│   ├── prompts/              # 提示模板
│   │   └── workflows.ts      # 工作流模板
│   └── utils/                # 工具函数
│       ├── config.ts         # 配置管理
│       ├── blockchain.ts     # 区块链交互
│       └── storage.ts        # 状态存储
└── README.md
```

### 核心实现

#### 1. MCP 服务器入口 (`src/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { setupTools } from "./tools/index.js";
import { setupResources } from "./resources/index.js";
import { setupPrompts } from "./prompts/index.js";

// 创建 MCP 服务器
const server = new Server(
  {
    name: "nft-migration-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// 注册工具
setupTools(server);

// 注册资源
setupResources(server);

// 注册提示
setupPrompts(server);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NFT Migration MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

#### 2. 工具定义 (`src/tools/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { scanNFTs } from "./scan.js";
import { registerAgent } from "./register.js";
import { uploadToFilecoin } from "./upload.js";
import { setupApprovals } from "./setup.js";
import { verifySetup } from "./setup.js";
import { checkStatus } from "./validate.js";

export function setupTools(server: Server) {
  // 工具列表
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "verify_setup",
        description:
          "验证环境配置是否正确，包括余额、授权等。返回详细的检查结果。",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "setup_approvals",
        description:
          "自动设置 Filecoin 存储所需的所有授权，包括 USDFC 存款和服务授权。",
        inputSchema: {
          type: "object",
          properties: {
            deposit_amount: {
              type: "number",
              description: "存入 Payments 的 USDFC 数量（默认 35）",
              default: 35,
            },
          },
          required: [],
        },
      },
      {
        name: "nft_scan",
        description:
          "扫描指定地址的 NFT。返回 NFT 列表，包括 tokenId、metadata URI 等。",
        inputSchema: {
          type: "object",
          properties: {
            contract_address: {
              type: "string",
              description: "NFT 合约地址",
            },
            owner_address: {
              type: "string",
              description: "NFT 持有者地址（可选）",
            },
            network: {
              type: "string",
              description: "网络名称",
              enum: ["mainnet", "sepolia"],
              default: "mainnet",
            },
          },
          required: ["contract_address"],
        },
      },
      {
        name: "agent_register",
        description:
          "在 ERC-8004 标准上注册 AI Agent。返回 Agent ID 和交易哈希。",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Agent 名称",
            },
            metadata_uri: {
              type: "string",
              description: "Agent 元数据 URI（将自动上传到 Filecoin）",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "create_validation_request",
        description:
          "创建验证请求。返回 Request ID 和交易哈希。",
        inputSchema: {
          type: "object",
          properties: {
            agent_id: {
              type: "number",
              description: "Agent ID",
            },
            task_description: {
              type: "string",
              description: "任务描述",
            },
          },
          required: ["agent_id", "task_description"],
        },
      },
      {
        name: "upload_to_filecoin",
        description:
          "上传 NFT 元数据到 Filecoin。返回 PieceCID 和存储证明。",
        inputSchema: {
          type: "object",
          properties: {
            nft_token_id: {
              type: "string",
              description: "NFT Token ID",
            },
            metadata: {
              type: "object",
              description: "NFT 元数据 JSON",
            },
            contract_address: {
              type: "string",
              description: "NFT 合约地址",
            },
          },
          required: ["nft_token_id", "metadata", "contract_address"],
        },
      },
      {
        name: "submit_proof",
        description:
          "提交验证证明。返回交易哈希和验证结果。",
        inputSchema: {
          type: "object",
          properties: {
            request_id: {
              type: "number",
              description: "Validation Request ID",
            },
            proof_data: {
              type: "object",
              description: "证明数据（包括 PieceCIDs 等）",
            },
          },
          required: ["request_id", "proof_data"],
        },
      },
      {
        name: "check_status",
        description:
          "检查迁移状态。返回当前进度、已完成步骤、待处理任务等。",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "会话 ID（可选，用于查询特定会话）",
            },
          },
          required: [],
        },
      },
    ],
  }));

  // 工具调用处理
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "verify_setup":
          return await verifySetup();

        case "setup_approvals":
          return await setupApprovals(args?.deposit_amount || 35);

        case "nft_scan":
          return await scanNFTs(
            args.contract_address,
            args.owner_address,
            args.network || "mainnet"
          );

        case "agent_register":
          return await registerAgent(args.name, args.metadata_uri);

        case "create_validation_request":
          return await createValidationRequest(
            args.agent_id,
            args.task_description
          );

        case "upload_to_filecoin":
          return await uploadToFilecoin(
            args.nft_token_id,
            args.metadata,
            args.contract_address
          );

        case "submit_proof":
          return await submitProof(args.request_id, args.proof_data);

        case "check_status":
          return await checkStatus(args.session_id);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}\n\nStack: ${error.stack}`,
          },
        ],
        isError: true,
      };
    }
  });
}
```

#### 3. 环境验证实现 (`src/tools/setup.ts`)

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// 项目根目录
const PROJECT_ROOT = path.join(__dirname, "../../../mvp-demo");

export async function verifySetup() {
  const results = {
    checks: [],
    allPassed: true,
    recommendations: [],
  };

  try {
    // 运行前置检查脚本
    const { stdout, stderr } = await execAsync(
      "node pre-upload-check.js",
      {
        cwd: PROJECT_ROOT,
        timeout: 60000,
      }
    );

    // 解析输出
    const output = stdout + stderr;

    // 检查各项
    const checks = [
      {
        name: "私钥配置",
        passed: output.includes("✅ 私钥配置正确"),
      },
      {
        name: "SDK 版本",
        passed: output.includes("✅ SDK 版本"),
      },
      {
        name: "Synapse 初始化",
        passed: output.includes("✅ Synapse 初始化成功"),
      },
      {
        name: "FIL 余额",
        passed: output.includes("✅ FIL 余额充足"),
      },
      {
        name: "Payments 余额",
        passed: output.includes("✅ Payments 合约余额充足"),
      },
      {
        name: "服务授权",
        passed: output.includes("✅ 服务授权已设置"),
      },
    ];

    results.checks = checks;
    results.allPassed = checks.every((c) => c.passed);

    // 添加建议
    if (!results.allPassed) {
      results.recommendations.push(
        "运行 setup_approvals 工具来自动设置授权"
      );
      results.recommendations.push(
        "或手动运行: node setup-via-sdk.js"
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `验证失败: ${error.message}\n\n请确保:\n1. .env 文件配置正确\n2. 有足够的测试代币\n3. 网络连接正常`,
        },
      ],
      isError: true,
    };
  }
}

export async function setupApprovals(depositAmount: number = 35) {
  try {
    // 运行授权设置脚本
    const { stdout, stderr } = await execAsync(
      "node setup-via-sdk.js",
      {
        cwd: PROJECT_ROOT,
        timeout: 300000, // 5 分钟超时
      }
    );

    const output = stdout + stderr;

    // 检查是否成功
    const success = output.includes("✅ 存款成功") &&
      output.includes("✅ 服务授权成功");

    if (success) {
      return {
        content: [
          {
            type: "text",
            text: `授权设置成功！\n\n${output}\n\n现在可以开始上传测试。`,
          },
        ],
      };
    } else {
      throw new Error("授权设置失败，请查看输出");
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `授权设置失败: ${error.message}\n\n请检查:\n1. USDFC 余额是否充足\n2. 网络连接是否正常\n3. 查看完整错误信息`,
        },
      ],
      isError: true,
    };
  }
}
```

#### 4. NFT 扫描实现 (`src/tools/scan.ts`)

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
const PROJECT_ROOT = path.join(__dirname, "../../../mvp-demo");

export async function scanNFTs(
  contractAddress: string,
  ownerAddress?: string,
  network: string = "mainnet"
) {
  try {
    // 调用 Phase1_ScanNFT 模块
    const cmd = ownerAddress
      ? `node -e "import('./workflow/phases/Phase1_ScanNFT.js').then(m => m.default.execute({ contractAddress: '${contractAddress}', ownerAddress: '${ownerAddress}', network: '${network}' }).then(r => console.log(JSON.stringify(r))))"`
      : `node -e "import('./workflow/phases/Phase1_ScanNFT.js').then(m => m.default.execute({ contractAddress: '${contractAddress}', network: '${network}' }).then(r => console.log(JSON.stringify(r))))"`;

    const { stdout } = await execAsync(cmd, {
      cwd: PROJECT_ROOT,
      timeout: 120000,
    });

    const result = JSON.parse(stdout.trim());

    return {
      content: [
        {
          type: "text",
          text: `扫描完成！\n\n找到 ${result.nfts?.length || 0} 个 NFT:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `NFT 扫描失败: ${error.message}\n\n请检查:\n1. 合约地址是否正确\n2. 网络配置是否正确\n3. RPC 连接是否正常`,
        },
      ],
      isError: true,
    };
  }
}
```

#### 5. Filecoin 上传实现 (`src/tools/upload.ts`)

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);
const PROJECT_ROOT = path.join(__dirname, "../../../mvp-demo");

export async function uploadToFilecoin(
  tokenId: string,
  metadata: object,
  contractAddress: string
) {
  try {
    // 1. 保存元数据到临时文件
    const tempFile = path.join(
      PROJECT_ROOT,
      "output",
      `metadata-${tokenId}.json`
    );
    await fs.writeFile(tempFile, JSON.stringify(metadata, null, 2));

    // 2. 使用 FilecoinUploaderV033 上传
    const cmd = `node -e "
      import('./filecoin-uploader-v033.js').then(async (m) => {
        const uploader = new m.FilecoinUploaderV033();
        await uploader.initialize();
        const result = await uploader.uploadMetadata(
          ${JSON.stringify(metadata)},
          'nft-${tokenId}'
        );
        console.log(JSON.stringify(result));
      });
    "`;

    const { stdout } = await execAsync(cmd, {
      cwd: PROJECT_ROOT,
      timeout: 600000, // 10 分钟
    });

    const result = JSON.parse(stdout.trim());

    // 3. 保存结果
    const resultFile = path.join(
      PROJECT_ROOT,
      "output",
      `upload-result-${tokenId}.json`
    );
    await fs.writeFile(
      resultFile,
      JSON.stringify(
        {
          tokenId,
          contractAddress,
          pieceCid: result.cid,
          timestamp: new Date().toISOString(),
          metadata,
        },
        null,
        2
      )
    );

    return {
      content: [
        {
          type: "text",
          text: `上传成功！\n\nToken ID: ${tokenId}\nPieceCID: ${result.cid}\nData Set ID: ${result.dataSetId}\n\n可以在以下地址验证:\nhttps://pdp.vxb.ai/calibration\n\n结果已保存到: ${resultFile}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `上传失败: ${error.message}\n\n可能的原因:\n1. Storage Provider 超时（测试网常见问题）\n2. 授权不足\n3. 网络连接问题\n\n建议:\n- 运行 verify_setup 检查配置\n- 如果其他步骤成功，SP 超时不是你的问题`,
        },
      ],
      isError: true,
    };
  }
}
```

#### 6. 资源定义 (`src/resources/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export function setupResources(server: Server) {
  // 资源列表
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "nft-migration://status",
        name: "Migration Status",
        description: "当前迁移任务的状态",
        mimeType: "application/json",
      },
      {
        uri: "nft-migration://balances",
        name: "Wallet Balances",
        description: "钱包余额（FIL, USDFC 等）",
        mimeType: "application/json",
      },
      {
        uri: "nft-migration://contracts",
        name: "Contract Addresses",
        description: "所有合约地址",
        mimeType: "application/json",
      },
      {
        uri: "nft-migration://config",
        name: "Configuration",
        description: "当前配置信息",
        mimeType: "application/json",
      },
    ],
  }));

  // 资源读取
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "nft-migration://status":
        return await getStatus();

      case "nft-migration://balances":
        return await getBalances();

      case "nft-migration://contracts":
        return await getContracts();

      case "nft-migration://config":
        return await getConfig();

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}

async function getBalances() {
  // 调用 check-balances.js
  const { execAsync } = require("./utils");
  const { stdout } = await execAsync("node check-balances.js");

  return {
    contents: [
      {
        uri: "nft-migration://balances",
        mimeType: "application/json",
        text: stdout,
      },
    ],
  };
}

// ... 其他资源实现
```

#### 7. 提示模板 (`src/prompts/workflows.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export function setupPrompts(server: Server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "migration_workflow",
        description: "NFT 迁移完整工作流指导",
        arguments: [
          {
            name: "contract_address",
            description: "NFT 合约地址",
            required: true,
          },
        ],
      },
      {
        name: "troubleshoot",
        description: "故障排查指导",
        arguments: [
          {
            name: "error_message",
            description: "错误信息",
            required: false,
          },
        ],
      },
      {
        name: "quick_start",
        description: "快速开始指导",
        arguments: [],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "migration_workflow":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `我想将 NFT 合约 ${args?.contract_address} 的元数据迁移到 Filecoin。请帮我完成完整的迁移流程。`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text: `我会帮你完成 NFT 迁移到 Filecoin 的完整流程。让我们按步骤进行：

步骤 1: 验证环境配置
首先我需要检查你的环境是否配置正确。

步骤 2: 设置授权（如需要）
如果配置不完整，我会帮你自动设置所需的授权。

步骤 3: 扫描 NFT
扫描合约地址上的所有 NFT。

步骤 4: 注册 AI Agent
在 ERC-8004 标准上注册 Agent。

步骤 5: 上传元数据到 Filecoin
将每个 NFT 的元数据上传到 Filecoin 永久存储。

步骤 6: 创建验证请求
创建验证请求并提交证明。

步骤 7: 生成报告
生成完整的迁移报告。

现在让我开始第一步...`,
              },
            },
          ],
        };

      case "troubleshoot":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: args?.error_message
                  ? `我遇到了这个错误: ${args.error_message}。请帮我排查。`
                  : `我遇到了问题，请帮我排查。`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text: `我来帮你排查问题。让我先检查几个常见的问题点：

1. 首先检查环境配置
2. 验证余额和授权
3. 检查网络连接
4. 查看具体错误原因

让我开始诊断...`,
              },
            },
          ],
        };

      case "quick_start":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `快速开始 NFT 迁移测试`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text: `好的！我会帮你快速开始测试。

最快流程：
1. ✅ 验证环境 (10秒)
2. ✅ 设置授权 (2-3分钟)
3. ✅ 测试上传 (8-15分钟)

让我开始...`,
              },
            },
          ],
        };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
```

### package.json

```json
{
  "name": "mcp-nft-migration",
  "version": "1.0.0",
  "description": "MCP Server for NFT IPFS to Filecoin Migration",
  "type": "module",
  "bin": {
    "mcp-nft-migration": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x build/index.js",
    "watch": "tsc --watch",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Claude Code 集成

### 配置 Claude Code

在 Claude Code 配置文件中添加 MCP 服务器：

**位置**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": [
        "/path/to/mcp-nft-migration/build/index.js"
      ],
      "env": {
        "PROJECT_ROOT": "/path/to/mvp-demo"
      }
    }
  }
}
```

### 重启 Claude Code

配置后重启 Claude Code Desktop 应用。

---

## 使用指南

### 场景 1: 完整迁移流程

**用户对话**:
```
你: 帮我将合约 0x1234...5678 的 NFT 迁移到 Filecoin
```

**Claude Code 执行**:
1. 调用 `verify_setup` 检查环境
2. 如需要，调用 `setup_approvals` 设置授权
3. 调用 `nft_scan` 扫描 NFT
4. 对每个 NFT:
   - 调用 `upload_to_filecoin` 上传元数据
5. 调用 `agent_register` 注册 Agent
6. 调用 `create_validation_request` 创建请求
7. 调用 `submit_proof` 提交证明
8. 生成完整报告

### 场景 2: 快速测试

**用户对话**:
```
你: 快速测试 Filecoin 上传
```

**Claude Code 执行**:
1. 使用 `quick_start` 提示模板
2. 调用 `verify_setup`
3. 调用 `setup_approvals`
4. 调用 `upload_to_filecoin` 测试上传

### 场景 3: 故障排查

**用户对话**:
```
你: 我遇到了错误码 33，怎么解决？
```

**Claude Code 执行**:
1. 使用 `troubleshoot` 提示模板
2. 调用 `verify_setup` 检查配置
3. 发现授权问题
4. 调用 `setup_approvals` 修复
5. 提供解决方案说明

### 场景 4: 查询状态

**用户对话**:
```
你: 查看当前迁移状态
```

**Claude Code 执行**:
1. 读取 `nft-migration://status` 资源
2. 读取 `nft-migration://balances` 资源
3. 展示友好的状态报告

---

## 示例对话

### 示例 1: 完整工作流

```
你: 帮我迁移 NFT 到 Filecoin，合约地址是 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D

Claude: 好的！我来帮你完成 NFT 到 Filecoin 的迁移。让我先检查环境配置...

[调用 verify_setup 工具]

Claude: 检查结果：
✅ 私钥配置正确
✅ SDK 版本正确
✅ Synapse 初始化成功
❌ Payments 合约余额不足
❌ 服务授权未设置

我发现需要设置授权。让我帮你自动设置...

[调用 setup_approvals 工具]

Claude: 授权设置完成！
✅ 存入 35 USDFC
✅ Warm Storage 服务已授权

现在开始扫描 NFT...

[调用 nft_scan 工具]

Claude: 扫描完成！找到 10,000 个 NFT（Bored Ape Yacht Club）

由于数量较多，我建议先测试上传几个。要全部迁移还是先测试？

你: 先测试前 3 个

Claude: 好的，开始上传前 3 个 NFT 的元数据到 Filecoin...

[调用 upload_to_filecoin 工具 3 次]

Claude: 上传完成！

NFT #1:
- Token ID: 0
- PieceCID: baga6ea4seaq...
- 验证地址: https://pdp.vxb.ai/calibration

NFT #2:
- Token ID: 1
- PieceCID: baga6ea4seaq...
- 验证地址: https://pdp.vxb.ai/calibration

NFT #3:
- Token ID: 2
- PieceCID: baga6ea4seaq...
- 验证地址: https://pdp.vxb.ai/calibration

所有测试上传成功！是否继续完整迁移？
```

### 示例 2: 故障排查

```
你: 上传失败了，显示 "Timeout waiting for piece to be parked"

Claude: 我来帮你分析这个问题...

[调用 verify_setup 工具]

Claude: 环境检查结果：
✅ 所有配置正确
✅ 授权充足
✅ 网络连接正常

[分析错误]

Claude: 这个错误是 "Storage Provider parking 超时"。

根据分析：
1. ✅ 你的代码和配置都是正确的
2. ✅ 上传请求已成功发送
3. ⚠️  问题在于 Storage Provider 响应慢

原因：Calibration 测试网的 Storage Provider 有时会过载或维护。

解决方案：
- 这不是你的问题！
- 所有其他步骤成功 = 你的实现是正确的
- 建议：等待几小时后重试，或联系 Filecoin 社区

要我帮你生成一份详细的诊断报告吗？
```

### 示例 3: 查询状态

```
你: 查看当前状态和余额

Claude:
[读取 nft-migration://balances 资源]
[读取 nft-migration://status 资源]

当前状态：

💰 余额:
- Sepolia ETH: 0.45 ETH ✅
- Calibration FIL: 99.5 FIL ✅
- USDFC (钱包): 15.0 USDFC ✅
- USDFC (Payments): 35.0 USDFC ✅

📊 迁移进度:
- 已扫描: 10,000 个 NFT
- 已上传: 3 个
- 待上传: 9,997 个
- Agent ID: 1
- Data Set ID: 565

🔗 合约地址:
- Payments: 0x1096025c9D6B29E12E2f04965F6E64d564Ce0750
- Warm Storage: 0x80617b65FD2EEa1D7fDe2B4F85977670690ed348

一切正常！是否继续迁移？
```

---

## 优势

### 1. 自然语言交互
- 用户无需记住命令
- 可以用自然语言描述需求
- Claude 自动理解并执行

### 2. 智能错误处理
- 自动诊断问题
- 提供解决方案
- 自动重试和恢复

### 3. 上下文感知
- 记住之前的操作
- 理解当前状态
- 提供相关建议

### 4. 灵活性
- 可以中断和恢复
- 可以调整参数
- 可以选择性执行

### 5. 用户友好
- 实时进度反馈
- 友好的错误解释
- 清晰的下一步指导

---

## 下一步

1. **实现 MCP 服务器** - 编写完整的 TypeScript 代码
2. **测试集成** - 在 Claude Code 中测试所有功能
3. **文档完善** - 添加更多示例和最佳实践
4. **功能扩展** - 添加批量处理、进度保存等功能

---

**使用 LLM + MCP，NFT 迁移变得像对话一样简单！** 🚀
