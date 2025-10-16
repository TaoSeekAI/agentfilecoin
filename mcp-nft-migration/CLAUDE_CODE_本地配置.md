# Claude Code 本地 MCP Server 配置指南

## 🎯 核心问题：如何让 Claude Code 连接到本地的 MCP Server？

有两种方式：**自动启动**（推荐） 和 **独立启动**（高级）

---

## 方式 1：自动启动（推荐 ⭐）

Claude Code 启动时自动运行 MCP Server，最简单！

### 步骤 1：找到配置文件

**macOS/Linux**:
```bash
nano ~/.config/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 步骤 2：添加配置

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

⚠️ **重要**：将 `/var/tmp/vibe-kanban/...` 替换为你的实际路径！

**如何找到你的路径？**
```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
pwd
# 复制输出的路径
```

### 步骤 3：构建 MCP Server

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm install
npm run build
```

验证构建成功：
```bash
ls build/index.js
# 应该存在
```

### 步骤 4：重启 Claude Code

**完全退出** Claude Code Desktop 并重新启动。

### 步骤 5：测试连接

在 Claude Code 中输入：
```
你好，列出所有可用的 MCP 工具
```

应该看到 9 个工具：
- `verify_setup` - 验证环境
- `check_balances` - 检查余额
- `upload_to_filecoin` - 上传到 Filecoin
- `nft_scan` - 扫描 NFT
- `erc8004_validate` - ERC-8004 验证
- 等等...

---

## 方式 2：独立启动（高级 🔧）

MCP Server 在独立终端运行，Claude Code 只是连接它。

**适合场景**：
- 需要看 MCP Server 的详细日志
- 需要调试 MCP Server
- 需要热重启

### 步骤 1：创建启动脚本

**创建 `start-mcp.sh`**:
```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration

cat > start-mcp.sh << 'EOF'
#!/bin/bash

# 进入目录
cd "$(dirname "$0")"

# 设置环境变量
export PRIVATE_KEY=0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f
export WALLET_ADDRESS=0xB34d4c8E3AcCB5FA62455228281649Be525D4e59
export ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
export FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
export ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io

# 启动 MCP Server
echo "🚀 Starting MCP Server..." >&2
node build/index.js
EOF

chmod +x start-mcp.sh
```

### 步骤 2：配置 Claude Code

编辑 `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/start-mcp.sh",
      "args": []
    }
  }
}
```

⚠️ 替换为你的实际路径（使用 `pwd` 获取）

### 步骤 3：测试独立启动

**终端 1**:
```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
./start-mcp.sh
```

应该看到：
```
🚀 Starting MCP Server...
NFT Migration MCP Server running on stdio
```

**终端 2 - 重启 Claude Code**，然后测试连接。

---

## 🎮 使用示例

配置完成后，你可以在 Claude Code 中这样玩：

### 示例 1：检查环境
```
请检查我的 NFT 迁移环境
```

Claude 会自动：
- 调用 `verify_setup()` 工具
- 显示余额、配置状态

### 示例 2：测试上传
```
帮我测试 Filecoin 上传功能
```

Claude 会自动：
- 调用 `check_balances()` 检查余额
- 调用 `test_upload()` 测试上传
- 报告结果

### 示例 3：扫描 NFT
```
扫描合约 0xED5AF388653567Af2F388E6224dC7C4b3241C544 的 NFT
```

Claude 会自动：
- 调用 `nft_scan(contract_address="0xED5AF...")`
- 显示 NFT 列表

### 示例 4：完整迁移（自然语言！）
```
帮我把 Azuki #0-4 的 NFT 迁移到 Filecoin，使用 ERC-8004 验证
```

Claude 会自动执行完整的 7 阶段流程：
1. 注册 Agent (ERC-8004)
2. 扫描 NFT
3. 创建验证请求
4. 迁移到 Filecoin
5. 生成证明
6. 提交验证响应
7. 生成最终报告

---

## 🔧 故障排除

### 问题 1：Claude Code 找不到 MCP Server

**检查**:
```bash
# 1. 确认构建成功
ls /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js

# 2. 确认路径正确
cat ~/.config/Claude/claude_desktop_config.json

# 3. 手动测试
node /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js
# 应该看到: NFT Migration MCP Server running on stdio
```

### 问题 2：工具执行失败

**检查环境变量**:
```bash
# 检查配置文件中的环境变量是否正确
cat ~/.config/Claude/claude_desktop_config.json | grep PRIVATE_KEY
```

在 Claude Code 中：
```
请运行 verify_setup 工具检查环境
```

### 问题 3：找不到配置文件

**macOS/Linux**:
```bash
# 创建目录（如果不存在）
mkdir -p ~/.config/Claude

# 创建配置文件
touch ~/.config/Claude/claude_desktop_config.json
```

---

## 📚 更多资源

- **完整的 7 阶段流程图**: 查看 `STANDALONE_MCP_GUIDE.md`
- **ERC-8004 集成说明**: 查看 `ERC8004_INTEGRATION.md`
- **手动测试指南**: 查看 `HANDS_ON_GUIDE.md`

---

## 🔒 安全提示

⚠️ **私钥安全**:
- 配置文件中的私钥是明文存储
- 仅在测试网使用！
- 设置正确的文件权限：

```bash
chmod 600 ~/.config/Claude/claude_desktop_config.json
```

---

## 🚀 快速启动命令

**方式 1（自动启动）**:
```bash
# 1. 构建 MCP Server
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm run build

# 2. 配置 Claude Code（编辑配置文件）
nano ~/.config/Claude/claude_desktop_config.json

# 3. 重启 Claude Code
# 完全退出并重新启动

# 4. 在 Claude Code 中测试
# "列出所有 MCP 工具"
```

**方式 2（独立启动）**:
```bash
# 终端 1: 启动 MCP Server
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
./start-mcp.sh

# 终端 2: 启动 Claude Code
# 在 Claude Code 中测试连接
```

---

**就这么简单！** 🎉

有问题随时问！
