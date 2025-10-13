# Quick Start Guide

本指南将帮助你在 5 分钟内启动并运行第一个 ERC-8004 Agent。

## 准备工作

### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 获取测试资源

1. **Filecoin Calibration 测试网 FIL**
   - 访问: https://faucet.calibration.fildev.network/
   - 输入你的钱包地址
   - 获取测试 FIL

2. **Lighthouse API Key**
   - 访问: https://files.lighthouse.storage/
   - 注册账号
   - 在 Dashboard 获取 API Key

## 步骤 1: 克隆和构建

```bash
# 克隆仓库
git clone https://github.com/yourusername/aiagent.git
cd aiagent

# 构建所有组件
make build

# 安装 CLI 工具
make install
```

## 步骤 2: 部署合约

```bash
# 设置环境变量
export PRIVATE_KEY="your_private_key_here"

# 部署到 Calibration 测试网
make deploy-calibration
```

记录输出的三个合约地址：
- AgentIdentity: `0x...`
- AgentReputation: `0x...`
- AgentValidation: `0x...`

## 步骤 3: 配置 CLI

```bash
agent-cli init \
  --network calibration \
  --private-key "$PRIVATE_KEY" \
  --identity-contract "0x..." \
  --reputation-contract "0x..." \
  --validation-contract "0x..." \
  --lighthouse-api-key "your_lighthouse_key"
```

## 步骤 4: 注册你的第一个 Agent

```bash
agent-cli register \
  --name "My First Agent" \
  --description "A test agent for learning ERC-8004" \
  --mcp-endpoint "mcp://localhost:3000"
```

输出会显示你的 Agent ID 和 IPFS CID。

## 步骤 5: 测试功能

### 查询 Agent

```bash
agent-cli query --agent-id 1
```

### 给 Agent 反馈

```bash
agent-cli feedback \
  --agent-id 1 \
  --score 90 \
  --tags "helpful,efficient" \
  --message "Great agent!"
```

### 查看声誉

```bash
agent-cli reputation --agent-id 1
```

### 测试 MCP

```bash
agent-cli mcp-test \
  --tool "calculator" \
  --args '{"operation": "add", "a": 10, "b": 20}'
```

## 完成！

恭喜！你已经成功：
✅ 部署了 ERC-8004 合约
✅ 注册了一个 Agent
✅ 提交了反馈
✅ 测试了 MCP 功能

## 下一步

- 阅读完整的 [README.md](../README.md)
- 查看 [设计文档](./DESIGN.md)
- 探索智能合约代码
- 自定义 MCP 工具

## 常见问题

### Q: 合约部署失败？
A: 确保你有足够的测试 FIL，并且私钥格式正确（带 0x 前缀）。

### Q: IPFS 上传失败？
A: 不需要本地 IPFS，Lighthouse API 会处理上传。确保 API key 正确。

### Q: 交易卡住？
A: 在 https://calibration.filscan.io/ 查看交易状态。可能需要增加 gas price。

### Q: 如何切换到主网？
A: 使用 `--network mainnet` 并确保有真实的 FIL。**强烈建议先在测试网充分测试！**

## 获取帮助

遇到问题？
- 查看 [故障排除](../README.md#故障排除)
- 提交 GitHub Issue
- 加入我们的 Discord
