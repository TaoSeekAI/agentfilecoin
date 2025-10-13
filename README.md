# ERC-8004 Agent on Filecoin

基于 ERC-8004 标准的去中心化 AI Agent 系统，运行在 Filecoin 主网上。

## 项目概述

本项目实现了一个完整的符合 ERC-8004 规范的 AI Agent 系统，包括:

- **智能合约**: 部署在 Filecoin EVM 上的三个核心注册表
  - AgentIdentity: Agent 身份管理（基于 ERC-721）
  - AgentReputation: Agent 声誉系统
  - AgentValidation: Agent 工作验证系统

- **存储层**: 使用 IPFS + Filecoin 的双层存储架构
  - IPFS: 快速访问层
  - Filecoin: 持久化存储层（通过 Lighthouse API）

- **后端服务**: Rust 实现的完整后端
  - Filecoin 客户端
  - IPFS 客户端
  - 智能合约交互
  - MCP 协议支持

- **CLI 工具**: 命令行界面，用于 Agent 管理和 MCP 测试

## 系统架构

```
┌──────────────────────────────────────────────────┐
│                   CLI Tool                        │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│            Backend Service (Rust)                 │
│  ┌─────────────┬──────────────┬─────────────┐   │
│  │  Contract   │     IPFS     │  Filecoin   │   │
│  │   Client    │    Client    │   Client    │   │
│  └─────────────┴──────────────┴─────────────┘   │
└──────────┬───────────┬───────────┬───────────────┘
           │           │           │
┌──────────▼──┐  ┌────▼────┐  ┌───▼──────────┐
│  Filecoin   │  │  IPFS   │  │  Lighthouse  │
│     EVM     │  │  Node   │  │     API      │
└─────────────┘  └─────────┘  └──────────────┘
```

## 快速开始

### 前置要求

1. **Rust** (>= 1.75)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Foundry** (用于智能合约开发)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

3. **IPFS Node** (可选，用于本地测试)
```bash
# 安装 IPFS Desktop 或使用 Kubo
# https://docs.ipfs.tech/install/
```

4. **Lighthouse API Key**
   - 访问 https://files.lighthouse.storage/
   - 注册并获取 API Key

### 安装

1. 克隆仓库
```bash
git clone https://github.com/yourusername/aiagent.git
cd aiagent
```

2. 编译智能合约
```bash
cd contracts
forge build
```

3. 编译 Rust 后端
```bash
cd ../backend
cargo build --release
```

4. 安装 CLI 工具
```bash
cargo install --path .
```

### 部署合约

#### 部署到 Calibration 测试网

1. 设置环境变量
```bash
export PRIVATE_KEY="your_private_key"
export CALIBRATION_RPC="https://api.calibration.node.glif.io/rpc/v1"
```

2. 获取测试 FIL
访问 https://faucet.calibration.fildev.network/

3. 部署合约
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $CALIBRATION_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

4. 记录合约地址
部署完成后，记录输出的三个合约地址：
- AgentIdentity
- AgentReputation
- AgentValidation

### 配置 CLI

初始化配置：

```bash
agent-cli init \
  --network calibration \
  --private-key "your_private_key" \
  --identity-contract "0x..." \
  --reputation-contract "0x..." \
  --validation-contract "0x..." \
  --lighthouse-api-key "your_lighthouse_key"
```

配置文件将保存在 `~/.agent-cli/config.toml`

## 使用指南

### 1. 注册 Agent

```bash
agent-cli register \
  --name "My AI Agent" \
  --description "An intelligent agent for task automation" \
  --mcp-endpoint "mcp://localhost:3000" \
  --image ./avatar.png
```

输出示例：
```
Registering new agent...
  Name: My AI Agent
  Description: An intelligent agent for task automation
  MCP Endpoint: mcp://localhost:3000
  Uploading image...
  ✅ Image uploaded: ipfs://QmXxxx...
  Uploading metadata to IPFS...
  ✅ Metadata uploaded: ipfs://QmYyyy...
  Pinning to Filecoin...
  ✅ Pinned to Filecoin
  Registering with smart contract...

🎉 Agent registered successfully!
   Agent ID: 1
   Metadata CID: QmYyyy...
   View at: https://ipfs.io/ipfs/QmYyyy...
```

### 2. 查询 Agent 信息

```bash
agent-cli query --agent-id 1
```

输出示例：
```
Querying agent #1...

📋 Agent Information:
   Owner: 0x1234...5678
   Metadata URI: ipfs://QmYyyy...
   Registered At: 1640000000
   Active: true

📄 Metadata:
{
  "name": "My AI Agent",
  "description": "An intelligent agent for task automation",
  "image": "ipfs://QmXxxx...",
  "endpoints": [
    {
      "type": "mcp",
      "uri": "mcp://localhost:3000"
    }
  ],
  "supportedTrust": ["reputation", "validation"]
}
```

### 3. 提交反馈

```bash
agent-cli feedback \
  --agent-id 1 \
  --score 85 \
  --tags "helpful,fast,accurate" \
  --message "Great agent! Helped me complete the task efficiently."
```

输出示例：
```
Submitting feedback for agent #1...
  Score: 85/100
  Tags: ["helpful", "fast", "accurate"]
  ✅ Feedback details uploaded: ipfs://QmZzzz...

✅ Feedback submitted!
   Feedback ID: 1
```

### 4. 查询声誉

```bash
agent-cli reputation --agent-id 1
```

输出示例：
```
Fetching reputation for agent #1...

⭐ Reputation:
   Average Score: 87/100
   Total Feedbacks: 12
   Active Feedbacks: 10
```

### 5. 测试 MCP 功能

测试 calculator 工具：
```bash
agent-cli mcp-test \
  --tool "calculator" \
  --args '{"operation": "add", "a": 5, "b": 3}'
```

输出示例：
```
Testing MCP tool: calculator
  Arguments: {"operation":"add","a":5,"b":3}

✅ Tool executed successfully!
   Result: {
     "result": 8
   }
```

测试 echo 工具：
```bash
agent-cli mcp-test \
  --tool "echo" \
  --args '{"message": "Hello, MCP!"}'
```

### 6. 检查存储状态

```bash
agent-cli storage-status --cid QmYyyy...
```

输出示例：
```
Checking storage status for CID: QmYyyy...
  IPFS accessible: ✅
  Filecoin status: pinned
```

### 7. Pin 数据到 Filecoin

```bash
agent-cli pin --file ./data.json
```

输出示例：
```
Pinning file to Filecoin: ./data.json

✅ File pinned successfully!
   CID: QmAaaa...
   Gateway URL: https://ipfs.io/ipfs/QmAaaa...
```

## MCP 协议集成

本项目支持 Model Context Protocol (MCP)，允许 Agent 暴露和调用工具。

### MCP 端点格式

Agent 元数据中的 MCP 端点：
```json
{
  "endpoints": [
    {
      "type": "mcp",
      "uri": "mcp://example.com:3000"
    }
  ]
}
```

### 支持的 MCP 工具 (MVP)

1. **calculator**: 基础计算
   - 操作: add, subtract, multiply, divide
   - 参数: operation, a, b

2. **echo**: 回显消息
   - 参数: message

### 自定义 MCP 工具

在生产环境中，可以通过实现完整的 MCP 协议来添加自定义工具。参考：
https://modelcontextprotocol.io/

## 配置文件

配置文件位置: `~/.agent-cli/config.toml`

示例配置：
```toml
[network]
name = "calibration"
rpc_url = "https://api.calibration.node.glif.io/rpc/v1"
chain_id = 314159

[contracts]
identity = "0x..."
reputation = "0x..."
validation = "0x..."

[storage]
ipfs_api = "http://127.0.0.1:5001"
ipfs_gateway = "https://ipfs.io/ipfs/"
lighthouse_api_key = "xxx"
web3_storage_token = ""

[wallet]
private_key = "0x..."
address = "0x..."

[mcp]
default_timeout = 30
```

## 开发

### 运行测试

智能合约测试：
```bash
cd contracts
forge test -vvv
```

Rust 后端测试：
```bash
cd backend
cargo test
```

### 代码结构

```
.
├── contracts/              # Solidity 智能合约
│   ├── src/
│   │   ├── AgentIdentity.sol
│   │   ├── AgentReputation.sol
│   │   ├── AgentValidation.sol
│   │   └── interfaces/
│   ├── script/
│   │   └── Deploy.s.sol
│   └── test/
├── backend/                # Rust 后端
│   └── src/
│       ├── main.rs         # CLI 入口
│       ├── config.rs       # 配置管理
│       ├── contracts.rs    # 合约交互
│       ├── ipfs.rs         # IPFS 客户端
│       ├── filecoin.rs     # Filecoin 客户端
│       └── mcp.rs          # MCP 协议处理
└── docs/
    └── DESIGN.md           # 设计文档
```

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 安全考虑

1. **私钥管理**: 永远不要将私钥提交到版本控制系统
2. **合约审计**: 在主网部署前进行专业的安全审计
3. **访问控制**: 确保只有 Agent 所有者可以修改 Agent 信息
4. **数据验证**: 所有链上数据都经过验证
5. **Rate Limiting**: 反馈系统有冷却期，防止垃圾信息

## 故障排除

### IPFS 连接失败

确保 IPFS daemon 正在运行：
```bash
ipfs daemon
```

或使用 Lighthouse API（无需本地 IPFS）：
```bash
# 配置时提供 Lighthouse API key
agent-cli init --lighthouse-api-key "your_key" ...
```

### 交易失败

1. 检查账户余额：
```bash
# 使用 cast (foundry)
cast balance $YOUR_ADDRESS --rpc-url $CALIBRATION_RPC
```

2. 检查 gas price：
```bash
cast gas-price --rpc-url $CALIBRATION_RPC
```

3. 查看交易详情：
访问 https://calibration.filscan.io/

### Lighthouse API 错误

验证 API key：
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://node.lighthouse.storage/api/v0/api_key_detail
```

## 性能优化

### Gas 优化建议

1. 批量操作反馈
2. 使用事件而非存储（用于历史数据）
3. 优化存储布局

### 存储优化建议

1. 压缩 JSON 数据
2. 使用 CAR 文件格式
3. 选择性 pinning（仅 pin 重要数据）

## 路线图

- [x] MVP 实现
  - [x] 智能合约
  - [x] Rust 后端
  - [x] CLI 工具
  - [x] IPFS 集成
  - [x] Lighthouse 集成
  - [x] MCP 基础支持

- [ ] Phase 2
  - [ ] 完整 MCP 协议实现
  - [ ] Web UI
  - [ ] 高级验证机制（TEE, zkML）
  - [ ] 批量操作优化

- [ ] Phase 3
  - [ ] 主网部署
  - [ ] 安全审计
  - [ ] 性能监控
  - [ ] 文档完善

## 参考资料

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Filecoin EVM Documentation](https://docs.filecoin.io/smart-contracts/fundamentals/)
- [Lighthouse API Docs](https://docs.lighthouse.storage/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Alloy Documentation](https://alloy.rs/)

## 许可证

MIT License

## 联系方式

- GitHub Issues: https://github.com/yourusername/aiagent/issues
- Discord: [Your Discord Server]
- Email: your@email.com

## 致谢

- Ethereum Foundation (ERC-8004 规范)
- Filecoin 团队
- Lighthouse.storage
- Rust 和 Solidity 社区
