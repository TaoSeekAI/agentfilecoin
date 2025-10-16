# 🎮 NFT 迁移系统 - 随意体验指南

**目标**: 让你可以随意玩转整个 NFT IPFS → Filecoin 迁移系统，自由探索各种功能！

---

## 📋 目录

1. [快速上手 (5 分钟)](#快速上手-5-分钟)
2. [交互式体验 (推荐)](#交互式体验-推荐)
3. [一键批量体验](#一键批量体验)
4. [自由探索各个功能](#自由探索各个功能)
5. [MCP + Claude Code 体验](#mcp--claude-code-体验)
6. [高级玩法](#高级玩法)

---

## 快速上手 (5 分钟)

### 步骤 1: 进入项目目录

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo
```

### 步骤 2: 检查环境

```bash
# 查看钱包余额
node check-balances.js
```

**预期输出**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💰 Wallet Balance Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wallet Address: 0xB34d4c8E3AcCB5FA62455228281649Be525D4e59

Sepolia (Validation Network):
  ETH: 0.049 ETH ✅

Filecoin Calibration (Storage Network):
  FIL: 105.0 FIL ✅
  USDFC (钱包): 5.0 USDFC ✅
  USDFC (Payments): 40.0 USDFC ✅
```

### 步骤 3: 选择你的体验方式

**有三种方式可以玩**:

```bash
# 方式 1: 交互式体验 (最推荐! 可以随时暂停/继续)
node interactive.js

# 方式 2: 一键完整演示 (自动执行所有步骤)
node demo.js

# 方式 3: 单独测试各个功能 (自由探索)
# (见下面的详细说明)
```

---

## 交互式体验 (推荐)

### 🎯 为什么推荐?

- ✅ **随时暂停**: 可以中途退出，下次继续
- ✅ **自由选择**: 跳过某些阶段，只玩你想玩的
- ✅ **查看状态**: 随时查看进度和结果
- ✅ **重新执行**: 某个阶段失败了可以单独重试

### 启动交互式系统

```bash
node interactive.js
```

### 主菜单界面

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 NFT IPFS to Filecoin Migration - Interactive System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Main Menu:

  1. 🚀 Start New Migration
  2. ▶️  Continue Previous Migration
  3. 📊 View Current Status
  4. 🔧 Execute Single Phase
  5. 🗑️  Reset Workflow
  6. ❌ Exit

Enter your choice (1-6):
```

### 🎮 体验玩法

#### 玩法 1: 完整流程体验

```
1. 选择 "1. Start New Migration"
   ↓
2. 系统自动执行 Phase 1 (注册 Agent)
   ↓
3. 等待完成，按任意键继续
   ↓
4. 自动执行 Phase 2 (扫描 NFT)
   ↓
5. 继续... 直到 Phase 7 完成

🎉 恭喜! 完成了完整的迁移流程!
```

#### 玩法 2: 单步调试体验

```
1. 选择 "4. Execute Single Phase"
   ↓
2. 输入想执行的阶段: "1" (只执行 Phase 1)
   ↓
3. 查看结果
   ↓
4. 返回主菜单，继续执行 "2" (Phase 2)
   ↓
5. 一步一步慢慢玩...

💡 适合想深入了解每个阶段的人!
```

#### 玩法 3: 查看状态 + 继续

```
1. 先执行几个阶段 (比如 Phase 1-3)
   ↓
2. Ctrl+C 退出
   ↓
3. 下次进来选择 "2. Continue Previous Migration"
   ↓
4. 系统从上次中断的地方继续!

💡 不用一次性跑完，随时暂停随时继续!
```

#### 玩法 4: 重置重新来

```
1. 选择 "5. Reset Workflow"
   ↓
2. 清空所有状态
   ↓
3. 重新开始一个新的迁移任务

💡 想重新体验从头开始的感觉!
```

### 各个阶段详解

```
Phase 1: 注册 ERC-8004 Agent
  ↓ 大约 30 秒
  ↓ 返回: Agent ID, Transaction Hash
  💡 这里会在 Sepolia 链上创建 Agent 身份

Phase 2: 扫描 NFT
  ↓ 大约 1 分钟 (取决于 NFT 数量)
  ↓ 返回: NFT 列表, IPFS CIDs
  💡 从 Ethereum Mainnet 读取 Azuki NFT 数据

Phase 3: 创建验证请求
  ↓ 大约 30 秒
  ↓ 返回: Request Hash
  💡 在 ERC-8004 ValidationRegistry 创建请求

Phase 4: 迁移到 Filecoin
  ⚠️ 大约 5-10 分钟 (取决于 Storage Provider)
  ↓ 返回: Filecoin CIDs
  💡 这是最耗时的阶段，需要耐心等待

Phase 5: 生成证明
  ↓ 大约 1 分钟
  ↓ 返回: Proof URI
  💡 生成迁移执行证明

Phase 6: 提交验证响应
  ↓ 大约 30 秒
  ↓ 返回: Validation Status
  💡 验证者确认迁移结果

Phase 7: 生成最终报告
  ↓ 几秒钟
  ↓ 返回: 完整报告
  💡 汇总所有结果
```

---

## 一键批量体验

### 适合场景

- ✅ 想快速看到整个流程
- ✅ 不想一步一步操作
- ✅ 想演示给别人看

### 执行命令

```bash
node demo.js
```

### 过程概览

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Starting NFT Migration Demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/7] Registering ERC-8004 Agent...
✅ Agent registered! ID: 123

[2/7] Scanning NFT Contract...
✅ Found 5 NFTs

[3/7] Creating Validation Request...
✅ Request created! Hash: 0xabc...

[4/7] Migrating to Filecoin...
⏳ This may take 5-10 minutes...
[Progress: 1/5] Uploading Token #0...
[Progress: 2/5] Uploading Token #1...
...
✅ All uploaded!

[5/7] Generating Proof...
✅ Proof generated!

[6/7] Submitting Validation...
✅ Validation approved!

[7/7] Generating Final Report...
✅ Report saved to: ./output/final-report.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎉 Migration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
  - Total NFTs: 5
  - Successful: 5
  - Failed: 0
  - Agent ID: 123
  - Validation: Approved ✅

📁 Report: ./output/final-report.json
```

### 查看结果

```bash
# 查看完整报告
cat ./output/final-report.json

# 查看 Agent 元数据
cat ./output/agent-metadata.json

# 查看任务元数据
cat ./output/task-metadata.json

# 查看证明数据
cat ./output/proof-metadata.json
```

---

## 自由探索各个功能

### 1. 测试 Filecoin 上传

```bash
# 测试上传一个小文件 (1.1 MB)
node test-real-upload-small.js
```

**这个会做什么?**
- ✅ 初始化 Synapse SDK
- ✅ 检查 USDFC 余额
- ✅ 创建 Storage Context
- ✅ 上传测试数据
- ✅ 返回 PieceCID

**预期输出**:
```
🔧 Initializing Synapse SDK...
✅ SDK initialized

💰 Checking balances...
  USDFC (Wallet): 5.0 USDFC
  USDFC (Payments): 40.0 USDFC

📦 Creating storage context...
✅ Selected Provider: ezpdpz-calib
✅ Data set: 565

📤 Uploading test metadata...
⏳ Waiting for piece to be parked...
✅ Upload complete! PieceCID: bafybeiabc123...

🔗 Retrieval URL: https://pdp.vxb.ai/calibration/piece/...
```

### 2. 检查授权状态

```bash
# 查看当前的授权设置
node pre-upload-check.js
```

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Pre-Upload Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 私钥配置: ✅
2. SDK 版本: ✅ v0.33.0
3. FIL 余额: ✅ 105.0 FIL
4. USDFC (Wallet): ✅ 5.0 USDFC
5. USDFC (Payments): ✅ 40.0 USDFC
6. 服务授权: ✅

✅ All checks passed! Ready to upload.
```

### 3. 重新设置授权

```bash
# 如果授权不足，重新设置
node setup-via-sdk.js
```

**这个会做什么?**
- 存入 35 USDFC 到 Payments 合约
- 授权 Warm Storage 服务
- 验证设置成功

### 4. 查询合约地址

```bash
# 获取 Filecoin 相关合约地址
node get-real-addresses.js
```

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 Filecoin Contract Addresses
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payments: 0x1096025c9D6B29E12E2f04965F6E64d564Ce0750
Warm Storage: 0x80617b65FD2EEa1D7fDe2B4F85977670690ed348
USDFC: 0xb3042734b608a1b16e9e86b374a3f3e389b4cdf0

Network: Filecoin Calibration Testnet
```

### 5. 测试网络连接

```bash
# 测试是否可以访问 Filecoin 网络
curl https://api.calibration.node.glif.io/rpc/v1 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 6. 单独测试各个 Phase

```bash
# 只测试 Phase 1 (注册 Agent)
node test-phase1-filecoin.js

# 输出会包含:
# - Agent ID
# - Transaction Hash
# - Metadata URI (存储在 Filecoin)
```

---

## MCP + Claude Code 体验

### 前提条件

你需要先安装 Claude Code Desktop 应用。

### 步骤 1: 构建 MCP Server

```bash
cd ../mcp-nft-migration
npm install
npm run build
```

### 步骤 2: 测试 MCP Server

```bash
# 本地测试
node test-mcp-local.js
```

**预期输出**:
```
=== MCP Server 本地测试 ===

1. 启动 MCP Server...
✅ MCP Server 启动成功

2. 测试工具列表 (ListTools)...
✅ 接收到 9 个工具:
   - verify_setup
   - setup_approvals
   - check_balances
   - upload_to_filecoin
   - test_upload
   - nft_scan
   - get_nft_metadata
   - erc8004_validate
   - update_contract_uri

✅ 测试完成！
```

### 步骤 3: 配置 Claude Code

**macOS/Linux**:
```bash
# 编辑配置文件
nano ~/.config/Claude/claude_desktop_config.json
```

**Windows**:
```
notepad %APPDATA%\Claude\claude_desktop_config.json
```

**添加配置**:
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": [
        "/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js"
      ],
      "env": {
        "PRIVATE_KEY": "0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f",
        "WALLET_ADDRESS": "0xB34d4c8E3AcCB5FA62455228281649Be525D4e59",
        "ETHEREUM_NETWORK_RPC_URL": "https://eth-sepolia.public.blastapi.io",
        "FILECOIN_NETWORK_RPC_URL": "https://api.calibration.node.glif.io/rpc/v1",
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io"
      }
    }
  }
}
```

⚠️ **重要**: 将路径替换为你的实际路径！

### 步骤 4: 重启 Claude Code

完全退出 Claude Code Desktop，然后重新启动。

### 步骤 5: 开始用自然语言玩！

在 Claude Code 中尝试这些命令：

#### 基础命令

```
"请检查我的环境配置"
"显示我的钱包余额"
"帮我测试 Filecoin 上传功能"
```

#### 高级命令

```
"扫描合约 0xED5AF388653567Af2F388E6224dC7C4b3241C544 的 NFT"
"帮我将 Token ID #0 迁移到 Filecoin"
"检查我的 ERC-8004 验证状态"
```

#### 完整流程

```
"帮我将合约 0xED5AF388653567Af2F388E6224dC7C4b3241C544 的前 5 个 NFT 迁移到 Filecoin"
```

Claude 会自动：
1. 验证环境
2. 注册 Agent
3. 扫描 NFT
4. 创建验证请求
5. 上传到 Filecoin
6. 更新合约 URI
7. 提交验证
8. 生成报告

---

## 高级玩法

### 1. 修改 NFT 范围

编辑 `.env` 文件：
```bash
# 默认测试 5 个 NFT (Token ID 0-4)
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4

# 改成测试 10 个 NFT
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=9

# 或者测试特定范围
NFT_START_TOKEN_ID=100
NFT_END_TOKEN_ID=105
```

然后重新运行：
```bash
node demo.js
# 或
node interactive.js
```

### 2. 测试不同的 NFT 项目

编辑 `.env` 文件：
```bash
# 默认: Azuki
NFT_CONTRACT_ADDRESS=0xED5AF388653567Af2F388E6224dC7C4b3241C544

# 改成 Bored Ape Yacht Club
NFT_CONTRACT_ADDRESS=0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4

# 或者 Pudgy Penguins
NFT_CONTRACT_ADDRESS=0xBd3531dA5CF5857e7CfAA92426877b022e612cf8
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4
```

### 3. 使用代理/不使用代理测试

```bash
# 使用代理 (已配置在 .env)
node test-real-upload-small.js

# 不使用代理 (临时禁用)
unset HTTP_PROXY
unset HTTPS_PROXY
node test-real-upload-small.js

# 恢复代理
export HTTP_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
export HTTPS_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
```

### 4. 查看链上数据

#### Sepolia (ERC-8004)

```bash
# 查看 Agent 注册交易
# 复制输出的 Transaction Hash，然后访问:
https://sepolia.etherscan.io/tx/0x[交易哈希]

# 查看 ERC-8004 合约
https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A
```

#### Filecoin Calibration

```bash
# 查看上传的数据
# 复制输出的 PieceCID，然后访问:
https://pdp.vxb.ai/calibration

# 或者使用 IPFS 网关
https://ipfs.io/ipfs/[PieceCID]
```

### 5. 自定义 Agent 元数据

创建自己的 Agent 配置：

```javascript
// 编辑 interactive.js 或 demo.js
const customMetadata = {
  name: '我的超级 NFT 迁移 Agent',
  description: '专门迁移 Azuki NFT 的智能助手',
  capabilities: {
    capabilities: [
      'nft-scanning',
      'ipfs-retrieval',
      'filecoin-upload',
      'erc8004-validation',
      'custom-feature-1',
      'custom-feature-2'
    ],
    version: '2.0.0',
    author: '你的名字'
  }
};

// 然后在注册 Agent 时使用这个元数据
```

### 6. 调试模式

```bash
# 启用详细日志
export DEBUG=*
node demo.js

# 只看特定模块的日志
export DEBUG=synapse:*
node test-real-upload-small.js

# 禁用日志
unset DEBUG
```

### 7. 并行测试

在多个终端同时运行：

**终端 1**:
```bash
node interactive.js
# 执行 Phase 1-3
```

**终端 2**:
```bash
node test-real-upload-small.js
# 同时测试上传功能
```

**终端 3**:
```bash
watch -n 5 'node check-balances.js'
# 实时监控余额变化
```

---

## 🎯 推荐的体验路径

### 路径 1: 新手快速体验 (15 分钟)

```
1. node check-balances.js
   ↓ 确认余额充足

2. node test-real-upload-small.js
   ↓ 测试基本上传功能 (3-5 分钟)

3. node interactive.js
   ↓ 选择 "1. Start New Migration"
   ↓ 完整体验所有 7 个阶段 (10 分钟)

🎉 完成! 你已经体验了完整的迁移流程!
```

### 路径 2: 深度探索 (30 分钟)

```
1. node check-balances.js
   ↓

2. node pre-upload-check.js
   ↓ 详细检查环境

3. node interactive.js
   ↓ 选择 "4. Execute Single Phase"
   ↓ 逐个执行 Phase 1-7
   ↓ 每个阶段后查看输出文件

4. 查看所有生成的文件:
   ls -lh ./output/
   cat ./output/agent-metadata.json
   cat ./output/final-report.json

🎓 完成! 你已经深入了解了每个阶段!
```

### 路径 3: MCP 自然语言体验 (20 分钟)

```
1. cd ../mcp-nft-migration
   ↓

2. npm run build
   ↓

3. node test-mcp-local.js
   ↓ 验证 MCP Server 正常

4. 配置 Claude Code Desktop
   ↓

5. 在 Claude Code 中用自然语言玩:
   "帮我测试上传功能"
   "扫描 Azuki 合约的 NFT"
   "迁移 Token ID #0"

🚀 完成! 体验了最先进的 AI 交互方式!
```

### 路径 4: 自由探索 (随意)

```
想测试什么就测试什么:
- 修改 NFT 范围
- 尝试不同的 NFT 项目
- 调试单个功能
- 查看链上数据
- 自定义配置

🎮 随心所欲地玩!
```

---

## ⚠️ 常见问题

### Q1: 上传超时怎么办？

**原因**: Storage Provider 响应慢（不是代码问题）

**解决**:
1. 等待几个小时后重试
2. 或者继续其他测试，上传可以跳过
3. 查看 CURRENT_STATUS.md 了解详情

### Q2: 余额不足怎么办？

**检查**:
```bash
node check-balances.js
```

**获取测试币**:
- Sepolia ETH: https://sepoliafaucet.com/
- Calibration FIL: https://faucet.calibnet.chainsafe-fil.io/
- USDFC: https://pdp.vxb.ai/faucet

### Q3: 代理连接失败？

**禁用代理**:
```bash
unset HTTP_PROXY
unset HTTPS_PROXY
```

或者编辑 `.env`，注释掉代理配置：
```bash
# HTTP_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
# HTTPS_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
```

### Q4: 如何重置所有状态？

**交互式系统**:
```
node interactive.js
→ 选择 "5. Reset Workflow"
```

**手动删除**:
```bash
rm -f workflow-state.json
rm -rf output/*
```

---

## 📚 相关文档

- **完整测试指南**: `TESTING_GUIDE.md` (60+ 页详细文档)
- **快速开始**: `QUICK_START.md` (5 分钟指南)
- **故障排查**: `TROUBLESHOOTING.md` (常见问题)
- **当前状态**: `CURRENT_STATUS.md` (项目状态)
- **MCP 集成**: `../mcp-nft-migration/README.md`
- **Claude Code 配置**: `../mcp-nft-migration/CLAUDE_CODE_SETUP.md`

---

## 🎉 开始玩吧！

选择一个路径，开始你的探索之旅：

```bash
# 最简单的开始
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo
node interactive.js
```

**祝玩得开心！** 🚀

有任何问题随时问 Claude！
