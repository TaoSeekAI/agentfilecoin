# MCP Server 进程启动详解

## 🎯 核心问题：谁启动了 MCP Server 进程？

**答案：Claude Code Desktop（客户端）启动的** ✅

---

## 完整启动流程

### 1. 用户启动 Claude Code Desktop

```
用户：双击 Claude Code Desktop 图标
    ↓
Claude Code Desktop 启动
    ↓
读取配置文件: ~/.config/Claude/claude_desktop_config.json
    ↓
发现 MCP Server 配置
```

### 2. Claude Code 解析配置

**配置文件**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",                    // ← 要执行的命令
      "args": ["/path/to/build/index.js"],  // ← 命令参数
      "env": {                              // ← 环境变量
        "PRIVATE_KEY": "0xe4db9f...",
        "WALLET_ADDRESS": "0xB34d4c..."
      }
    }
  }
}
```

**Claude Code 读取后**：
```
配置名称: nft-migration
执行命令: node
命令参数: ["/path/to/build/index.js"]
环境变量: { PRIVATE_KEY: "...", ... }
```

### 3. Claude Code 自动启动 MCP Server 进程

**Claude Code 内部执行类似**：
```javascript
// Claude Code Desktop 的内部代码（伪代码）
const { spawn } = require('child_process');

// 从配置文件读取
const config = {
  command: 'node',
  args: ['/path/to/build/index.js'],
  env: {
    PRIVATE_KEY: '0xe4db9f...',
    WALLET_ADDRESS: '0xB34d4c...',
    ...process.env  // 继承父进程的环境变量
  }
};

// 启动子进程
const mcpServerProcess = spawn(
  config.command,  // 'node'
  config.args,     // ['/path/to/build/index.js']
  {
    env: config.env,
    stdio: ['pipe', 'pipe', 'inherit']  // stdin, stdout, stderr
  }
);

// 连接到子进程
const stdin = mcpServerProcess.stdin;   // Claude Code 写入
const stdout = mcpServerProcess.stdout; // Claude Code 读取

// 发送 JSON-RPC 请求
stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
}));

// 读取 JSON-RPC 响应
stdout.on('data', (data) => {
  const response = JSON.parse(data);
  console.log('MCP Server 返回:', response);
});
```

### 4. MCP Server 进程启动

```
Claude Code 执行:
$ node /path/to/build/index.js

    ↓

MCP Server 进程启动 (PID: 5678)
    ↓

运行 build/index.js 代码:
    ↓

const transport = new StdioServerTransport();
await this.server.connect(transport);
    ↓

MCP Server 开始监听 stdin
    ↓

输出到 stderr: "NFT Migration MCP Server running on stdio"
    ↓

等待 Claude Code 的请求...
```

### 5. 进程树结构

```
systemd (PID: 1)
    └─ Claude Code Desktop (PID: 1234)  ← 用户启动
           └─ node build/index.js (PID: 5678)  ← Claude Code 启动
```

**验证方法**：
```bash
# 当 Claude Code 运行时
pstree -p | grep -A 2 "Claude"

# 输出类似：
# Claude(1234)───node(5678)
```

---

## 详细对比：谁启动 MCP Server？

### 方式 1：Claude Code 自动启动（当前配置）✅

```
┌─────────────────────────────────────────────────┐
│  1. 用户启动 Claude Code Desktop                │
│     $ open "Claude Code.app"                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. Claude Code 读取配置                        │
│     ~/.config/Claude/claude_desktop_config.json │
│                                                 │
│     发现: mcpServers.nft-migration              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Claude Code 启动子进程                      │
│     spawn('node', ['/path/to/build/index.js'])  │
│                                                 │
│     父进程: Claude Code (PID: 1234)             │
│     子进程: node (PID: 5678)                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. MCP Server 进程启动                         │
│     执行: build/index.js                        │
│     监听: stdin (等待请求)                      │
│     输出: stderr ("MCP Server running...")      │
└─────────────────────────────────────────────────┘

特点：
✅ 完全自动
✅ Claude Code 启动时自动启动
✅ Claude Code 退出时自动停止
✅ 用户无需手动操作
```

**启动者**：**Claude Code Desktop** (自动)

---

### 方式 2：手动启动（独立运行）

```
┌─────────────────────────────────────────────────┐
│  1. 用户手动在终端启动 MCP Server               │
│     $ cd mcp-nft-migration                      │
│     $ node build/index.js                       │
│                                                 │
│     MCP Server 进程 (PID: 5678)                 │
│     等待连接...                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. 用户启动 Claude Code Desktop                │
│     $ open "Claude Code.app"                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Claude Code 读取配置                        │
│     发现: mcpServers.nft-migration              │
│            url: "http://localhost:3000"         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Claude Code 连接到已运行的 MCP Server       │
│     HTTP GET http://localhost:3000              │
│                                                 │
│     不启动新进程，只是连接                      │
└─────────────────────────────────────────────────┘

特点：
✅ 可独立调试
✅ 可查看详细日志
❌ 需要手动启动
❌ 需要两个步骤
```

**启动者**：**用户** (手动)

---

## 生命周期管理

### Claude Code 自动启动模式

**启动时机**：
```
用户启动 Claude Code Desktop
    ↓
Claude Code 初始化
    ↓
读取 claude_desktop_config.json
    ↓
对每个 mcpServers 配置项:
    ├─ 如果有 "command" 字段 → 启动子进程
    └─ 如果有 "url" 字段 → 连接到已运行的服务
    ↓
MCP Server 进程运行
```

**停止时机**：
```
用户关闭 Claude Code Desktop
    ↓
Claude Code 清理资源
    ↓
发送 SIGTERM 信号给子进程
    ↓
MCP Server 进程收到信号
    ↓
MCP Server 优雅退出
    ↓
进程结束
```

**重启**：
```
Claude Code 检测到 MCP Server 进程意外退出
    ↓
等待 1 秒
    ↓
自动重启子进程
    ↓
MCP Server 恢复运行
```

---

## 配置字段说明

### 字段 1：`command` (启动子进程)

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",                    // ← Claude Code 执行这个命令
      "args": ["/path/to/build/index.js"],  // ← 命令参数
      "env": { ... }                        // ← 环境变量
    }
  }
}
```

**含义**：
- Claude Code 会执行: `node /path/to/build/index.js`
- 作为子进程启动
- 通过 stdin/stdout 通信

**谁启动**：**Claude Code Desktop**

---

### 字段 2：`url` (连接到已运行的服务)

```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000"  // ← Claude Code 连接到这个 URL
    }
  }
}
```

**含义**：
- Claude Code 不启动进程
- 只是连接到已运行的 HTTP 服务
- 用户需要手动启动 MCP Server

**谁启动**：**用户（手动）**

---

## 实际测试

### 测试 1：验证 Claude Code 启动了子进程

**步骤**：
```bash
# 1. 启动 Claude Code Desktop
# 2. 在终端查看进程树
pstree -p $(pgrep -f "Claude Code")

# 应该看到：
# Claude(1234)───node(5678)
#                    └─ /path/to/build/index.js
```

### 测试 2：验证父子进程关系

```bash
# 查看 MCP Server 进程的父进程
ps -o ppid= -p $(pgrep -f "build/index.js")

# 输出: 1234 (Claude Code 的 PID)
```

### 测试 3：验证 Claude Code 退出时子进程也退出

```bash
# 1. 记录 MCP Server 的 PID
MCP_PID=$(pgrep -f "build/index.js")
echo "MCP Server PID: $MCP_PID"

# 2. 退出 Claude Code Desktop

# 3. 检查 MCP Server 进程是否还在
ps -p $MCP_PID
# 应该输出: 没有此进程 (已退出)
```

---

## 配置示例对比

### 示例 1：Claude Code 自动启动 (stdio)

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "PRIVATE_KEY": "0xe4db9f..."
      }
    }
  }
}
```

**等价于**：
```bash
# Claude Code 在后台执行：
PRIVATE_KEY=0xe4db9f... node /path/to/build/index.js
```

**启动者**：Claude Code Desktop (自动)

---

### 示例 2：用户手动启动 (HTTP)

**配置**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000"
    }
  }
}
```

**手动启动**：
```bash
# 终端 1: 用户手动启动
cd mcp-nft-migration
PRIVATE_KEY=0xe4db9f... node build/index.js

# 终端 2: 启动 Claude Code
# Claude Code 只是连接，不启动
```

**启动者**：用户 (手动)

---

### 示例 3：使用启动脚本

**配置**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "/path/to/start-mcp.sh"
    }
  }
}
```

**脚本内容** (`start-mcp.sh`):
```bash
#!/bin/bash
export PRIVATE_KEY=0xe4db9f...
export WALLET_ADDRESS=0xB34d4c...
node /path/to/build/index.js
```

**启动者**：Claude Code Desktop (执行脚本)

---

## 日志和调试

### Claude Code 启动日志

**查看 Claude Code 日志**：
```bash
# macOS
~/Library/Logs/Claude Code/

# Linux
~/.config/Claude Code/logs/

# 查看最新日志
tail -f ~/.config/Claude\ Code/logs/main.log
```

**应该看到类似**：
```
[2025-10-17 10:00:00] Starting MCP Server: nft-migration
[2025-10-17 10:00:00] Command: node
[2025-10-17 10:00:00] Args: ["/path/to/build/index.js"]
[2025-10-17 10:00:01] MCP Server started, PID: 5678
[2025-10-17 10:00:01] Connected to MCP Server via stdio
```

### MCP Server 日志

**MCP Server 的输出去哪了？**
```javascript
// build/index.js
console.error('NFT Migration MCP Server running on stdio');
//            ↑
//            stderr (不影响 stdio 通信)
```

- `stdout` 用于 JSON-RPC 通信 (被 Claude Code 读取)
- `stderr` 用于日志输出 (被 Claude Code 记录到日志文件)

---

## 常见问题

### Q1: 我需要手动启动 MCP Server 吗？

**A**: 不需要！只要配置了 `command` 字段，Claude Code 会自动启动。

### Q2: 如何确认 MCP Server 已启动？

**A**:
```bash
# 方法 1: 查看进程
ps aux | grep "build/index.js"

# 方法 2: 在 Claude Code 中测试
# 输入: "列出所有 MCP 工具"
# 如果能看到工具列表，说明已启动
```

### Q3: MCP Server 什么时候停止？

**A**: Claude Code 退出时自动停止（会发送 SIGTERM 信号）。

### Q4: 可以同时运行多个 MCP Server 吗？

**A**: 可以！配置多个：
```json
{
  "mcpServers": {
    "nft-migration": { "command": "node", "args": [...] },
    "another-server": { "command": "python", "args": [...] }
  }
}
```

每个都会作为独立的子进程启动。

---

## 总结

### 谁启动了 MCP Server？

| 配置方式          | 启动者                | 时机              | 停止方式          |
|-------------------|-----------------------|-------------------|-------------------|
| `command` + `args` | **Claude Code Desktop** | Claude Code 启动时 | Claude Code 退出时 |
| `url`             | **用户（手动）**      | 用户手动启动      | 用户手动停止      |

### 你的配置

```json
{
  "command": "node",
  "args": ["/path/to/build/index.js"]
}
```

**启动者**: **Claude Code Desktop** ✅
**方式**: 自动启动子进程
**时机**: Claude Code 启动时
**停止**: Claude Code 退出时

---

## 可视化总结

```
用户
 │
 └─ 启动 Claude Code Desktop
         │
         ├─ 读取配置文件
         │  ~/.config/Claude/claude_desktop_config.json
         │
         ├─ 发现 MCP Server 配置 (command + args)
         │
         └─ 启动子进程 (spawn)
                 │
                 └─ node build/index.js
                         │
                         ├─ 监听 stdin (等待请求)
                         ├─ 输出到 stdout (发送响应)
                         └─ 日志到 stderr (调试信息)

完全自动，用户无需手动操作！✅
```
