# Claude Code 正确配置方式

## 🚨 重要发现

经过测试发现，**Claude Code 目前只支持 stdio 模式**，不支持简单的 HTTP/SSE URL 配置用于守护进程！

错误的配置（不工作）：
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"  // ❌ Claude Code 不支持
    }
  }
}
```

## ✅ 正确配置方式

### 配置文件位置

**Claude Code**:
```bash
~/.claude.json
```

**注意**：不是 `~/.config/Claude/claude_desktop_config.json`！

### stdio 模式配置（推荐）

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

### 特点

- ✅ Claude Code 自动启动 MCP Server
- ✅ Claude Code 退出时自动停止
- ❌ 无法作为守护进程独立运行
- ❌ 无法多客户端共享

## 🔧 快速配置

```bash
# 1. 备份现有配置
cp ~/.claude.json ~/.claude.json.backup

# 2. 使用准备好的配置
cat > ~/.claude.json << 'EOF'
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

# 3. 设置权限
chmod 600 ~/.claude.json

# 4. 重启 Claude Code
# 完全退出并重新启动
```

## 📊 守护进程方案的现状

### HTTP/SSE 守护进程仍然有价值

虽然 Claude Code 目前不支持 URL 配置，但我们实现的守护进程方案仍然可以：

1. **用于其他 MCP 客户端**
   - 支持 MCP 协议的任何客户端
   - 可以通过 HTTP/SSE 连接

2. **独立 API 服务**
   - 可以作为 HTTP API 使用
   - 健康检查端点
   - 信息查询端点

3. **未来扩展**
   - 当 Claude Code 支持 URL 配置时立即可用
   - 其他 MCP 工具的集成

### 守护进程仍在运行

```bash
# 查看状态
./scripts/daemon-manager.sh status

# 查看信息
./scripts/daemon-manager.sh info

# 如果不需要，可以停止
./scripts/daemon-manager.sh stop
```

## 🎯 推荐方案

### 当前使用（Claude Code）

**使用 stdio 模式**：
- 配置简单
- 自动管理
- 符合 Claude Code 当前实现

### 未来或其他客户端

**使用守护进程模式**：
- 独立运行
- 多客户端支持
- 更灵活的部署

## 📝 总结

1. **Claude Code 配置文件**: `~/.claude.json`
2. **支持的模式**: stdio（command + args）
3. **守护进程**: 可用于其他场景，但 Claude Code 暂不支持
4. **推荐**: 使用 stdio 模式配置

守护进程方案已完整实现，等待 Claude Code 或其他 MCP 客户端支持 URL 配置方式。
