# ERC-8004 Agent 完整工作流程示例

本文档演示如何使用 Filecoin MCP 服务器和 ERC-8004 智能合约创建一个完整的去中心化 Agent 系统。

## 前提条件

1. Node.js >= 20
2. Rust >= 1.75
3. Foundry (用于合约部署)
4. Filecoin Calibration 测试网私钥和测试 FIL

## 步骤 1: 设置环境

### 1.1 安装依赖

```bash
# 克隆项目
git clone <your-repo>
cd aiagent

# 安装 MCP 服务器依赖
cd mcp-server
npm install
npm run build

# 构建 Rust 后端
cd ../backend
cargo build --release
```

### 1.2 配置环境变量

创建 `mcp-server/.env`:

```bash
PRIVATE_KEY=0x...  # 你的私钥
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
# 可选: WARM_STORAGE_ADDRESS=0x...
```

### 1.3 部署智能合约

```bash
cd contracts

export PRIVATE_KEY=0x...

forge script script/Deploy.s.sol \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1 \
  --private-key $PRIVATE_KEY \
  --broadcast
```

记录输出的三个合约地址：
- AgentIdentity: 0x...
- AgentReputation: 0x...
- AgentValidation: 0x...

## 步骤 2: 启动 Filecoin MCP 服务器

```bash
cd mcp-server
npm start
```

服务器将在 stdio 模式下运行，等待 JSON-RPC 请求。

## 步骤 3: 注册 Agent（使用 MCP）

### 3.1 创建 Agent 元数据并上传到 Filecoin

使用 MCP 客户端（或直接通过 CLI）：

```bash
# 使用我们的 CLI 工具
agent-cli register-with-filecoin \
  --name "AI Research Agent" \
  --description "An agent specialized in AI research and analysis" \
  --mcp-endpoint "stdio:./mcp-server/dist/index.js"
```

这个命令会：
1. 启动 MCP 客户端
2. 调用 `create_agent_metadata` 工具
3. 将元数据上传到 Filecoin（通过 Synapse SDK）
4. 获取 Piece CID
5. 使用该 CID 在智能合约上注册 Agent

输出示例：
```
🚀 Starting Filecoin MCP Client...
✅ MCP Client connected

📝 Creating agent metadata...
  Name: AI Research Agent
  Description: An agent specialized in AI research and analysis
  Endpoints: [{"type":"mcp","uri":"stdio:./mcp-server/dist/index.js"}]

📤 Uploading to Filecoin via MCP...
✅ Upload successful!
  Piece CID: bafk2bzaceb...
  CAR CID: bafy2bzace...
  Provider: 0x...
  Size: 512 bytes

📝 Registering on-chain...
✅ Agent registered!
  Agent ID: 1
  Transaction: 0x...
  Global ID: eip155:314159:0x...:1
```

### 3.2 验证 Agent 注册

```bash
# 查询 Agent 信息
agent-cli query --agent-id 1
```

输出：
```
📋 Agent Information:
   Agent ID: 1
   Owner: 0x...
   Metadata URI: filecoin://bafk2bzaceb...
   Registered At: 1640000000
   Active: true
   Global ID: eip155:314159:0x...:1

📄 Metadata (from Filecoin):
{
  "name": "AI Research Agent",
  "description": "An agent specialized in AI research and analysis",
  "version": "1.0",
  "endpoints": [
    {
      "type": "mcp",
      "uri": "stdio:./mcp-server/dist/index.js"
    }
  ],
  "supportedTrust": ["reputation", "validation"],
  "createdAt": "2025-10-14T10:30:00Z"
}
```

## 步骤 4: Agent 执行任务并将结果存储到 Filecoin

### 4.1 Agent 处理任务

假设 Agent 完成了一个研究任务，生成了一份报告：

```bash
# 创建示例报告
cat > research-report.json << EOF
{
  "title": "AI Ethics Analysis",
  "summary": "A comprehensive analysis of AI ethics...",
  "date": "2025-10-14",
  "findings": [
    "Finding 1...",
    "Finding 2...",
    "Finding 3..."
  ],
  "recommendations": [
    "Recommendation 1...",
    "Recommendation 2..."
  ]
}
EOF
```

### 4.2 通过 MCP 上传到 Filecoin

```bash
# 使用 CLI 上传工作结果
agent-cli store-work-result \
  --agent-id 1 \
  --file ./research-report.json \
  --task-description "AI Ethics Analysis"
```

工作流程：
1. CLI 调用 MCP 客户端
2. MCP 客户端调用 `upload_file_to_filecoin` 工具
3. MCP 服务器使用 Synapse SDK 上传到 Filecoin
4. 返回 Piece CID
5. CLI 在链上记录工作结果（可选）

输出：
```
📤 Uploading work result to Filecoin...
  File: research-report.json
  Size: 2.4 KB

✅ Upload successful!
  Piece CID: bafk2bzaced...
  CAR CID: bafy2bzacea...
  Provider: 0x...

📝 Work result stored!
  Use this CID for verification: bafk2bzaced...
```

## 步骤 5: 请求验证

### 5.1 提交验证请求

另一个用户（或 Agent）可以验证工作结果：

```bash
agent-cli request-validation \
  --agent-id 1 \
  --work-cid "bafk2bzaced..." \
  --validator "0x..." \
  --description "Verify AI Ethics Analysis"
```

输出：
```
📝 Requesting validation...
  Agent ID: 1
  Work CID: bafk2bzaced...
  Validator: 0x...

✅ Validation request created!
  Request ID: 1
  Transaction: 0x...
```

### 5.2 验证者下载并验证

验证者可以：

```bash
# 从 Filecoin 下载工作结果
agent-cli download-from-filecoin \
  --cid "bafk2bzaced..." \
  --output ./work-result.json

# 审查工作结果
cat ./work-result.json

# 提交验证结果
agent-cli submit-validation \
  --request-id 1 \
  --is-valid true \
  --proof-file ./validation-proof.json
```

### 5.3 上传验证证明到 Filecoin

```bash
# 验证证明也存储到 Filecoin
agent-cli store-validation-proof \
  --request-id 1 \
  --proof-file ./validation-proof.json
```

这会：
1. 通过 MCP 上传证明到 Filecoin
2. 在智能合约中记录证明 CID
3. 完成验证流程

## 步骤 6: 提交反馈

### 6.1 用户体验反馈

```bash
agent-cli feedback \
  --agent-id 1 \
  --score 95 \
  --tags "thorough,accurate,professional" \
  --message "Excellent analysis with comprehensive insights"
```

### 6.2 详细反馈存储到 Filecoin

对于详细的反馈报告：

```bash
# 创建详细反馈
cat > detailed-feedback.md << EOF
# Feedback for AI Research Agent

## Overview
The agent performed excellently...

## Strengths
- Comprehensive analysis
- Clear presentation
- Evidence-based conclusions

## Areas for Improvement
- Could include more recent studies
- Expand on ethical frameworks

## Rating: 95/100
EOF

# 上传并链接到反馈
agent-cli feedback-detailed \
  --agent-id 1 \
  --score 95 \
  --tags "thorough,accurate" \
  --detailed-file ./detailed-feedback.md
```

## 步骤 7: 查询声誉和统计

### 7.1 查询 Agent 声誉

```bash
agent-cli reputation --agent-id 1
```

输出：
```
⭐ Reputation for Agent #1:
   Average Score: 92/100
   Total Feedbacks: 15
   Active Feedbacks: 13

   Recent Feedback:
   - Score: 95 | Tags: thorough, accurate | From: 0x...
   - Score: 88 | Tags: helpful | From: 0x...
   - Score: 94 | Tags: professional | From: 0x...
```

### 7.2 查询验证统计

```bash
agent-cli validation-stats --agent-id 1
```

输出：
```
✅ Validation Statistics for Agent #1:
   Total Validations: 8
   Passed: 7
   Failed: 1
   Pending: 0

   Success Rate: 87.5%
```

## 步骤 8: 完整的 MCP 工作流验证

### 8.1 测试所有 MCP 工具

```bash
# 列出可用工具
agent-cli mcp-tools --list

# 测试上传
agent-cli mcp-test \
  --tool upload_to_filecoin \
  --args '{"data":"SGVsbG8gRmlsZWNvaW4h","filename":"test.txt"}'

# 测试下载
agent-cli mcp-test \
  --tool download_from_filecoin \
  --args '{"piece_cid":"bafk..."}'

# 测试状态查询
agent-cli mcp-test \
  --tool get_storage_status \
  --args '{"piece_cid":"bafk..."}'

# 测试 Agent 元数据创建
agent-cli mcp-test \
  --tool create_agent_metadata \
  --args '{
    "name":"Test Agent",
    "description":"A test agent",
    "endpoints":[{"type":"mcp","uri":"test://"}]
  }'
```

## 步骤 9: 端到端验证

### 9.1 完整流程脚本

创建 `examples/e2e-test.sh`:

```bash
#!/bin/bash
set -e

echo "=== ERC-8004 + Filecoin 端到端测试 ==="

# 1. 启动 MCP 服务器（后台）
echo "1. 启动 MCP 服务器..."
cd mcp-server
npm start &
MCP_PID=$!
sleep 2

# 2. 注册 Agent
echo "2. 注册 Agent..."
AGENT_ID=$(agent-cli register-with-filecoin \
  --name "E2E Test Agent" \
  --description "Agent for end-to-end testing" \
  --mcp-endpoint "stdio:./mcp-server/dist/index.js" \
  | grep "Agent ID" | awk '{print $NF}')

echo "   Agent ID: $AGENT_ID"

# 3. 上传工作结果
echo "3. 上传工作结果..."
echo '{"test":"data"}' > /tmp/test-work.json
WORK_CID=$(agent-cli store-work-result \
  --agent-id $AGENT_ID \
  --file /tmp/test-work.json \
  | grep "Piece CID" | awk '{print $NF}')

echo "   Work CID: $WORK_CID"

# 4. 下载并验证
echo "4. 下载工作结果..."
agent-cli download-from-filecoin \
  --cid $WORK_CID \
  --output /tmp/downloaded.json

# 验证内容
if diff /tmp/test-work.json /tmp/downloaded.json; then
  echo "   ✅ 内容验证成功"
else
  echo "   ❌ 内容验证失败"
  exit 1
fi

# 5. 请求验证
echo "5. 请求验证..."
VALIDATION_ID=$(agent-cli request-validation \
  --agent-id $AGENT_ID \
  --work-cid $WORK_CID \
  --validator $VALIDATOR_ADDRESS \
  | grep "Request ID" | awk '{print $NF}')

echo "   Validation ID: $VALIDATION_ID"

# 6. 提交反馈
echo "6. 提交反馈..."
agent-cli feedback \
  --agent-id $AGENT_ID \
  --score 90 \
  --tags "e2e-test" \
  --message "E2E test successful"

# 7. 查询结果
echo "7. 查询 Agent 信息..."
agent-cli query --agent-id $AGENT_ID

echo "8. 查询声誉..."
agent-cli reputation --agent-id $AGENT_ID

# 清理
echo "9. 清理..."
kill $MCP_PID

echo "=== ✅ 端到端测试完成 ==="
```

运行测试：

```bash
chmod +x examples/e2e-test.sh
./examples/e2e-test.sh
```

## 关键特性验证

### ✅ ERC-8004 合规性
- [x] Agent 身份注册（ERC-721-like）
- [x] 全局标识符（eip155:chainId:address:tokenId）
- [x] 声誉系统（0-100 评分）
- [x] 验证系统（请求/响应/证明）
- [x] 元数据 URI 存储

### ✅ Filecoin 集成
- [x] 通过 Synapse SDK 上传数据
- [x] Piece CID 生成和存储
- [x] 从 Filecoin 下载数据
- [x] 存储交易状态查询
- [x] 持久化存储证明

### ✅ MCP 协议集成
- [x] MCP 服务器实现（TypeScript）
- [x] MCP 客户端实现（Rust）
- [x] 5 个核心工具实现
- [x] JSON-RPC 通信
- [x] 错误处理

### ✅ 端到端流程
- [x] Agent 注册（元数据 → Filecoin → 链上）
- [x] 工作结果存储（文件 → MCP → Filecoin）
- [x] 验证流程（下载 → 验证 → 证明存储）
- [x] 反馈系统（链上 + Filecoin 详情）
- [x] 查询和统计

## 性能指标

基于 Filecoin Calibration 测试网：

- **Agent 注册**: ~2-3 分钟
  - Filecoin 上传: ~30 秒
  - 链上交易: ~30-60 秒

- **文件上传**: ~20-40 秒
  - 取决于文件大小
  - Synapse SDK 自动处理 CAR 生成

- **文件下载**: ~10-20 秒
  - 从 Filecoin 检索
  - 自动解包 CAR

- **Gas 成本**:
  - Agent 注册: ~200,000 gas
  - 反馈提交: ~100,000 gas
  - 验证请求: ~80,000 gas

## 故障排除

### MCP 服务器无法启动
```bash
# 检查 Node.js 版本
node --version  # 应该 >= 20

# 检查依赖
cd mcp-server
npm install
npm run build
```

### Synapse SDK 错误
```bash
# 确保环境变量正确
cat mcp-server/.env

# 检查私钥格式（需要 0x 前缀）
# 检查余额
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL
```

### Filecoin 上传超时
```bash
# 增加超时时间
export UPLOAD_TIMEOUT=300000  # 5 分钟

# 检查网络连接
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## 结论

本示例展示了完整的 ERC-8004 + Filecoin 工作流：

1. ✅ **Agent 注册**: 元数据存储在 Filecoin，链上注册
2. ✅ **工作存储**: 通过 MCP 将结果存储到 Filecoin
3. ✅ **验证流程**: 下载、验证、证明存储
4. ✅ **声誉系统**: 链上反馈 + Filecoin 详情
5. ✅ **MCP 集成**: 完整的工具实现和客户端

系统已准备好在 Filecoin Calibration 测试网上运行完整的去中心化 Agent 工作流！
