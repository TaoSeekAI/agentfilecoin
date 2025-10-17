# MCP Server 通信模式对比

## 你的配置是什么模式？

**答案：stdio 模式（本地进程间通信，不是网络）** ✅

---

## 三种通信模式对比

### 模式 1：stdio（标准输入/输出）- 当前使用 ✅

```
┌──────────────────────────────────────────────────┐
│  Claude Code Desktop (父进程)                     │
│                                                   │
│  启动子进程：                                      │
│  node /path/to/build/index.js                    │
│         ↓                    ↑                    │
│      stdin (写)           stdout (读)             │
│         ↓                    ↑                    │
│  ┌─────────────────────────────────────┐         │
│  │  MCP Server (子进程)                │         │
│  │  - 从 stdin 读取请求               │         │
│  │  - 通过 stdout 发送响应            │         │
│  └─────────────────────────────────────┘         │
└──────────────────────────────────────────────────┘

特点：
✅ 本地通信（进程间管道）
✅ 无需网络端口
✅ 自动启动/停止
✅ 数据不经过网络
✅ 最安全、最快
❌ 无法远程访问
```

**代码证据**：
```javascript
// src/index.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();  // ← stdio 模式
await this.server.connect(transport);
```

**配置示例**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",           // ← 直接启动进程
      "args": ["/path/to/index.js"]
    }
  }
}
```

---

### 模式 2：HTTP（网络连接）- 未使用 ❌

```
┌──────────────────┐         HTTP          ┌──────────────────┐
│  Claude Code     │ ← → localhost:3000 ← → │  MCP Server      │
│  Desktop         │         网络请求        │  (独立运行)       │
└──────────────────┘                        └──────────────────┘

特点：
✅ 可远程访问
✅ 可多个客户端连接
✅ 独立调试
❌ 需要网络端口
❌ 需要手动启动
❌ 有网络开销
❌ 安全性较低
```

**如果使用 HTTP，代码会是**：
```javascript
// 需要改成这样（当前没有）
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const transport = new HttpServerTransport({ port: 3000 });
await this.server.connect(transport);
```

**配置示例**：
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000"  // ← 网络连接
    }
  }
}
```

---

### 模式 3：SSE（Server-Sent Events）- 未使用 ❌

```
┌──────────────────┐         SSE           ┌──────────────────┐
│  Claude Code     │ ← → localhost:3000 ← → │  MCP Server      │
│  Desktop         │      长连接/流式传输    │  (独立运行)       │
└──────────────────┘                        └──────────────────┘

特点：
✅ 支持流式响应
✅ 实时推送
❌ 需要网络端口
❌ 复杂度高
```

---

## 你的配置解析

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",                    // ← 启动本地进程
      "args": ["/path/to/index.js"],        // ← 执行脚本
      "env": { ... }                        // ← 环境变量
    }
  }
}
```

### 这个配置的执行流程

1. **Claude Code 启动时**：
   ```bash
   # Claude Code 在后台执行（类似于你在终端运行）：
   env PRIVATE_KEY=0xe4db9f... \
       WALLET_ADDRESS=0xB34d4c... \
       node /path/to/build/index.js
   ```

2. **进程关系**：
   ```
   Claude Code (PID: 1234)
       └─ node build/index.js (PID: 5678) ← 子进程
   ```

3. **通信方式**：
   ```
   Claude Code (父进程)
       │
       ├─ stdin  → 写入 JSON-RPC 请求 → MCP Server
       │
       └─ stdout ← 读取 JSON-RPC 响应 ← MCP Server
   ```

4. **数据流**：
   ```
   用户输入: "列出所有 MCP 工具"
       ↓
   Claude Code: 生成 JSON-RPC 请求
       ↓
   stdin → MCP Server (子进程)
       ↓
   MCP Server: 处理请求，返回工具列表
       ↓
   stdout ← Claude Code
       ↓
   显示: verify_setup, check_balances, ...
   ```

---

## 关键区别总结

| 特性           | stdio (你的配置) | HTTP        | SSE         |
|----------------|------------------|-------------|-------------|
| **通信方式**   | 进程间管道       | 网络请求    | 网络流      |
| **端口占用**   | 无               | 需要        | 需要        |
| **启动方式**   | 自动（子进程）   | 手动        | 手动        |
| **网络传输**   | ❌ 无            | ✅ 有       | ✅ 有       |
| **远程访问**   | ❌ 不可以        | ✅ 可以     | ✅ 可以     |
| **安全性**     | ✅ 最高          | ⚠️ 中等     | ⚠️ 中等     |
| **性能**       | ✅ 最快          | ⚠️ 较慢     | ⚠️ 较慢     |
| **调试难度**   | 中等             | 容易        | 较难        |

---

## 验证你的模式

**检查代码**：
```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration

# 查看使用的 transport
grep -n "Transport" src/index.ts

# 输出：
# 4:import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
# 151:    const transport = new StdioServerTransport();
```

**检查进程**（当 Claude Code 运行时）：
```bash
# 找到 MCP Server 进程
ps aux | grep "mcp-nft-migration"

# 应该看到类似：
# user  5678  ...  node /path/to/mcp-nft-migration/build/index.js
```

**检查网络端口**（应该没有）：
```bash
# 检查是否监听端口
lsof -i :3000
# 应该没有输出（因为不是 HTTP 模式）
```

---

## 如果想改成 HTTP 模式（可选）

**步骤 1：修改代码**
```typescript
// src/index.ts

// 改成这样
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

async run() {
  const app = express();
  const transport = new SSEServerTransport('/messages', app);
  await this.server.connect(transport);

  app.listen(3000, () => {
    console.log('MCP Server running on http://localhost:3000');
  });
}
```

**步骤 2：修改配置**
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

**步骤 3：手动启动**
```bash
node build/index.js
# 在单独的终端运行
```

---

## 推荐配置（当前就是最佳）

你当前的 **stdio 模式** 是最推荐的，因为：

1. ✅ **无需网络**：不占用端口，不走网络栈
2. ✅ **自动管理**：Claude Code 启动/关闭时自动启动/停止
3. ✅ **最安全**：数据不经过网络
4. ✅ **最快**：进程间通信最快
5. ✅ **简单**：无需手动启动 MCP Server

---

## 总结

**你的问题**：
> 确定这个 claude code 配置是独立 mcp 么，不是网络连接？

**答案**：
✅ 是**独立进程**（子进程）
✅ 不是网络连接
✅ 使用 **stdio**（标准输入/输出）通信
✅ 数据通过**进程间管道**传输，不经过网络

**类比**：
就像父子进程在同一台机器上通过管道对话，不需要网络。

```
Claude Code (父)：  "列出工具"
                     ↓ (管道)
MCP Server (子)：   "收到，这是 9 个工具..."
                     ↓ (管道)
Claude Code (父)：  "显示给用户"
```

完全本地、完全安全、无需网络！🎉
