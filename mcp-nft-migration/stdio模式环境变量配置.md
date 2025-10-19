# stdio 模式环境变量配置指南

## 问题：如何在 stdio 模式中传递环境变量？

**答案：直接在配置文件的 `env` 字段中设置！**

## 配置示例

### 完整配置 (~/.claude.json)

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
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io",
        "AGENT_IDENTITY_ADDRESS": "0x7177a6867296406881E20d6647232314736Dd09A",
        "AGENT_VALIDATION_ADDRESS": "0x662b40A526cb4017d947e71eAF6753BF3eeE66d8",
        "NFT_CONTRACT_ADDRESS": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
        "VALIDATOR_PRIVATE_KEY": "0xade117fff61d9728ead68bfe8f8a619dbd85b2c9908b0760816dbc0c4f1a45dd"
      }
    }
  }
}
```

## 工作原理

### 1. Claude Code 启动 MCP Server

```bash
# Claude Code 实际执行的命令（简化版）
PRIVATE_KEY=0xe4db9f... \
WALLET_ADDRESS=0xB34d4c... \
ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia... \
... \
node /path/to/build/index.js
```

### 2. MCP Server 读取环境变量

```typescript
// src/index.ts 中
const privateKey = process.env.PRIVATE_KEY;
const walletAddress = process.env.WALLET_ADDRESS;
const ethereumRpc = process.env.ETHEREUM_NETWORK_RPC_URL;
// ... 等等
```

### 3. 完全隔离

每次 Claude Code 启动 MCP Server 时：
- ✅ **创建新进程**
- ✅ **传入环境变量**
- ✅ **环境变量只在该进程中可见**
- ✅ **不影响系统环境变量**
- ✅ **不同 MCP Server 可以有不同的环境变量**

## 环境变量来源优先级

### 场景 1: 只在配置文件中设置

```json
{
  "env": {
    "API_KEY": "secret123"
  }
}
```

✅ MCP Server 读取到: `process.env.API_KEY = "secret123"`

### 场景 2: 系统环境变量 + 配置文件

```bash
# 系统环境
export API_KEY="system_value"
```

```json
{
  "env": {
    "API_KEY": "config_value"
  }
}
```

✅ **配置文件优先**：`process.env.API_KEY = "config_value"`

### 场景 3: 继承系统环境变量

Claude Code 会自动继承一些系统环境变量：
- `PATH`
- `HOME`
- `USER`
- 等等

你也可以显式设置来覆盖它们。

## 敏感信息管理

### ⚠️ 安全注意事项

1. **文件权限**：
```bash
chmod 600 ~/.claude.json
# 只有你能读写
```

2. **不要提交到 Git**：
```bash
# .gitignore
.claude.json
*.json  # 如果包含敏感信息
```

3. **使用环境变量引用**（高级）：

虽然 stdio 模式不直接支持引用系统环境变量，但你可以：

**方案 A: 使用包装脚本**

创建 `run-mcp.sh`:
```bash
#!/bin/bash
# 从安全存储中读取敏感信息
export PRIVATE_KEY=$(vault read -field=key secret/nft)
export WALLET_ADDRESS=$(vault read -field=wallet secret/nft)

# 运行 MCP Server
node /path/to/build/index.js
```

配置文件：
```json
{
  "command": "/path/to/run-mcp.sh",
  "args": []
}
```

**方案 B: 使用加密的配置文件**

```bash
# 加密配置
gpg -c ~/.claude.json

# 使用时解密
gpg -d ~/.claude.json.gpg > ~/.claude.json
chmod 600 ~/.claude.json
```

## 环境变量模板

### 最小配置

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 完整配置（NFT Migration 示例）

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": [
        "/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js"
      ],
      "env": {
        // 区块链配置
        "PRIVATE_KEY": "0x...",
        "WALLET_ADDRESS": "0x...",

        // RPC 节点
        "ETHEREUM_NETWORK_RPC_URL": "https://...",
        "FILECOIN_NETWORK_RPC_URL": "https://...",
        "ETHEREUM_MAINNET_RPC_URL": "https://...",

        // 合约地址
        "AGENT_IDENTITY_ADDRESS": "0x...",
        "AGENT_VALIDATION_ADDRESS": "0x...",
        "NFT_CONTRACT_ADDRESS": "0x...",

        // 验证器
        "VALIDATOR_PRIVATE_KEY": "0x...",

        // 可选：日志级别
        "LOG_LEVEL": "info",

        // 可选：超时设置
        "TIMEOUT_MS": "30000"
      }
    }
  }
}
```

## 调试环境变量

### 检查环境变量是否正确传递

在你的 MCP Server 代码中添加调试日志：

```typescript
// src/index.ts
console.log('Environment variables loaded:');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? '***set***' : 'NOT SET');
console.log('WALLET_ADDRESS:', process.env.WALLET_ADDRESS || 'NOT SET');
console.log('ETHEREUM_NETWORK_RPC_URL:', process.env.ETHEREUM_NETWORK_RPC_URL || 'NOT SET');
// ... 等等
```

启动后检查日志：
```bash
# Claude Code 会显示 stdout/stderr
# 或者查看日志文件
cat ~/.local/state/claude/logs/mcp-*.log
```

## 环境变量 vs HTTP 模式

| 特性 | stdio + env | HTTP 模式 |
|------|------------|----------|
| 配置位置 | ~/.claude.json | ~/.env 或启动脚本 |
| 传递方式 | spawn 进程时 | 进程启动前设置 |
| 隔离性 | ✅ 完全隔离 | ⚠️ 共享环境 |
| 多实例 | ✅ 每个实例独立 | ❌ 共享配置 |
| 安全性 | ✅ 文件权限保护 | ⚠️ 需要额外保护 |

## 实际示例

### 为当前项目创建配置

```bash
# 1. 创建配置文件
cat > ~/.claude.json <<'EOF'
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
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io",
        "AGENT_IDENTITY_ADDRESS": "0x7177a6867296406881E20d6647232314736Dd09A",
        "AGENT_VALIDATION_ADDRESS": "0x662b40A526cb4017d947e71eAF6753BF3eeE66d8",
        "NFT_CONTRACT_ADDRESS": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
        "VALIDATOR_PRIVATE_KEY": "0xade117fff61d9728ead68bfe8f8a619dbd85b2c9908b0760816dbc0c4f1a45dd"
      }
    }
  }
}
EOF

# 2. 设置权限
chmod 600 ~/.claude.json

# 3. 验证配置
cat ~/.claude.json | jq '.mcpServers.["nft-migration"].env | keys'

# 应该显示所有环境变量名
```

### 测试 MCP Server 是否能读取环境变量

```bash
# 手动测试（模拟 Claude Code）
PRIVATE_KEY=0xe4db9f... \
WALLET_ADDRESS=0xB34d4c... \
node /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js

# 查看输出，确认环境变量正确加载
```

## 总结

✅ **stdio 模式的环境变量配置**：
1. 在 `~/.claude.json` 的 `env` 字段中设置
2. Claude Code 启动进程时自动传递
3. 完全隔离，安全可靠
4. 无需系统环境变量
5. 每个 MCP Server 可以有独立配置

✅ **优势**：
- 配置集中管理
- 不污染系统环境
- 支持多个不同配置的实例
- 文件权限保护敏感信息

✅ **最佳实践**：
- `chmod 600 ~/.claude.json` 保护配置文件
- 不要将配置文件提交到版本控制
- 使用 `.gitignore` 排除敏感配置
- 定期轮换敏感密钥
