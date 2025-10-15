# NFT Migration MCP Server

MCP (Model Context Protocol) Server for NFT IPFS to Filecoin Migration with ERC-8004 Validation.

通过 Claude Code Desktop，使用自然语言完成 NFT 迁移任务。

---

## 🎯 功能特性

### 🛠️ 工具 (Tools)

1. **verify_setup** - 验证环境配置（私钥、SDK、余额、授权）
2. **setup_approvals** - 自动设置 Filecoin 存储授权
3. **check_balances** - 检查钱包余额（FIL、USDFC、Payments）
4. **nft_scan** - 扫描以太坊 NFT 合约
5. **get_nft_metadata** - 获取 NFT 元数据（从 IPFS/HTTP）
6. **upload_to_filecoin** - 上传 NFT 元数据到 Filecoin
7. **test_upload** - 测试上传功能
8. **erc8004_validate** - ERC-8004 验证
9. **update_contract_uri** - 更新合约 tokenURI

### 📊 资源 (Resources)

1. **nft-migration://status** - 当前迁移任务状态
2. **nft-migration://balances** - 钱包余额信息
3. **nft-migration://contracts** - Filecoin 合约地址
4. **nft-migration://environment** - 环境配置信息

### 📝 提示模板 (Prompts)

1. **migration_workflow** - 完整迁移工作流程
2. **troubleshooting** - 问题排查指南
3. **setup_guide** - 初始设置指南
4. **quick_test** - 快速测试

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd mcp-nft-migration
npm install
```

### 2. 构建

```bash
npm run build
```

### 3. 配置 Claude Code Desktop

编辑 `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/path/to/mcp-nft-migration/build/index.js"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "WALLET_ADDRESS": "0x...",
        "ETHEREUM_NETWORK_RPC_URL": "https://eth-sepolia.public.blastapi.io",
        "FILECOIN_NETWORK_RPC_URL": "https://api.calibration.node.glif.io/rpc/v1",
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io"
      }
    }
  }
}
```

### 4. 重启 Claude Code Desktop

完全退出并重新启动 Claude Code。

### 5. 开始使用

在 Claude Code 中输入：

```
请帮我测试 Filecoin 上传功能。
```

---

## 📖 使用示例

### 示例 1: 环境验证

```
请检查我的环境配置是否正确。
```

Claude 会调用 `verify_setup` 工具，检查：
- ✅ 私钥配置
- ✅ SDK 版本（v0.33.0）
- ✅ FIL 余额
- ✅ USDFC 余额
- ✅ Payments 余额
- ✅ 服务授权

### 示例 2: 设置授权

```
我需要设置 Filecoin 存储授权。
```

Claude 会调用 `setup_approvals` 工具：
- 存入 35 USDFC 到 Payments 合约
- 授权 Warm Storage 服务
- 验证授权成功

### 示例 3: 扫描 NFT

```
请扫描合约 0x1234...5678 的 NFT。
```

Claude 会调用 `nft_scan` 工具，返回：
- NFT 数量
- Token IDs
- Owners
- Token URIs

### 示例 4: 迁移 NFT

```
帮我将合约 0x1234...5678 的 Token ID #1 迁移到 Filecoin。
```

Claude 会自动执行完整流程：
1. 验证环境 (`verify_setup`)
2. 获取元数据 (`get_nft_metadata`)
3. 上传到 Filecoin (`upload_to_filecoin`)
4. 更新合约 (`update_contract_uri`)
5. ERC-8004 验证 (`erc8004_validate`)
6. 生成报告

### 示例 5: 批量迁移

```
请迁移合约 0x1234...5678 的所有 NFT。
```

Claude 会：
1. 扫描所有 NFT (`nft_scan`)
2. 对每个 NFT 执行迁移流程
3. 统计成功/失败数量
4. 生成详细报告

### 示例 6: 排查问题

```
我遇到了错误码 33，怎么办？
```

Claude 会：
1. 调用 `troubleshooting` 提示模板
2. 检查余额 (`check_balances`)
3. 建议运行 `setup_approvals`
4. 提供详细解决方案

---

## 🏗️ 架构

```
用户 (自然语言)
    ↓
Claude Code Desktop
    ↓ MCP Protocol
MCP Server (Node.js)
    ├── Tools (工具层)
    │   ├── setup.ts      - 环境验证、授权设置
    │   ├── upload.ts     - Filecoin 上传
    │   ├── nft.ts        - NFT 扫描、元数据获取
    │   └── validation.ts - ERC-8004 验证
    ├── Resources (资源层)
    │   └── index.ts      - 状态、余额、合约查询
    └── Prompts (提示层)
        └── index.ts      - 工作流程、故障排查模板
    ↓
底层实现 (mvp-demo)
    ├── filecoin-uploader-v033.js - Synapse SDK v0.33.0
    ├── phases/               - Phase 模块
    ├── setup-via-sdk.js      - 授权设置脚本
    └── test-real-upload-small.js - 上传测试
```

---

## 🧪 开发和测试

### 开发模式

```bash
# 监听文件变化，自动重新编译
npm run watch
```

### 手动测试

```bash
# 直接运行 MCP Server (stdio 模式)
node build/index.js

# 应该输出:
# NFT Migration MCP Server running on stdio
```

### 调试

MCP Server 使用 stderr 输出日志，Claude Code 会捕获这些日志。

在代码中添加：
```typescript
console.error('Debug info:', data);
```

---

## 📚 相关文档

- **CLAUDE_CODE_SETUP.md** - Claude Code 详细配置指南
- **LLM_MCP_INTEGRATION.md** - 完整架构和设计文档
- **../mvp-demo/TESTING_GUIDE.md** - 手动测试指南
- **../mvp-demo/CURRENT_STATUS.md** - 项目当前状态

---

## 🔧 技术栈

- **MCP SDK**: `@modelcontextprotocol/sdk` v0.5.0
- **Validation**: `zod` v3.22.4
- **Runtime**: Node.js >= 20.10.0
- **Language**: TypeScript 5.3.0

---

## 🌐 网络配置

### Ethereum Sepolia (ERC-8004 验证)
- RPC: https://eth-sepolia.public.blastapi.io
- 用途: 部署和调用 ERC-8004 验证合约

### Filecoin Calibration (存储)
- RPC: https://api.calibration.node.glif.io/rpc/v1
- 用途: 上传 NFT 元数据到 Filecoin
- SDK: Synapse SDK v0.33.0

### Ethereum Mainnet (只读)
- RPC: https://eth-mainnet.public.blastapi.io
- 用途: 读取 NFT 合约（只读，不发送交易）

---

## 💰 所需代币

1. **Sepolia ETH** - ERC-8004 验证交易 gas
   - 获取: https://sepoliafaucet.com/

2. **Calibration FIL** - Filecoin 交易 gas
   - 获取: https://faucet.calibnet.chainsafe-fil.io/

3. **USDFC** - Filecoin 存储费用
   - 获取: https://pdp.vxb.ai/faucet

---

## ⚠️ 注意事项

1. **私钥安全**
   - 配置文件中的私钥是明文存储
   - 仅用于测试网
   - 设置正确的文件权限: `chmod 600 ~/.config/Claude/claude_desktop_config.json`

2. **Storage Provider 性能**
   - Calibration 测试网的 SP 可能响应较慢
   - 上传超时不一定是代码问题
   - 建议在网络良好时测试

3. **文件大小要求**
   - Storage Provider 要求最小文件大小 1 MB
   - 小于 1 MB 的元数据会自动填充

4. **授权设置**
   - 必须先运行 `setup_approvals` 设置授权
   - 否则会遇到错误码 33

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

---

## 📄 许可证

MIT License

---

## 🎉 致谢

- Filecoin Synapse SDK
- Model Context Protocol (MCP)
- Claude Code Desktop
- Anthropic

---

**Happy Migrating! 🚀**
