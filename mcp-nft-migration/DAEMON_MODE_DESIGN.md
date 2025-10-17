# MCP Server 守护进程设计方案

## 🎯 需求

**目标**: MCP Server 作为守护进程（daemon）运行，Claude Code 启动与否都不影响其运行。

**核心特点**:
- ✅ MCP Server 独立运行（不依赖 Claude Code）
- ✅ 系统启动时自动启动
- ✅ Claude Code 只是连接客户端（可以随时连接/断开）
- ✅ 支持多个客户端同时连接
- ✅ 日志持久化
- ✅ 自动重启（崩溃后）

---

## 架构对比

### 当前架构（子进程模式）

```
┌────────────────────────────────────┐
│  Claude Code Desktop               │
│                                    │
│  启动 → MCP Server (子进程)        │
│  退出 → MCP Server 停止 ❌         │
└────────────────────────────────────┘

问题：
❌ Claude Code 退出，MCP Server 也停止
❌ 无法多客户端连接
❌ 无法独立管理
```

### 守护进程架构（推荐）✅

```
┌─────────────────────┐
│  systemd / PM2      │  ← 进程管理器
│                     │
│  启动/监控/重启     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  MCP Server Daemon  │  ← 守护进程
│  (HTTP/SSE 模式)    │
│                     │
│  监听: localhost:3000
└──────────┬──────────┘
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  Claude Code #1  │  │  Claude Code #2  │
│  (客户端)        │  │  (客户端)        │
└──────────────────┘  └──────────────────┘

特点：
✅ MCP Server 独立运行
✅ Claude Code 只是客户端
✅ 支持多客户端连接
✅ 自动重启
✅ 日志管理
```

---

## 方案 1: 使用 systemd（Linux 推荐）⭐

### 架构

```
systemd (系统级别)
    ↓
启动 mcp-server.service
    ↓
MCP Server Daemon (HTTP 模式，监听 3000 端口)
    ↓
Claude Code 通过 HTTP 连接
```

### 优点
- ✅ 系统启动时自动启动
- ✅ 崩溃后自动重启
- ✅ 日志集成到 journald
- ✅ 资源限制和安全控制
- ✅ Linux 标准方案

### 实现步骤

详见下面的具体实现。

---

## 方案 2: 使用 PM2（跨平台）

### 架构

```
PM2 (进程管理器)
    ↓
pm2 start mcp-server
    ↓
MCP Server Daemon (HTTP 模式)
    ↓
Claude Code 通过 HTTP 连接
```

### 优点
- ✅ 跨平台（Linux/macOS/Windows）
- ✅ 简单易用
- ✅ 丰富的监控功能
- ✅ 日志管理
- ✅ 集群模式

### 实现步骤

详见下面的具体实现。

---

## 方案 3: 使用 Docker（容器化）

### 架构

```
Docker Daemon
    ↓
docker run mcp-server
    ↓
MCP Server Container (HTTP 模式)
    ↓
Claude Code 通过 HTTP 连接
```

### 优点
- ✅ 隔离环境
- ✅ 跨平台
- ✅ 易于部署
- ✅ 版本管理

### 实现步骤

详见下面的具体实现。

---

## 方案 4: 使用 launchd（macOS）

### 架构

```
launchd (macOS 系统)
    ↓
启动 com.nft.mcp-server.plist
    ↓
MCP Server Daemon (HTTP 模式)
    ↓
Claude Code 通过 HTTP 连接
```

### 优点
- ✅ macOS 原生支持
- ✅ 系统启动时自动启动
- ✅ 崩溃后自动重启

### 实现步骤

详见下面的具体实现。

---

## 核心改动

### 改动 1: MCP Server 支持 HTTP/SSE 模式

**当前代码**（stdio 模式）:
```typescript
// src/index.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await this.server.connect(transport);
```

**改为 HTTP/SSE 模式**:
```typescript
// src/index-daemon.ts
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();

// SSE endpoint
const transport = new SSEServerTransport('/sse', app);
await this.server.connect(transport);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server daemon running on http://localhost:${PORT}`);
});
```

### 改动 2: Claude Code 配置

**当前配置**（子进程模式）:
```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/build/index.js"]
    }
  }
}
```

**改为守护进程模式**:
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

---

## 具体实现

### 方案 1: systemd（Linux）

#### 步骤 1: 创建 HTTP 模式的 MCP Server

**文件**: `src/index-daemon.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { setupTools } from './tools/setup.js';
import { uploadTools } from './tools/upload.js';
import { nftTools } from './tools/nft.js';
import { validationTools } from './tools/validation.js';
import { resourceProviders } from './resources/index.js';
import { promptTemplates } from './prompts/index.js';

class NFTMigrationDaemon {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-nft-migration-daemon',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    // ... (same as index.ts)
  }

  async run() {
    const app = express();

    // CORS for Claude Code Desktop
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // SSE endpoint
    const transport = new SSEServerTransport('/sse', app);
    await this.server.connect(transport);

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
      });
    });

    // Info endpoint
    app.get('/info', (req, res) => {
      res.json({
        name: 'mcp-nft-migration-daemon',
        version: '1.0.0',
        mode: 'daemon',
        transport: 'SSE',
      });
    });

    // Start server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || 'localhost';

    app.listen(PORT, HOST, () => {
      console.log(`MCP Server daemon started`);
      console.log(`  URL: http://${HOST}:${PORT}`);
      console.log(`  SSE: http://${HOST}:${PORT}/sse`);
      console.log(`  Health: http://${HOST}:${PORT}/health`);
    });
  }
}

// Start daemon
const daemon = new NFTMigrationDaemon();
daemon.run().catch(console.error);
```

#### 步骤 2: 创建 systemd 服务文件

**文件**: `/etc/systemd/system/mcp-nft-migration.service`

```ini
[Unit]
Description=MCP NFT Migration Server Daemon
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=your-username
Group=your-username
WorkingDirectory=/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration

# Environment variables
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="HOST=localhost"
Environment="PRIVATE_KEY=0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f"
Environment="WALLET_ADDRESS=0xB34d4c8E3AcCB5FA62455228281649Be525D4e59"
Environment="ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io"
Environment="FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1"
Environment="ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io"

# Or load from env file
# EnvironmentFile=/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/.env

# Start command
ExecStart=/usr/bin/node /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index-daemon.js

# Restart policy
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-nft-migration

# Security
NoNewPrivileges=true
PrivateTmp=true

# Resource limits
LimitNOFILE=65536
MemoryLimit=1G

[Install]
WantedBy=multi-user.target
```

#### 步骤 3: 启用和管理服务

```bash
# 1. 复制服务文件
sudo cp mcp-nft-migration.service /etc/systemd/system/

# 2. 重载 systemd
sudo systemctl daemon-reload

# 3. 启用服务（开机自启）
sudo systemctl enable mcp-nft-migration

# 4. 启动服务
sudo systemctl start mcp-nft-migration

# 5. 查看状态
sudo systemctl status mcp-nft-migration

# 6. 查看日志
sudo journalctl -u mcp-nft-migration -f

# 7. 重启服务
sudo systemctl restart mcp-nft-migration

# 8. 停止服务
sudo systemctl stop mcp-nft-migration
```

#### 步骤 4: 配置 Claude Code

**文件**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

---

### 方案 2: PM2（跨平台）

#### 步骤 1: 安装 PM2

```bash
npm install -g pm2
```

#### 步骤 2: 创建 PM2 配置文件

**文件**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'mcp-nft-migration',
      script: './build/index-daemon.js',
      cwd: '/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: 'localhost',
        PRIVATE_KEY: '0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f',
        WALLET_ADDRESS: '0xB34d4c8E3AcCB5FA62455228281649Be525D4e59',
        ETHEREUM_NETWORK_RPC_URL: 'https://eth-sepolia.public.blastapi.io',
        FILECOIN_NETWORK_RPC_URL: 'https://api.calibration.node.glif.io/rpc/v1',
        ETHEREUM_MAINNET_RPC_URL: 'https://eth-mainnet.public.blastapi.io',
      },

      // Restart policy
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Advanced
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
```

#### 步骤 3: 启动和管理

```bash
# 1. 启动守护进程
pm2 start ecosystem.config.js

# 2. 查看状态
pm2 status

# 3. 查看日志
pm2 logs mcp-nft-migration

# 4. 监控
pm2 monit

# 5. 重启
pm2 restart mcp-nft-migration

# 6. 停止
pm2 stop mcp-nft-migration

# 7. 删除
pm2 delete mcp-nft-migration

# 8. 设置开机自启
pm2 startup
pm2 save

# 9. 查看详细信息
pm2 show mcp-nft-migration
```

#### 步骤 4: 配置 Claude Code

同 systemd 方案。

---

### 方案 3: Docker

#### 步骤 1: 创建 Dockerfile

**文件**: `Dockerfile`

```dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start daemon
CMD ["node", "build/index-daemon.js"]
```

#### 步骤 2: 创建 docker-compose.yml

**文件**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    image: mcp-nft-migration:latest
    container_name: mcp-nft-migration

    ports:
      - "3000:3000"

    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - PRIVATE_KEY=0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f
      - WALLET_ADDRESS=0xB34d4c8E3AcCB5FA62455228281649Be525D4e59
      - ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
      - FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
      - ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io

    restart: unless-stopped

    volumes:
      - ./logs:/app/logs

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 步骤 3: 启动和管理

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 查看状态
docker-compose ps

# 5. 重启
docker-compose restart

# 6. 停止
docker-compose stop

# 7. 停止并删除
docker-compose down
```

#### 步骤 4: 配置 Claude Code

同 systemd 方案。

---

### 方案 4: launchd（macOS）

#### 步骤 1: 创建 plist 文件

**文件**: `~/Library/LaunchAgents/com.nft.mcp-migration.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nft.mcp-migration</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index-daemon.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3000</string>
        <key>HOST</key>
        <string>localhost</string>
        <key>PRIVATE_KEY</key>
        <string>0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f</string>
        <key>WALLET_ADDRESS</key>
        <string>0xB34d4c8E3AcCB5FA62455228281649Be525D4e59</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/mcp-nft-migration.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/mcp-nft-migration.error.log</string>
</dict>
</plist>
```

#### 步骤 2: 启动和管理

```bash
# 1. 加载服务
launchctl load ~/Library/LaunchAgents/com.nft.mcp-migration.plist

# 2. 启动服务
launchctl start com.nft.mcp-migration

# 3. 查看状态
launchctl list | grep com.nft.mcp-migration

# 4. 停止服务
launchctl stop com.nft.mcp-migration

# 5. 卸载服务
launchctl unload ~/Library/LaunchAgents/com.nft.mcp-migration.plist

# 6. 查看日志
tail -f /tmp/mcp-nft-migration.log
```

---

## 方案对比

| 特性           | systemd | PM2  | Docker | launchd |
|----------------|---------|------|--------|---------|
| **平台**       | Linux   | 跨平台 | 跨平台  | macOS   |
| **复杂度**     | 中等    | 简单  | 中等    | 中等    |
| **监控**       | 基础    | 丰富  | 基础    | 基础    |
| **日志**       | journald | 文件  | docker logs | 文件 |
| **资源隔离**   | 有限    | 无    | 完全    | 有限    |
| **推荐度**     | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 推荐方案

### 开发环境
**推荐**: PM2
- 简单易用
- 跨平台
- 丰富的监控

### 生产环境（Linux）
**推荐**: systemd
- 系统原生
- 稳定可靠
- 资源控制

### 生产环境（macOS）
**推荐**: launchd 或 PM2
- launchd: 系统原生
- PM2: 更灵活

### 容器化部署
**推荐**: Docker
- 环境一致
- 易于部署
- 版本管理

---

## 测试守护进程

### 测试 1: 健康检查

```bash
curl http://localhost:3000/health

# 预期输出:
# {"status":"ok","timestamp":1697520000000,"uptime":123.456}
```

### 测试 2: 信息查询

```bash
curl http://localhost:3000/info

# 预期输出:
# {"name":"mcp-nft-migration-daemon","version":"1.0.0","mode":"daemon","transport":"SSE"}
```

### 测试 3: Claude Code 连接

在 Claude Code 中：
```
列出所有 MCP 工具
```

应该看到 9 个工具。

### 测试 4: 独立性测试

```bash
# 1. 启动守护进程
pm2 start ecosystem.config.js

# 2. 验证运行
curl http://localhost:3000/health

# 3. 启动 Claude Code，测试连接

# 4. 关闭 Claude Code

# 5. 验证守护进程仍在运行
curl http://localhost:3000/health

# 6. 再次启动 Claude Code，应该可以立即连接
```

---

## 下一步

选择一个方案并实施：

1. **PM2 方案**（最简单）:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

2. **systemd 方案**（Linux 生产环境）:
   ```bash
   sudo cp mcp-nft-migration.service /etc/systemd/system/
   sudo systemctl enable --now mcp-nft-migration
   ```

3. **Docker 方案**（容器化）:
   ```bash
   docker-compose up -d
   ```

---

## 总结

守护进程模式的关键改动：

1. **传输层**: stdio → HTTP/SSE
2. **启动方式**: Claude Code 启动 → 系统服务启动
3. **配置方式**: `command` + `args` → `url`
4. **生命周期**: 依赖 Claude Code → 独立运行

**优势**:
- ✅ 完全独立
- ✅ 多客户端支持
- ✅ 自动重启
- ✅ 日志管理
- ✅ 资源控制

需要我帮你实现哪个方案？
