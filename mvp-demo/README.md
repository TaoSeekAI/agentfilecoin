# 🚀 NFT IPFS to Filecoin Migration - MVP Demo

将 NFT 的 IPFS 元数据迁移到 Filecoin 永久存储，并通过 ERC-8004 标准进行 AI Agent 验证。

## 📚 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

```bash
cp .env.example .env
nano .env  # 添加你的私钥
```

### 3. 获取测试代币

参考 [TESTING_GUIDE.md](./TESTING_GUIDE.md) 获取：
- Sepolia ETH
- Calibration FIL  
- USDFC（重要！）

### 4. 设置授权

```bash
# 自动设置所有授权
node setup-via-sdk.js

# 验证授权状态
node verify-approvals.js
```

### 5. 运行测试

```bash
# 前置检查
node pre-upload-check.js

# 测试上传
node test-real-upload-small.js

# 完整演示
node demo.js
```

## 📖 完整文档

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - 详细的测试指南
- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - 当前项目状态
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构说明

## 🎯 主要功能

1. **NFT 扫描** - 从 Ethereum 主网扫描 NFT
2. **Agent 注册** - 在 ERC-8004 标准上注册 AI Agent
3. **Filecoin 存储** - 将元数据上传到 Filecoin
4. **验证证明** - 生成并提交验证证明
5. **报告生成** - 导出完整的迁移报告

## 🔧 可用脚本

### 设置和准备
- `generate-new-wallet.js` - 生成新钱包
- `check-balances.js` - 检查所有余额
- `setup-via-sdk.js` - 设置授权（推荐）
- `verify-approvals.js` - 验证授权状态
- `pre-upload-check.js` - 上传前置检查

### 测试脚本
- `test-real-upload-small.js` - 上传测试（1.1 MB）
- `demo.js` - 完整流程演示（一次性）
- `interactive-workflow.js` - 交互式工作流

### 工具脚本
- `get-real-addresses.js` - 获取合约地址
- `transfer-eth-auto.js` - 转账 ETH
- `transfer-fil-auto.js` - 转账 FIL

## ⚠️  重要提示

### 必读！

1. **必须先设置授权**
   ```bash
   node setup-via-sdk.js
   ```
   否则会遇到错误码 33！

2. **USDFC 是必需的**
   - 用于支付 Filecoin 存储费用
   - 至少需要 50 USDFC
   - 参考测试指南获取

3. **文件大小要求**
   - Storage Provider 最小要求：1 MB
   - 测试脚本已自动处理

4. **Storage Provider 可能超时**
   - 这不是你的问题！
   - 测试网 SP 有时会很慢
   - 稍后重试即可

## 🐛 故障排查

### 错误码 33
```bash
# 解决方案：重新设置授权
node setup-via-sdk.js
node verify-approvals.js
```

### SP 超时
```bash
# 这是 SP 的问题，等待后重试
# 所有其他步骤成功即表示你的代码正确
```

### 网络问题
```bash
# 检查网络连接
curl https://api.calibration.node.glif.io/rpc/v1
```

完整故障排查指南：[TESTING_GUIDE.md#故障排查](./TESTING_GUIDE.md#故障排查)

## 📊 项目状态

✅ **完成的功能**:
- SDK 升级到 v0.33.0（真实实现）
- 完整的授权流程
- Data Set 创建
- 上传测试
- 完整工作流

⚠️  **已知问题**:
- Storage Provider 有时响应慢（测试网问题）
- 需要手动获取 USDFC（水龙头有限）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 获取帮助

- **Filecoin Slack**: https://filecoin.io/slack
- **Filecoin Discord**: https://discord.gg/filecoin
- **项目 Issues**: (你的 GitHub Issues 链接)

## 📄 许可证

MIT License

---

**开始测试**: 阅读 [TESTING_GUIDE.md](./TESTING_GUIDE.md) 📖

**查看状态**: 查看 [CURRENT_STATUS.md](./CURRENT_STATUS.md) 📊
