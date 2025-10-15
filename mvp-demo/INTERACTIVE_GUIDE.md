# 交互式NFT迁移工作流 - 操作指南

## 📖 概述

这是一个可交互、可人工干预的分阶段NFT IPFS到Filecoin迁移系统。与一次性执行的`demo.js`不同，这个系统允许你：

- ✅ **分阶段执行**：每个阶段独立运行，可以暂停检查
- ✅ **人工审查**：每个阶段完成后可以查看结果，决定是否继续
- ✅ **状态持久化**：工作流状态自动保存，可跨会话恢复
- ✅ **错误恢复**：失败的阶段可以重试
- ✅ **灵活控制**：可以跳转到特定阶段，修改参数

## 🏗️ 系统架构

```
interactive-cli.js          # CLI交互界面
    ↓
WorkflowEngine             # 工作流引擎
    ↓
StateManager               # 状态管理器
    ↓
Phase Modules              # 7个独立阶段模块
    ↓
workflows/                 # 状态文件存储目录
```

## 📦 7个工作流阶段

### Phase 1: Register ERC-8004 Agent
**功能**: 在Sepolia测试网注册AI Agent身份
**输入**: 无（使用.env配置）
**输出**: Agent ID, 注册交易哈希
**可干预**: 检查Agent元数据

### Phase 2: Scan NFT Project
**功能**: 扫描以太坊主网NFT合约，提取IPFS CID
**输入**: Phase 1的Agent ID
**输出**: NFT扫描报告，IPFS CID列表
**可干预**: 审查扫描结果，选择要迁移的CID

### Phase 3: Create Validation Request
**功能**: 创建ERC-8004验证请求
**输入**: Phase 1的Agent ID, Phase 2的CID列表
**输出**: Validation Request Hash
**可干预**: 修改验证者地址，审查任务描述

### Phase 4: Migrate IPFS to Filecoin
**功能**: 下载IPFS内容并上传到Filecoin
**输入**: Phase 2的CID列表
**输出**: 迁移报告，Filecoin Piece CIDs
**可干预**: 检查迁移结果，重试失败的CID

### Phase 5: Generate Proof
**功能**: 生成证明元数据
**输入**: Phase 4的迁移报告
**输出**: 证明URI和元数据
**可干预**: 审查证明内容，添加说明

### Phase 6: Submit Validation Response
**功能**: 验证者提交验证响应
**输入**: Phase 3的Request Hash, Phase 5的Proof
**输出**: 验证响应交易哈希
**可干预**: **关键决策 - 批准/拒绝**

### Phase 7: Generate Final Report
**功能**: 查询最终状态，生成完整报告
**输入**: 所有前置阶段的结果
**输出**: 完整工作流报告
**可干预**: 查看并导出报告

## 🚀 快速开始

### 1. 环境准备

确保`.env`文件已配置：

```bash
# 三个网络配置
NFT_NETWORK_RPC_URL=https://eth-mainnet.public.blastapi.io
VALIDATION_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1

# 钱包配置
PRIVATE_KEY=0x...              # Agent Owner钱包
VALIDATOR_PRIVATE_KEY=0x...     # 验证者钱包

# ERC-8004合约地址（官方部署）
AGENT_IDENTITY_ADDRESS=0x7177a6867296406881E20d6647232314736Dd09A
AGENT_VALIDATION_ADDRESS=0x662b40A526cb4017d947e71eAF6753BF3eeE66d8

# NFT配置
NFT_CONTRACT_ADDRESS=0xED5AF388653567Af2F388E6224dC7C4b3241C544
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4
```

### 2. 启动交互式CLI

```bash
cd mvp-demo
node interactive-cli.js
```

### 3. 基本操作流程

```
# 1. 启动新工作流
> start

# 2. 执行Phase 1 - 注册Agent
> phase 1
⚠️  Execute Phase 1? (y/n): y
✅ Phase 1 completed!

# 3. 查看结果
> results

# 4. 继续下一个阶段
> continue
⚠️  Execute Phase 2? (y/n): y
✅ Phase 2 completed!

# 5. 继续后续阶段...
> continue
> continue
...

# 6. 完成后查看完整报告
> results
```

## 📝 命令参考

### 基本命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `start` | 开始新的工作流 | `> start` |
| `status` | 显示当前状态 | `> status` |
| `continue` | 继续到下一个阶段 | `> continue` |
| `phase <N>` | 执行指定阶段（1-7） | `> phase 3` |
| `retry` | 重试当前阶段 | `> retry` |
| `results` | 显示所有阶段结果 | `> results` |
| `reset` | 重置工作流 | `> reset` |
| `help` | 显示帮助 | `> help` |
| `exit` | 退出程序 | `> exit` |

### 状态文件位置

```
workflows/
├── active-workflow.json              # 当前活动工作流
├── workflow-{id}.json               # 历史工作流
└── phase-outputs/
    ├── phase1-output.json
    ├── phase2-output.json
    ...
    └── phase7-output.json
```

## 🎯 使用场景

### 场景1：完整自动化执行

适合对流程熟悉，希望快速完成的用户。

```bash
> start
> phase 1
y
> continue
y
> continue
y
# ... 继续所有阶段
> results
```

### 场景2：谨慎审查模式

每个阶段完成后仔细检查结果。

```bash
> start
> phase 1
y

# 检查Agent注册结果
> results

# 审查无误，继续
> phase 2
y

# 检查扫描到的IPFS CID
> results

# 发现某个CID不需要迁移，这里可以：
# 1. 修改workflows/active-workflow.json
# 2. 或者继续下一步（后续可以重试）

> continue
y
...
```

### 场景3：错误恢复

某个阶段失败后重试。

```bash
> phase 4
y
❌ Phase 4 failed: Network timeout

# 检查网络后重试
> retry
y
✅ Phase 4 completed!
```

### 场景4：跨会话恢复

工作流可以跨终端会话恢复。

```bash
# Session 1
> start
> phase 1
y
> phase 2
y
> exit

# Session 2 (稍后)
> node interactive-cli.js
# 系统自动加载active-workflow.json
> status
📊 Current Workflow: workflow-xxx
   Progress: 2/7 phases
   Current Phase: 2

> continue  # 从Phase 3继续
```

### 场景5：验证者审查（Phase 6关键决策）

验证者需要仔细审查迁移结果后决定批准/拒绝。

```bash
> phase 5
y  # 生成证明

# 查看迁移结果
> results
Phase 4: completed
   Migration: 2/2

# 迁移成功，批准验证
> phase 6
y
✅ Phase 6 completed!
   Validation: APPROVED
```

如果迁移失败，可以拒绝：

```bash
# 手动修改workflows/active-workflow.json
# 或者在Phase 6执行时传递参数（需要代码扩展）
```

## 🔍 状态查询

### 查看工作流摘要

```bash
> status

────────────────────────────────────────────────────────
📋 Phase Results
────────────────────────────────────────────────────────

✅ Phase 1: completed
   Agent ID: 75
   TX: 0xdc844ae...

✅ Phase 2: completed
   Unique IPFS CIDs: 2

✅ Phase 3: completed
   Request Hash: 0xaf227af...

⏳ Phase 4: in_progress

⭕ Phase 5: pending

⭕ Phase 6: pending

⭕ Phase 7: pending
```

### 查看单个阶段结果

阶段输出文件位于`workflows/phase-outputs/`：

```bash
# 查看Phase 2的完整输出
cat workflows/phase-outputs/phase2-output.json

# 查看Phase 4的迁移报告
cat workflows/phase-outputs/phase4-output.json
```

## 🛠️ 高级功能

### 修改阶段参数

可以通过修改`workflows/active-workflow.json`来调整参数：

```json
{
  "config": {
    "nftContract": "0x...",
    "startTokenId": 0,
    "endTokenId": 10,  // 修改扫描范围
    "validatorAddress": "0x..."  // 修改验证者
  }
}
```

### 审计追踪

所有用户操作和决策都记录在workflow文件中：

```json
{
  "userActions": [
    {
      "timestamp": "2025-10-15T12:25:00Z",
      "action": "reviewed_scan_results",
      "decision": "approved",
      "comments": "NFT扫描结果符合预期"
    }
  ]
}
```

### 导出报告

最终报告位于：

```bash
# Phase 7完成后
cat workflows/phase-outputs/phase7-output.json
```

## ⚠️ 重要提示

1. **网络要求**：
   - Phase 1-3, 6: 需要Sepolia测试币
   - Phase 2: 需要访问Ethereum主网（只读）
   - Phase 4: 需要Filecoin Calibration测试币

2. **钱包安全**：
   - 使用测试网钱包
   - 不要在主网上操作
   - 妥善保管私钥

3. **状态持久化**：
   - 工作流状态自动保存
   - 可以随时退出，稍后恢复
   - 删除`workflows/active-workflow.json`清空状态

4. **错误处理**：
   - 失败的阶段可以重试
   - 检查错误日志：`workflow.errors`
   - 必要时可以重置工作流

## 🐛 故障排除

### 问题1：Cannot find module

```bash
# 确保在mvp-demo目录下
cd mvp-demo
npm install
```

### 问题2：Private key not set

```bash
# 检查.env文件
cat .env | grep PRIVATE_KEY
```

### 问题3：Insufficient funds

```bash
# 检查Sepolia余额
# 使用水龙头获取测试币
```

### 问题4：Phase execution failed

```bash
# 查看详细错误
> results

# 检查工作流错误日志
cat workflows/active-workflow.json | jq '.errors'

# 重试
> retry
```

## 📚 下一步

- **MCP集成**: 创建MCP Server，让AI Agent可以调用这些工具
- **Web界面**: 创建图形化界面
- **批量处理**: 支持批量迁移大型NFT项目
- **高级查询**: 添加更多链上数据查询功能

## 🎉 总结

交互式工作流系统相比一次性执行的优势：

| 特性 | 一次性执行(demo.js) | 交互式系统 |
|------|---------------------|-----------|
| 灵活性 | ❌ 必须全部完成 | ✅ 可随时暂停/恢复 |
| 人工审查 | ❌ 无法干预 | ✅ 每阶段可审查 |
| 错误处理 | ❌ 失败需重头开始 | ✅ 可重试单个阶段 |
| 参数调整 | ❌ 需要重新运行 | ✅ 阶段间可修改 |
| 状态追踪 | ❌ 无持久化 | ✅ 完整状态记录 |
| AI集成 | ❌ 难以集成 | ✅ MCP标准接口 |

现在你可以以完全可控的方式执行NFT迁移任务！
