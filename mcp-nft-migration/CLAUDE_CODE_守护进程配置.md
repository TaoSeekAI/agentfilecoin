# Claude Code 守护进程模式配置指南

## 🎯 核心区别

### stdio 模式 vs 守护进程模式

| 配置项      | stdio 模式（子进程）       | 守护进程模式（HTTP/SSE）    |
|-------------|---------------------------|----------------------------|
| **启动方式** | Claude Code 启动子进程     | 用户手动启动/系统自动启动   |
| **配置字段** | `command` + `args` + `env` | `url`                      |
| **通信方式** | stdin/stdout（管道）       | HTTP/SSE（网络）           |
| **生命周期** | 跟随 Claude Code          | 独立运行                   |

---

## 📝 配置文件位置

### macOS/Linux
```bash
~/.config/Claude/claude_desktop_config.json
```

### Windows
```
%APPDATA%\Claude\claude_desktop_config.json
```

---

## 方式 1: 守护进程模式（推荐 ⭐）

### 配置示例

```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
```

**就这么简单！** ✨

### 详细说明

- **`url`**: MCP Server 的 SSE 端点
  - 格式：`http://<host>:<port>/<endpoint>`
  - 默认：`http://localhost:3000/message`
  - **注意**：端点是 `/message`，不是 `/sse`（根据代码中的 SSEServerTransport 配置）

### 前提条件

**守护进程必须先启动！**

```bash
# 方法 1: PM2
pm2 start deploy/pm2/ecosystem.config.js

# 方法 2: systemd
sudo systemctl start mcp-nft-migration

# 方法 3: Shell Script
./scripts/daemon-manager.sh start

# 验证运行
curl http://localhost:3000/health
```

### 完整配置步骤

```bash
# 步骤 1: 启动守护进程
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm run build
pm2 start deploy/pm2/ecosystem.config.js

# 步骤 2: 验证守护进程
curl http://localhost:3000/health
# 输出: {"status":"ok",...}

# 步骤 3: 配置 Claude Code
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
EOF

# 步骤 4: 重启 Claude Code
# macOS
osascript -e 'quit app "Claude"'
sleep 2
open -a "Claude"

# Linux
killall claude-code
sleep 2
claude-code
```

### 工作流程

```
1. 用户启动守护进程
   ↓
2. MCP Server 监听 localhost:3000
   ↓
3. 用户启动 Claude Code
   ↓
4. Claude Code 读取配置文件
   ↓
5. 发现 "url": "http://localhost:3000/message"
   ↓
6. Claude Code 发起 HTTP 连接到守护进程
   ↓
7. 建立 SSE 连接
   ↓
8. 开始通信
```

**关键点**：
- ✅ Claude Code **不启动**任何子进程
- ✅ Claude Code 只是**连接**到已运行的守护进程
- ✅ 关闭 Claude Code 不影响守护进程
- ✅ 可以启动多个 Claude Code 实例连接同一守护进程

---

## 方式 2: stdio 模式（原有方式）

### 配置示例

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

### 详细说明

- **`command`**: 要执行的命令（`node`）
- **`args`**: 命令参数（指向 `build/index.js`，**注意不是 index-daemon.js**）
- **`env`**: 环境变量（包含所有配置）

### 工作流程

```
1. 用户启动 Claude Code
   ↓
2. Claude Code 读取配置文件
   ↓
3. 发现 "command" 字段
   ↓
4. Claude Code 执行：node /path/to/build/index.js
   ↓
5. MCP Server 作为子进程启动
   ↓
6. 通过 stdin/stdout 通信
   ↓
7. Claude Code 退出时，子进程自动停止
```

**关键点**：
- ✅ 无需手动启动 MCP Server
- ✅ 自动管理生命周期
- ❌ Claude Code 退出，MCP Server 也停止

---

## 🔄 两种模式对比

### 配置文件对比

#### 守护进程模式
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"    // ← 仅需一行！
    }
  }
}
```

**特点**：
- ✅ 配置极简
- ✅ 无需暴露私钥在配置中
- ✅ 守护进程需要先启动
- ✅ 可以多客户端共享

#### stdio 模式
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {                               // ← 需要配置所有环境变量
        "PRIVATE_KEY": "0x...",
        "WALLET_ADDRESS": "0x...",
        ...
      }
    }
  }
}
```

**特点**：
- ✅ 自动启动
- ❌ 配置复杂
- ❌ 私钥暴露在配置中
- ❌ 每个 Claude Code 实例独立进程

---

## 📦 快速配置文件

我已经为你准备好了两个配置文件：

### 1. 守护进程模式（推荐）

**文件**：`config/claude-code-daemon.json`

```bash
# 查看
cat config/claude-code-daemon.json

# 使用
cp config/claude-code-daemon.json ~/.config/Claude/claude_desktop_config.json
```

### 2. stdio 模式

**文件**：`config/claude-code-stdio.json`

```bash
# 查看
cat config/claude-code-stdio.json

# 使用（需要修改路径！）
cp config/claude-code-stdio.json ~/.config/Claude/claude_desktop_config.json

# 修改路径
nano ~/.config/Claude/claude_desktop_config.json
# 将 /var/tmp/vibe-kanban/... 改为你的实际路径
```

---

## 🔧 完整配置示例

### 示例 1: 仅守护进程模式

```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message",
      "description": "NFT Migration Daemon (HTTP/SSE)"
    }
  }
}
```

### 示例 2: 同时配置两个 MCP Server

```json
{
  "mcpServers": {
    "nft-migration-daemon": {
      "url": "http://localhost:3000/message",
      "description": "NFT Migration (Daemon Mode)"
    },
    "another-mcp": {
      "command": "python",
      "args": ["/path/to/another-mcp.py"],
      "description": "Another MCP Server"
    }
  }
}
```

### 示例 3: 不同端口的守护进程

```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    },
    "another-daemon": {
      "url": "http://localhost:3001/message"
    }
  }
}
```

---

## 🚨 常见错误

### 错误 1: 端点路径错误

❌ **错误**:
```json
{
  "url": "http://localhost:3000"          // 缺少端点
}
```

❌ **错误**:
```json
{
  "url": "http://localhost:3000/sse"      // 端点错误
}
```

✅ **正确**:
```json
{
  "url": "http://localhost:3000/message"  // 正确的端点
}
```

### 错误 2: 守护进程未启动

**症状**：Claude Code 无法连接

**检查**：
```bash
curl http://localhost:3000/health
```

**如果失败**：
```bash
# 启动守护进程
pm2 start deploy/pm2/ecosystem.config.js

# 或
./scripts/daemon-manager.sh start
```

### 错误 3: 端口被占用

**症状**：守护进程启动失败

**检查**：
```bash
lsof -i :3000
```

**解决**：
```bash
# 方法 1: 修改守护进程端口
PORT=3001 pm2 start deploy/pm2/ecosystem.config.js

# 方法 2: 修改 Claude Code 配置
{
  "url": "http://localhost:3001/message"
}
```

### 错误 4: 混用两种模式

❌ **错误**（同时配置 url 和 command）:
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message",
      "command": "node",
      "args": ["/path/to/index.js"]
    }
  }
}
```

✅ **正确**（只选一种）:
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
```

---

## ✅ 验证配置

### 步骤 1: 验证守护进程运行

```bash
# 测试健康检查
curl http://localhost:3000/health

# 预期输出
{
  "status": "ok",
  "timestamp": 1697520000000,
  "uptime": 123,
  "pid": 12345
}
```

### 步骤 2: 验证配置文件

```bash
# 查看配置
cat ~/.config/Claude/claude_desktop_config.json

# 验证 JSON 格式
jq . ~/.config/Claude/claude_desktop_config.json
```

### 步骤 3: 重启 Claude Code

**完全退出**（重要！）:
```bash
# macOS
osascript -e 'quit app "Claude"'
sleep 3
open -a "Claude"

# Linux
killall claude-code
sleep 3
claude-code &
```

### 步骤 4: 测试连接

在 Claude Code 中输入：
```
列出所有 MCP 工具
```

**预期输出**：
```
我看到以下 MCP 工具：

1. verify_setup - 验证环境配置
2. setup_approvals - 设置授权
3. check_balances - 检查余额
4. upload_to_filecoin - 上传到 Filecoin
5. test_upload - 测试上传
6. nft_scan - 扫描 NFT
7. get_nft_metadata - 获取 NFT 元数据
8. erc8004_validate - ERC-8004 验证
9. update_contract_uri - 更新合约 URI
```

---

## 🎯 推荐配置流程

### 开发/测试环境

1. **使用守护进程模式**
2. **使用 PM2 管理**
3. **配置文件极简**

```bash
# 1. 启动守护进程
pm2 start deploy/pm2/ecosystem.config.js

# 2. 配置 Claude Code
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
EOF

# 3. 重启 Claude Code
osascript -e 'quit app "Claude"' && sleep 2 && open -a "Claude"
```

### 生产环境

1. **使用守护进程模式**
2. **使用 systemd 管理（Linux）**
3. **配置文件极简**

```bash
# 1. 安装 systemd 服务
sudo cp deploy/systemd/mcp-nft-migration.service /etc/systemd/system/
sudo systemctl enable --now mcp-nft-migration

# 2. 配置 Claude Code（同上）

# 3. 验证
sudo systemctl status mcp-nft-migration
curl http://localhost:3000/health
```

---

## 📊 配置选择决策树

```
需要 MCP Server？
    │
    ├─ 是 → 需要独立运行？
    │         │
    │         ├─ 是 → 守护进程模式 ✅
    │         │       配置: { "url": "http://localhost:3000/message" }
    │         │       管理: PM2/systemd
    │         │
    │         └─ 否 → stdio 模式
    │                 配置: { "command": "node", "args": [...], "env": {...} }
    │                 管理: Claude Code 自动管理
    │
    └─ 否 → 无需配置
```

---

## 🔐 安全建议

### 守护进程模式（推荐）

**优点**：
- ✅ 私钥不暴露在 Claude Code 配置中
- ✅ 私钥仅存在于守护进程配置中
- ✅ 可以设置守护进程配置文件权限

```bash
# 设置权限
chmod 600 deploy/pm2/ecosystem.config.js
chmod 600 /etc/systemd/system/mcp-nft-migration.service
```

### stdio 模式

**缺点**：
- ❌ 私钥明文存在于 Claude Code 配置中
- ❌ 配置文件可能被其他应用读取

**缓解措施**：
```bash
# 设置配置文件权限
chmod 600 ~/.config/Claude/claude_desktop_config.json

# 检查权限
ls -l ~/.config/Claude/claude_desktop_config.json
# 应该显示: -rw------- (仅当前用户可读写)
```

---

## 📝 总结

### 守护进程模式配置（推荐）⭐

**配置**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
```

**前提**：守护进程必须先启动
```bash
pm2 start deploy/pm2/ecosystem.config.js
```

**优点**：
- ✅ 配置极简（1 行）
- ✅ 独立运行
- ✅ 多客户端支持
- ✅ 更安全

---

### stdio 模式配置

**配置**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": { "PRIVATE_KEY": "...", ... }
    }
  }
}
```

**优点**：
- ✅ 自动启动
- ✅ 无需手动管理

**缺点**：
- ❌ 配置复杂
- ❌ 私钥暴露

---

## 🚀 快速开始命令

```bash
# 守护进程模式（3 步）
pm2 start deploy/pm2/ecosystem.config.js
cp config/claude-code-daemon.json ~/.config/Claude/claude_desktop_config.json
osascript -e 'quit app "Claude"' && sleep 2 && open -a "Claude"

# 测试
curl http://localhost:3000/health
```

**就这么简单！** 🎉
