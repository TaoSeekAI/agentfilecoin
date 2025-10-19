# HTTP 模式使用指南

## stdio vs HTTP 对比

### stdio 模式 - **进程启动**

```json
{
  "command": "node",
  "args": ["/path/to/index.js"],
  "env": {...}
}
```

**特点**：
- ✅ **最简单** - 无需额外配置
- ✅ **无网络** - 通过管道通信
- ✅ **无 OAuth** - 直接进程通信
- ❌ **不独立** - Claude Code 退出时停止
- ❌ **单客户端** - 只能被 Claude Code 使用

**工作原理**：
```
Claude Code
  ↓ spawn/fork
MCP Server Process
  ↓ stdin/stdout pipes
JSON-RPC messages
```

### HTTP 模式 - **网络连接**

```json
{
  "type": "http",
  "url": "http://localhost:3000/mcp"
}
```

**特点**：
- ✅ **独立运行** - 守护进程模式
- ✅ **多客户端** - 可被多个客户端连接
- ✅ **持久化** - Claude Code 退出后继续运行
- ✅ **远程访问** - 可以通过网络访问
- ⚠️ **需要 OAuth** - Claude Code 会尝试 OAuth 发现
- ⚠️ **网络开销** - HTTP 请求相对较慢

**工作原理**：
```
Claude Code
  ↓ HTTP requests
MCP Daemon (localhost:3000)
  ↓ HTTP/SSE responses
JSON-RPC over HTTP
```

## 为什么 HTTP 需要 OAuth？

### Claude Code 的行为

当配置 `"type": "http"` 时，Claude Code 会：

1. **发现请求**：`GET /.well-known/openid-configuration`
   - 检查服务器是否支持 OAuth
   - 获取认证端点信息

2. **客户端注册**：`POST /register`
   - 动态客户端注册 (RFC 7591)
   - 获取 client_id 和 client_secret

3. **如果失败**：显示 "failed" 状态

### 为什么不强制 OAuth？

根据 [GitHub Issue #2831](https://github.com/anthropics/claude-code/issues/2831)：
- **这是一个 bug**！
- HTTP transport **应该支持 Authorization header**
- **不应该强制 OAuth**
- v1.0.40+ 已修复

但实际使用中，Claude Code 仍然会尝试 OAuth 发现。

## Mock OAuth 方案

### 实现原理

我们添加了 **mock OAuth 端点**，满足 Claude Code 的发现需求，但**实际不需要认证**：

```typescript
// OAuth Discovery
app.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: 'http://localhost:3000',
    authorization_endpoint: 'http://localhost:3000/authorize',
    token_endpoint: 'http://localhost:3000/token',
    registration_endpoint: 'http://localhost:3000/register',
  });
});

// Client Registration - 返回 mock 凭证
app.post('/register', (req, res) => {
  res.json({
    client_id: 'mock-client-id',
    client_secret: 'mock-client-secret',
  });
});

// Authorization - 自动批准
app.get('/authorize', (req, res) => {
  const redirectUri = req.query.redirect_uri;
  res.redirect(`${redirectUri}?code=mock-auth-code&state=${req.query.state}`);
});

// Token Exchange - 返回 mock token
app.post('/token', (req, res) => {
  res.json({
    access_token: 'mock-access-token',
    token_type: 'Bearer',
  });
});
```

### 优势

1. ✅ **满足 Claude Code 要求** - OAuth 端点存在
2. ✅ **无需真实认证** - 返回 mock 数据
3. ✅ **保持简单** - 不需要实现完整 OAuth 流程
4. ✅ **开发友好** - 本地开发无需配置认证服务器

## 使用建议

### 本地开发 → stdio 模式

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "WALLET_ADDRESS": "0x..."
      }
    }
  }
}
```

**原因**：
- 最简单
- 无需守护进程
- 调试方便

### 多客户端/远程 → HTTP 模式

```json
{
  "mcpServers": {
    "nft-migration": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**启动守护进程**：
```bash
PORT=3000 ./scripts/daemon-manager.sh start
```

**原因**：
- 独立运行
- 支持多客户端
- 可以远程访问

### 生产环境 → HTTP + 真实 OAuth

如果需要部署到生产环境，应该：

1. **使用真实 OAuth Provider**：
   - Auth0
   - Keycloak
   - Entra ID (Azure AD)
   - 自建 OAuth 服务器

2. **配置 MCP SDK 的 OAuth 支持**：
```typescript
import { AuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { ProxyOAuthProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';

const authRouter = new AuthRouter({
  provider: new ProxyOAuthProvider({
    issuer: 'https://your-oauth-server.com',
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
  }),
});

app.use('/oauth', authRouter.router);
```

3. **保护 MCP 端点**：
```typescript
import { bearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';

app.use('/mcp', bearerAuth({ provider: authProvider }));
```

## 常见问题

### Q: 为什么 stdio 不需要 OAuth？

**A**: stdio 模式通过进程管道通信，不走网络：
- Claude Code 直接 spawn 进程
- 进程只能被父进程访问
- 不存在网络暴露风险
- 无需额外认证

### Q: Mock OAuth 安全吗？

**A**: 取决于使用场景：

**✅ 安全场景**：
- **localhost 开发** - 只监听 127.0.0.1
- **防火墙保护** - 不对外暴露
- **内网使用** - 可信网络环境

**❌ 不安全场景**：
- **公网暴露** - 任何人都能访问
- **生产环境** - 需要真实认证
- **敏感操作** - 涉及资金、数据修改

**建议**：
```typescript
// 开发环境
const ENABLE_MOCK_OAUTH = process.env.NODE_ENV !== 'production';

if (ENABLE_MOCK_OAUTH) {
  app.get('/.well-known/openid-configuration', mockOAuthDiscovery);
  app.post('/register', mockClientRegistration);
} else {
  // 使用真实 OAuth
  app.use('/oauth', authRouter.router);
}
```

### Q: 可以让 HTTP 模式完全不需要 OAuth 吗？

**A**: 理论上可以，但 Claude Code 会尝试 OAuth 发现：

**方案 1**: **使用 Authorization header**
```json
{
  "type": "http",
  "url": "http://localhost:3000/mcp",
  "headers": {
    "Authorization": "Bearer your-api-key"
  }
}
```

但根据 GitHub Issue，这个功能可能不稳定。

**方案 2**: **Mock OAuth** (当前方案)
- 满足 Claude Code 的期望
- 实际不需要认证
- 最稳定的解决方案

### Q: rube.app 是怎么做的？

**A**: rube.app 使用**真实的 OAuth 认证**：

测试证明：
```bash
curl -X POST https://rube.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize"}'

# 返回：
{
  "error": "invalid_token",
  "error_description": "No authorization provided"
}
```

这说明 rube：
1. 要求真实的 OAuth token
2. 有完整的 OAuth 服务器
3. 验证每个请求的 token

### Q: 守护进程的端口配置？

**A**: 避免端口冲突：

```bash
# 检查端口占用
lsof -i :3000

# 使用环境变量指定端口
PORT=3000 ./scripts/daemon-manager.sh start

# 或修改默认端口
export PORT=3000
./scripts/daemon-manager.sh start
```

**注意**：
- 避免使用已占用的端口（如 5010）
- 使用大于 1024 的端口（无需 root）
- 推荐使用 3000-9000 范围

## 配置示例

### 完整的 Claude Code 配置

```json
{
  "installMethod": "unknown",
  "autoUpdates": true,
  "mcpServers": {
    "nft-migration-stdio": {
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
    },
    "nft-migration-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  },
  "userID": "97634703f9c1499e66f152ce6146a48215d3cd474fbeb3f22e796df7532f39bf",
  "fallbackAvailableWarningThreshold": 0.5
}
```

可以同时配置两种模式，根据需要选择使用。

## 测试验证

### 测试 OAuth 端点

```bash
# 1. OAuth 发现
curl http://localhost:3000/.well-known/openid-configuration | jq .

# 2. 客户端注册
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"test"}' | jq .

# 3. 授权（在浏览器中测试）
open "http://localhost:3000/authorize?redirect_uri=http://localhost&state=test"

# 4. Token 交换
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"authorization_code","code":"test"}' | jq .
```

### 测试 MCP 功能

```bash
# MCP 初始化
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "test",
        "version": "1.0.0"
      }
    }
  }'

# 应该返回：
# event: message
# data: {"result":{"protocolVersion":"2025-03-26",...}}
```

### 测试守护进程

```bash
# 启动
PORT=3000 ./scripts/daemon-manager.sh start

# 状态
./scripts/daemon-manager.sh status

# 健康检查
curl http://localhost:3000/health | jq .

# 停止
./scripts/daemon-manager.sh stop

# 重启
PORT=3000 ./scripts/daemon-manager.sh restart
```

## 总结

| 特性 | stdio 模式 | HTTP + Mock OAuth | HTTP + 真实 OAuth |
|-----|-----------|------------------|------------------|
| 复杂度 | ⭐ 简单 | ⭐⭐ 中等 | ⭐⭐⭐ 复杂 |
| 安全性 | ⭐⭐⭐ 高 | ⭐⭐ 中 | ⭐⭐⭐ 高 |
| 独立运行 | ❌ | ✅ | ✅ |
| 多客户端 | ❌ | ✅ | ✅ |
| 远程访问 | ❌ | ⚠️ | ✅ |
| 生产就绪 | ✅ | ❌ | ✅ |
| 推荐场景 | 本地开发 | 多客户端开发 | 生产环境 |

**最佳实践**：
- 🏠 **本地单用户** → stdio 模式
- 👥 **本地多客户端** → HTTP + Mock OAuth
- 🌐 **远程/生产** → HTTP + 真实 OAuth
