# MCP Server 守护进程部署指南

完整的守护进程部署方案，实现 MCP Server 作为独立守护进程运行，Claude Code 启动与否都不影响其运行。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [架构说明](#架构说明)
3. [方案选择](#方案选择)
4. [详细部署步骤](#详细部署步骤)
5. [配置 Claude Code](#配置-claude-code)
6. [测试验证](#测试验证)
7. [运维管理](#运维管理)
8. [故障排除](#故障排除)

---

## 快速开始

### 最快 5 分钟部署（使用 PM2）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 构建项目
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm run build

# 3. 启动守护进程
pm2 start deploy/pm2/ecosystem.config.js

# 4. 配置 Claude Code
cp config/claude-code-daemon.json ~/.config/Claude/claude_desktop_config.json

# 5. 重启 Claude Code
# 完全退出并重新启动 Claude Code Desktop

# 6. 测试
curl http://localhost:3000/health
```

完成！🎉

---

## 架构说明

### 传统模式 vs 守护进程模式

#### 传统模式（stdio，子进程）

```
Claude Code Desktop
    │
    ├── 启动 MCP Server (子进程)
    │       ↓
    │   MCP Server (stdio)
    │       ↓
    └── 退出 → MCP Server 也退出 ❌
```

**问题**:
- ❌ Claude Code 退出，MCP Server 也停止
- ❌ 无法多客户端连接
- ❌ 无法独立管理和监控

#### 守护进程模式（HTTP/SSE，独立进程）✅

```
系统启动
    ↓
进程管理器 (systemd/PM2)
    ↓
MCP Server Daemon (HTTP/SSE)
    ↓
监听 localhost:3000
    ↓
    ├─────────────┬─────────────┐
    │             │             │
Claude Code #1  Claude Code #2  其他客户端
(可随时连接/断开)
```

**优势**:
- ✅ MCP Server 完全独立运行
- ✅ Claude Code 只是客户端（可随时连接/断开）
- ✅ 支持多个客户端同时连接
- ✅ 系统启动时自动启动
- ✅ 崩溃后自动重启
- ✅ 日志持久化和管理
- ✅ 资源限制和监控

---

## 方案选择

### 方案对比表

| 特性           | systemd | PM2  | Docker | Shell Script |
|----------------|---------|------|--------|--------------|
| **平台**       | Linux   | 跨平台 | 跨平台  | 跨平台       |
| **复杂度**     | 中等    | **简单** ⭐ | 中等    | 简单         |
| **监控**       | 基础    | **丰富** ⭐ | 基础    | 基础         |
| **日志管理**   | journald | **文件** ⭐ | docker logs | 文件 |
| **资源隔离**   | 有限    | 无    | **完全** ⭐ | 无    |
| **开机自启**   | ✅      | ✅    | ✅      | 手动配置     |
| **推荐度**     | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐       |

### 推荐方案

- **开发环境**: **PM2** ⭐ (最简单，功能丰富)
- **生产环境 (Linux)**: **systemd** (系统原生，稳定可靠)
- **生产环境 (macOS)**: **PM2** (跨平台，易用)
- **容器化部署**: **Docker** (环境一致，易于部署)
- **快速测试**: **Shell Script** (无需安装额外工具)

---

## 详细部署步骤

### 方案 1: PM2（推荐 ⭐）

#### 1.1 安装 PM2

```bash
npm install -g pm2
```

#### 1.2 构建项目

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm install
npm run build
```

验证构建：
```bash
ls build/index-daemon.js
# 应该存在
```

#### 1.3 配置 PM2

配置文件已生成：`deploy/pm2/ecosystem.config.js`

查看配置：
```bash
cat deploy/pm2/ecosystem.config.js
```

如需修改环境变量，编辑 `env` 部分。

#### 1.4 启动守护进程

```bash
# 启动
pm2 start deploy/pm2/ecosystem.config.js

# 查看状态
pm2 status

# 查看详细信息
pm2 show mcp-nft-migration

# 查看日志
pm2 logs mcp-nft-migration

# 实时监控
pm2 monit
```

#### 1.5 设置开机自启

```bash
# 保存当前 PM2 进程列表
pm2 save

# 生成启动脚本
pm2 startup

# 按提示执行 sudo 命令（仅需执行一次）
```

#### 1.6 常用管理命令

```bash
# 重启
pm2 restart mcp-nft-migration

# 停止
pm2 stop mcp-nft-migration

# 删除
pm2 delete mcp-nft-migration

# 重载配置
pm2 reload deploy/pm2/ecosystem.config.js

# 查看日志
pm2 logs mcp-nft-migration --lines 100

# 清空日志
pm2 flush mcp-nft-migration
```

---

### 方案 2: systemd（Linux 生产环境）

#### 2.1 构建项目

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm install
npm run build
```

#### 2.2 配置 systemd 服务

服务文件已生成：`deploy/systemd/mcp-nft-migration.service`

**修改配置**（根据实际情况）：
```bash
nano deploy/systemd/mcp-nft-migration.service

# 必须修改的项：
# - User=taoseekai          ← 改为你的用户名
# - Group=taoseekai         ← 改为你的用户组
# - WorkingDirectory=...    ← 确认路径正确
# - ExecStart=...           ← 确认路径正确
```

#### 2.3 安装服务

```bash
# 复制服务文件
sudo cp deploy/systemd/mcp-nft-migration.service /etc/systemd/system/

# 重载 systemd
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable mcp-nft-migration

# 启动服务
sudo systemctl start mcp-nft-migration

# 查看状态
sudo systemctl status mcp-nft-migration
```

#### 2.4 常用管理命令

```bash
# 启动
sudo systemctl start mcp-nft-migration

# 停止
sudo systemctl stop mcp-nft-migration

# 重启
sudo systemctl restart mcp-nft-migration

# 查看状态
sudo systemctl status mcp-nft-migration

# 查看日志
sudo journalctl -u mcp-nft-migration -f

# 查看最近 100 行日志
sudo journalctl -u mcp-nft-migration -n 100

# 禁用开机自启
sudo systemctl disable mcp-nft-migration
```

---

### 方案 3: Shell Script（快速测试）

#### 3.1 构建项目

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
npm install
npm run build
```

#### 3.2 使用守护进程管理脚本

脚本已生成：`scripts/daemon-manager.sh`

```bash
# 查看帮助
./scripts/daemon-manager.sh help

# 启动守护进程
./scripts/daemon-manager.sh start

# 查看状态
./scripts/daemon-manager.sh status

# 查看详细信息
./scripts/daemon-manager.sh info

# 查看日志
./scripts/daemon-manager.sh logs

# 实时跟踪日志
./scripts/daemon-manager.sh logs -f

# 查看错误日志
./scripts/daemon-manager.sh logs -e

# 测试端点
./scripts/daemon-manager.sh test

# 重启
./scripts/daemon-manager.sh restart

# 停止
./scripts/daemon-manager.sh stop
```

#### 3.3 日志文件位置

- **标准输出**: `logs/daemon.log`
- **错误输出**: `logs/daemon-error.log`
- **PID 文件**: `daemon.pid`

---

### 方案 4: Docker（容器化）

#### 4.1 创建 Dockerfile

```bash
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration

cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production

COPY src ./src
RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["node", "build/index-daemon.js"]
EOF
```

#### 4.2 构建镜像

```bash
docker build -t mcp-nft-migration:latest .
```

#### 4.3 运行容器

```bash
docker run -d \
  --name mcp-nft-migration \
  --restart unless-stopped \
  -p 3000:3000 \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  -e PRIVATE_KEY=0xe4db9f... \
  -e WALLET_ADDRESS=0xB34d4c... \
  -e ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io \
  -e FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1 \
  -e ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io \
  mcp-nft-migration:latest
```

#### 4.4 管理容器

```bash
# 查看状态
docker ps | grep mcp-nft-migration

# 查看日志
docker logs -f mcp-nft-migration

# 重启
docker restart mcp-nft-migration

# 停止
docker stop mcp-nft-migration

# 启动
docker start mcp-nft-migration

# 删除
docker rm -f mcp-nft-migration
```

---

## 配置 Claude Code

### 步骤 1: 选择配置文件

两个配置文件已生成：

1. **守护进程模式**: `config/claude-code-daemon.json` ⭐
2. **stdio 模式**: `config/claude-code-stdio.json`

### 步骤 2: 复制配置

**守护进程模式**（推荐）:
```bash
# macOS/Linux
cp config/claude-code-daemon.json ~/.config/Claude/claude_desktop_config.json

# Windows
copy config\claude-code-daemon.json %APPDATA%\Claude\claude_desktop_config.json
```

**或手动编辑**:
```bash
# macOS/Linux
nano ~/.config/Claude/claude_desktop_config.json

# 粘贴以下内容：
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
```

### 步骤 3: 重启 Claude Code

**完全退出** Claude Code Desktop 并重新启动。

**macOS**:
```bash
# 完全退出
osascript -e 'quit app "Claude"'

# 重新启动
open -a "Claude"
```

---

## 测试验证

### 测试 1: 验证守护进程运行

```bash
# 方法 1: 使用 PM2
pm2 status

# 方法 2: 使用 systemd
sudo systemctl status mcp-nft-migration

# 方法 3: 使用脚本
./scripts/daemon-manager.sh status

# 方法 4: 直接测试 HTTP
curl http://localhost:3000/health
```

**预期输出**:
```json
{
  "status": "ok",
  "timestamp": 1697520000000,
  "uptime": 123,
  "pid": 12345
}
```

### 测试 2: 验证端点

```bash
# Health check
curl http://localhost:3000/health | jq .

# Info
curl http://localhost:3000/info | jq .

# Root
curl http://localhost:3000/ | jq .
```

### 测试 3: 验证 Claude Code 连接

在 Claude Code 中输入：
```
列出所有 MCP 工具
```

应该看到 9 个工具：
- verify_setup
- setup_approvals
- check_balances
- upload_to_filecoin
- test_upload
- nft_scan
- get_nft_metadata
- erc8004_validate
- update_contract_uri

### 测试 4: 验证独立性

```bash
# 1. 确认守护进程运行
curl http://localhost:3000/health

# 2. 启动 Claude Code，测试连接
# 在 Claude Code 中: "列出所有 MCP 工具"

# 3. 关闭 Claude Code

# 4. 验证守护进程仍在运行
curl http://localhost:3000/health

# 5. 再次启动 Claude Code
# 应该可以立即连接，无需重新启动 MCP Server
```

### 测试 5: 完整功能测试

在 Claude Code 中：
```
请帮我检查 NFT 迁移环境
```

Claude 应该自动调用 `verify_setup` 工具并返回结果。

---

## 运维管理

### 查看日志

#### PM2
```bash
# 查看日志
pm2 logs mcp-nft-migration

# 查看最近 100 行
pm2 logs mcp-nft-migration --lines 100

# 实时跟踪
pm2 logs mcp-nft-migration --lines 0

# 仅错误日志
pm2 logs mcp-nft-migration --err

# 清空日志
pm2 flush mcp-nft-migration
```

#### systemd
```bash
# 查看日志
sudo journalctl -u mcp-nft-migration

# 实时跟踪
sudo journalctl -u mcp-nft-migration -f

# 查看最近 100 行
sudo journalctl -u mcp-nft-migration -n 100

# 查看今天的日志
sudo journalctl -u mcp-nft-migration --since today

# 查看特定时间范围
sudo journalctl -u mcp-nft-migration --since "2024-01-01" --until "2024-01-31"
```

#### Shell Script
```bash
# 查看日志
./scripts/daemon-manager.sh logs

# 实时跟踪
./scripts/daemon-manager.sh logs -f

# 查看错误日志
./scripts/daemon-manager.sh logs -e

# 实时跟踪错误日志
./scripts/daemon-manager.sh logs -e -f
```

### 监控

#### PM2 监控
```bash
# 实时监控
pm2 monit

# Web 监控（可选）
pm2 install pm2-server-monit
```

#### 自定义监控脚本

```bash
# 创建监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  RESPONSE=$(curl -s http://localhost:3000/health)
  if [ $? -eq 0 ]; then
    echo "[$(date)] Health check OK: $RESPONSE"
  else
    echo "[$(date)] Health check FAILED" >&2
    # 发送告警（可选）
  fi
  sleep 60
done
EOF

chmod +x monitor.sh
./monitor.sh
```

### 更新部署

#### PM2
```bash
# 1. 停止旧版本
pm2 stop mcp-nft-migration

# 2. 拉取最新代码
git pull

# 3. 重新构建
npm install
npm run build

# 4. 重启
pm2 restart mcp-nft-migration

# 或者一条命令
pm2 reload mcp-nft-migration --update-env
```

#### systemd
```bash
# 1. 停止服务
sudo systemctl stop mcp-nft-migration

# 2. 更新代码
git pull
npm install
npm run build

# 3. 重启服务
sudo systemctl start mcp-nft-migration

# 4. 验证
sudo systemctl status mcp-nft-migration
```

---

## 故障排除

### 问题 1: 守护进程无法启动

**检查 1: 端口占用**
```bash
# 检查 3000 端口是否被占用
lsof -i :3000

# 或
netstat -tlnp | grep 3000
```

**解决**: 修改端口
```bash
# PM2: 编辑 ecosystem.config.js
PORT=3001 pm2 restart mcp-nft-migration

# systemd: 编辑 service 文件
sudo nano /etc/systemd/system/mcp-nft-migration.service
# 修改 Environment="PORT=3001"
sudo systemctl daemon-reload
sudo systemctl restart mcp-nft-migration
```

**检查 2: 权限问题**
```bash
# 确保目录权限正确
ls -la /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration

# 修复权限
chmod -R 755 /var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration
```

**检查 3: 构建文件是否存在**
```bash
ls -la build/index-daemon.js
```

**解决**: 重新构建
```bash
npm run build
```

### 问题 2: Claude Code 无法连接

**检查 1: 守护进程是否运行**
```bash
curl http://localhost:3000/health
```

**检查 2: 配置文件是否正确**
```bash
cat ~/.config/Claude/claude_desktop_config.json
```

应该包含：
```json
{
  "mcpServers": {
    "nft-migration": {
      "url": "http://localhost:3000/message"
    }
  }
}
```

**检查 3: Claude Code 是否完全重启**
```bash
# macOS: 完全退出
osascript -e 'quit app "Claude"'

# 等待 5 秒
sleep 5

# 重新启动
open -a "Claude"
```

### 问题 3: 工具执行失败

**检查环境变量**:
```bash
# PM2
pm2 show mcp-nft-migration

# systemd
sudo systemctl show mcp-nft-migration -p Environment

# 手动测试
curl http://localhost:3000/info | jq .env
```

**查看详细日志**:
```bash
# PM2
pm2 logs mcp-nft-migration --err

# systemd
sudo journalctl -u mcp-nft-migration -p err

# Script
./scripts/daemon-manager.sh logs -e
```

### 问题 4: 守护进程频繁重启

**查看崩溃日志**:
```bash
# PM2
pm2 logs mcp-nft-migration --err --lines 200

# systemd
sudo journalctl -u mcp-nft-migration -n 200
```

**常见原因**:
1. 内存不足
2. 环境变量错误
3. RPC 端点不可用
4. 代码错误

**解决**:
```bash
# 增加内存限制 (PM2)
# 编辑 ecosystem.config.js
max_memory_restart: '2G'

# 验证环境变量
curl http://localhost:3000/info

# 测试 RPC 端点
curl https://eth-sepolia.public.blastapi.io
```

---

## 安全建议

### 1. 私钥安全

⚠️ **重要**: 配置文件中的私钥是明文存储！

**建议**:
```bash
# 设置正确的文件权限
chmod 600 ~/.config/Claude/claude_desktop_config.json
chmod 600 deploy/pm2/ecosystem.config.js
chmod 600 /etc/systemd/system/mcp-nft-migration.service

# 仅在测试网使用
# 生产环境使用硬件钱包或密钥管理服务
```

### 2. 网络安全

**仅监听 localhost**:
```bash
# 确保 HOST 设置为 localhost
HOST=localhost  # 不要使用 0.0.0.0
```

**使用防火墙**:
```bash
# 禁止外部访问 3000 端口
sudo ufw deny 3000/tcp
```

### 3. 日志安全

**定期清理日志**:
```bash
# PM2
pm2 flush

# systemd
sudo journalctl --vacuum-time=7d
```

---

## 总结

### 已创建的文件

```
mcp-nft-migration/
├── src/
│   ├── index.ts                    # stdio 模式 (原有)
│   └── index-daemon.ts             # HTTP/SSE 守护进程模式 ✨
├── deploy/
│   ├── systemd/
│   │   └── mcp-nft-migration.service  # systemd 服务配置 ✨
│   └── pm2/
│       └── ecosystem.config.js     # PM2 配置 ✨
├── scripts/
│   └── daemon-manager.sh           # 守护进程管理脚本 ✨
├── config/
│   ├── claude-code-daemon.json     # Claude Code 守护进程模式配置 ✨
│   └── claude-code-stdio.json      # Claude Code stdio 模式配置 ✨
├── DAEMON_MODE_DESIGN.md           # 架构设计文档 ✨
└── DAEMON_DEPLOYMENT.md            # 本部署指南 ✨
```

### 快速命令参考

#### PM2
```bash
pm2 start deploy/pm2/ecosystem.config.js  # 启动
pm2 stop mcp-nft-migration                 # 停止
pm2 restart mcp-nft-migration              # 重启
pm2 logs mcp-nft-migration                 # 日志
pm2 monit                                  # 监控
```

#### systemd
```bash
sudo systemctl start mcp-nft-migration     # 启动
sudo systemctl stop mcp-nft-migration      # 停止
sudo systemctl restart mcp-nft-migration   # 重启
sudo journalctl -u mcp-nft-migration -f    # 日志
```

#### Shell Script
```bash
./scripts/daemon-manager.sh start          # 启动
./scripts/daemon-manager.sh stop           # 停止
./scripts/daemon-manager.sh restart        # 重启
./scripts/daemon-manager.sh logs -f        # 日志
./scripts/daemon-manager.sh info           # 信息
```

### 下一步

1. ✅ 选择部署方案（推荐 PM2）
2. ✅ 构建项目
3. ✅ 启动守护进程
4. ✅ 配置 Claude Code
5. ✅ 测试验证
6. ✅ 享受独立运行的 MCP Server！

---

**祝部署顺利！** 🚀

有问题随时查看本文档的[故障排除](#故障排除)部分。
