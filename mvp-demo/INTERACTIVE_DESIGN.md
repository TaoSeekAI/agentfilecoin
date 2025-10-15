# 交互式分阶段操作系统设计

## 1. 设计目标

将当前的一次性完整执行流程改造为可交互、可人工干预的分阶段操作系统，允许：

- **暂停和恢复**：每个阶段完成后可以停止，等待人工确认
- **状态持久化**：工作流状态保存到文件，可跨会话恢复
- **灵活控制**：人工可以在阶段间修改参数、检查结果、决定是否继续
- **MCP 集成**：通过 Model Context Protocol 暴露工具接口，让 AI Agent 可以调用
- **审计追踪**：完整记录每个阶段的操作和决策

## 2. 架构设计

### 2.1 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Interface                      │
│  (提供工具接口给 Claude Agent/其他 AI Agent 调用)            │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────┐
│  Workflow Engine │    │  State Manager  │
│  (工作流控制器)   │◄───┤  (状态持久化)   │
└────────┬────────┘    └─────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│Phase │  │Phase │  ... (7个阶段)
│  1   │  │  2   │
└──────┘  └──────┘
```

### 2.2 数据流

```
1. 用户/Agent 调用 MCP 工具 → "start_phase_1"
2. Workflow Engine 检查状态 → 是否可以执行
3. 执行 Phase 1 → 扫描 NFT
4. 保存结果到 State Manager
5. 返回结果给用户/Agent
6. 等待下一个指令 → "continue_to_phase_2"
7. ... 循环直到完成所有阶段
```

## 3. 阶段定义

### Phase 1: Initialize & Register Agent
**输入**: 无（使用 .env 配置）
**输出**: Agent ID, 注册交易哈希
**可人工干预**: 检查 Agent 元数据，决定是否继续

### Phase 2: Scan NFT Project
**输入**: Phase 1 的 Agent ID
**输出**: NFT 扫描报告，IPFS CID 列表
**可人工干预**: 审查扫描结果，过滤 CID，决定迁移哪些

### Phase 3: Create Validation Request
**输入**: Phase 1 的 Agent ID, Phase 2 的 CID 列表
**输出**: Validation Request Hash, 任务元数据
**可人工干预**: 审查任务描述，修改验证者地址

### Phase 4: Migrate IPFS to Filecoin
**输入**: Phase 2 的 CID 列表
**输出**: 迁移报告，Filecoin Piece CIDs
**可人工干预**: 检查迁移结果，重试失败的 CID

### Phase 5: Generate Proof
**输入**: Phase 4 的迁移报告
**输出**: 证明元数据 URI
**可人工干预**: 审查证明内容，添加额外说明

### Phase 6: Validator Review & Submit
**输入**: Phase 3 的 Request Hash, Phase 5 的 Proof URI
**输出**: 验证响应交易哈希
**可人工干预**: **关键决策点** - 批准/拒绝验证

### Phase 7: Finalize & Report
**输入**: 所有前置阶段的结果
**输出**: 最终报告
**可人工干预**: 查看完整报告，导出数据

## 4. MCP 工具接口设计

### 4.1 工作流控制工具

```javascript
// 获取当前状态
tool: "get_workflow_status"
returns: {
  currentPhase: 1-7 | "completed" | "not_started",
  phaseResults: {...},
  nextActions: ["continue", "retry", "modify_params"]
}

// 开始新的工作流
tool: "start_new_workflow"
params: {
  workflowId?: string, // 可选，用于恢复
  config?: {...}       // 可选，覆盖 .env 配置
}

// 执行指定阶段
tool: "execute_phase"
params: {
  phase: 1-7,
  params?: {...}  // 阶段特定参数
}

// 重置工作流
tool: "reset_workflow"
```

### 4.2 阶段特定工具

```javascript
// Phase 1: 注册 Agent
tool: "register_agent"
params: {
  metadata?: {...}  // 可选，自定义元数据
}

// Phase 2: 扫描 NFT
tool: "scan_nft_project"
params: {
  contractAddress?: string,
  startTokenId?: number,
  endTokenId?: number
}

// Phase 3: 创建验证请求
tool: "create_validation_request"
params: {
  agentId: number,
  taskDescription: string,
  validatorAddress: string,
  cidList: string[]
}

// Phase 4: 迁移到 Filecoin
tool: "migrate_to_filecoin"
params: {
  cidList: string[],
  batchSize?: number
}

// Phase 5: 生成证明
tool: "generate_proof"
params: {
  migrationResults: {...}
}

// Phase 6: 提交验证响应
tool: "submit_validation_response"
params: {
  requestHash: string,
  approved: boolean,
  proofUri: string,
  comments?: string
}

// Phase 7: 生成最终报告
tool: "generate_final_report"
```

### 4.3 查询工具

```javascript
// 查询 Agent 信息
tool: "query_agent"
params: { agentId: number }

// 查询验证请求
tool: "query_validation_request"
params: { requestHash: string }

// 查询 IPFS 可用性
tool: "check_ipfs_availability"
params: { cid: string }

// 查询 Filecoin 存储状态
tool: "check_filecoin_status"
params: { pieceCid: string }
```

## 5. 状态管理

### 5.1 状态文件结构

```json
{
  "workflowId": "workflow-1234567890",
  "createdAt": "2025-10-15T12:00:00Z",
  "updatedAt": "2025-10-15T12:30:00Z",
  "currentPhase": 3,
  "status": "waiting_for_input",
  "config": {
    "nftContract": "0x...",
    "validatorAddress": "0x..."
  },
  "phases": {
    "phase1": {
      "status": "completed",
      "startedAt": "2025-10-15T12:00:00Z",
      "completedAt": "2025-10-15T12:05:00Z",
      "result": {
        "agentId": 75,
        "txHash": "0x...",
        "metadataUri": "file://..."
      }
    },
    "phase2": {
      "status": "completed",
      "result": {
        "scannedTokens": 5,
        "uniqueCids": ["Qm...", "Qm..."]
      }
    },
    "phase3": {
      "status": "in_progress",
      "startedAt": "2025-10-15T12:28:00Z"
    }
  },
  "userActions": [
    {
      "timestamp": "2025-10-15T12:25:00Z",
      "action": "reviewed_scan_results",
      "decision": "approved",
      "comments": "NFT 扫描结果符合预期"
    }
  ]
}
```

### 5.2 状态存储位置

```
./workflows/
  ├── active-workflow.json          # 当前活动的工作流
  ├── workflow-{id}.json           # 历史工作流存档
  └── phase-outputs/
      ├── phase1-agent-metadata.json
      ├── phase2-nft-scan.json
      ├── phase3-validation-request.json
      ├── phase4-migration-report.json
      ├── phase5-proof.json
      └── phase7-final-report.json
```

## 6. 实现计划

### 6.1 文件结构

```
mvp-demo/
├── mcp-server/
│   ├── index.js                    # MCP Server 主入口
│   ├── tools/                      # MCP 工具定义
│   │   ├── workflow-tools.js       # 工作流控制工具
│   │   ├── phase-tools.js          # 阶段执行工具
│   │   └── query-tools.js          # 查询工具
│   └── package.json
├── workflow-engine/
│   ├── WorkflowEngine.js           # 工作流引擎
│   ├── StateManager.js             # 状态管理器
│   ├── PhaseExecutor.js            # 阶段执行器
│   └── phases/
│       ├── Phase1_RegisterAgent.js
│       ├── Phase2_ScanNFT.js
│       ├── Phase3_CreateRequest.js
│       ├── Phase4_MigrateFilecoin.js
│       ├── Phase5_GenerateProof.js
│       ├── Phase6_SubmitValidation.js
│       └── Phase7_FinalReport.js
├── workflows/                      # 工作流状态存储
└── cli.js                         # CLI 交互界面（可选）
```

### 6.2 实现步骤

1. **创建 StateManager** - 负责读写状态文件
2. **创建 PhaseExecutor** - 封装每个阶段的执行逻辑
3. **创建 WorkflowEngine** - 协调阶段执行和状态转换
4. **创建 MCP Server** - 暴露工具接口
5. **实现每个阶段的独立模块** - 从现有 demo.js 拆分
6. **创建 CLI 界面**（可选）- 方便手动测试
7. **编写测试用例** - 验证每个阶段独立执行
8. **编写操作指南** - 说明如何使用

## 7. 使用场景示例

### 7.1 CLI 交互模式

```bash
$ node cli.js

🚀 NFT IPFS to Filecoin Migration - Interactive Mode
Current Status: Not Started

Available Commands:
  start         - Start new workflow
  status        - Show current status
  continue      - Continue to next phase
  retry         - Retry current phase
  phase <n>     - Jump to specific phase
  query         - Query blockchain data
  reset         - Reset workflow
  help          - Show this help

> start
✅ Workflow started: workflow-1234567890

Phase 1: Register Agent
  Metadata: {...}
  Proceed? (y/n/modify): y

✅ Agent registered: ID 75
📋 Transaction: 0x...

Phase 1 Complete! Next: Phase 2 (Scan NFT Project)
> continue

Phase 2: Scan NFT Project
  Contract: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
  Range: 0-4
  Proceed? (y/n/modify): y

✅ Scanned 5 tokens
📦 Found 2 unique IPFS CIDs
  1. Qm...
  2. Qm...

Review scan results? (y/n): y
Select CIDs to migrate (comma-separated, or 'all'): all

Phase 2 Complete! Next: Phase 3 (Create Validation Request)
> continue

...
```

### 7.2 MCP Agent 模式

```
User: "帮我迁移 Azuki NFT 项目的 IPFS 数据到 Filecoin"

Agent: 我会使用分阶段的方式来完成这个任务。让我先检查工作流状态。

[调用 MCP: get_workflow_status]

Agent: 当前没有活动的工作流。我会开始一个新的工作流。

Phase 1: 注册 Agent
[调用 MCP: register_agent]
✅ Agent ID: 75

Agent: Agent 已成功注册。让我继续扫描 NFT 项目。

Phase 2: 扫描 NFT
[调用 MCP: scan_nft_project]
✅ 扫描完成：5 个代币，2 个 IPFS CID

Agent: 扫描结果如下：
  - Token 0-4: Azuki NFTs
  - IPFS CIDs: Qm... (metadata), Qm... (image)

是否继续创建验证请求？

User: "是的，使用默认验证者"

Agent: 好的，我会创建验证请求。

Phase 3: 创建验证请求
[调用 MCP: create_validation_request]
✅ Request Hash: 0x...

Agent: 验证请求已创建。现在开始迁移 IPFS 数据到 Filecoin。

Phase 4: 迁移到 Filecoin
[调用 MCP: migrate_to_filecoin]
✅ 迁移完成：2/2 成功

Agent: 所有 IPFS 内容已成功迁移到 Filecoin。
  - Piece CID: baga6ea4...

是否生成证明并提交验证？

User: "是的，请继续"

[后续阶段...]
```

## 8. 优势

### 8.1 对比一次性执行

| 特性 | 一次性执行 | 分阶段交互 |
|------|-----------|-----------|
| 灵活性 | ❌ 必须全部完成 | ✅ 可随时暂停/恢复 |
| 人工审查 | ❌ 无法干预 | ✅ 每阶段可审查 |
| 错误处理 | ❌ 失败需重头开始 | ✅ 可重试单个阶段 |
| 参数调整 | ❌ 需要重新运行 | ✅ 阶段间可修改 |
| 状态追踪 | ❌ 无持久化 | ✅ 完整状态记录 |
| AI Agent 集成 | ❌ 难以集成 | ✅ MCP 标准接口 |

### 8.2 实际应用场景

1. **审计需求**：每个阶段需要人工批准
2. **分批处理**：NFT 项目太大，需要分批迁移
3. **成本控制**：暂停检查 gas 费用，等待低价时段
4. **测试调试**：逐步执行，排查问题
5. **协作工作**：不同角色负责不同阶段
6. **AI 辅助**：AI Agent 执行技术任务，人工做决策

## 9. 下一步

1. 实现 StateManager 和基础架构
2. 拆分现有 demo.js 为独立阶段模块
3. 实现 MCP Server 接口
4. 创建 CLI 交互界面
5. 编写测试用例
6. 编写操作指南文档
