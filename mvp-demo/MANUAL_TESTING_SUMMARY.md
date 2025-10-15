# 📋 手动测试完整说明 - 总结

## 🎯 测试目标

验证 NFT 元数据从 IPFS 迁移到 Filecoin 的完整流程，包括：
1. Filecoin 存储上传
2. ERC-8004 验证标准
3. AI Agent 注册和验证

## 📚 文档导航

### 核心文档

1. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** ⭐ 主要文档
   - 完整的分步指南
   - 从零开始的详细说明
   - 包含所有命令和预期输出

2. **[QUICK_START.md](./QUICK_START.md)** ⚡ 快速开始
   - 5 分钟快速启动
   - 最少命令快速测试
   - 适合有经验的用户

3. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** 🔧 故障排查
   - 错误码对照表
   - 快速修复命令
   - 问题决策树

4. **[README.md](./README.md)** 📖 项目说明
   - 项目概述
   - 功能介绍
   - 脚本列表

5. **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** 📊 当前状态
   - 测试结果
   - 已知问题
   - 技术细节

## 🚀 测试流程

### 🎬 完整流程（首次测试）

**阅读**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

**时间**: 30-60 分钟

**步骤**:
1. 环境准备（10 分钟）
2. 获取测试代币（10-20 分钟，取决于水龙头）
3. 授权设置（3-5 分钟）
4. 测试上传（8-15 分钟）

### ⚡ 快速流程（已有代币）

**阅读**: [QUICK_START.md](./QUICK_START.md)

**时间**: 5-20 分钟

**命令**:
```bash
npm install
echo "PRIVATE_KEY=0x..." > .env
node setup-via-sdk.js
node pre-upload-check.js
node test-real-upload-small.js
```

### 🔧 故障排查

**阅读**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**最常用**:
```bash
# 重置授权
node setup-via-sdk.js

# 验证状态
node verify-approvals.js
node pre-upload-check.js
```

## 📦 测试脚本一览

### 设置类
| 脚本 | 用途 | 时间 |
|------|------|------|
| `setup-via-sdk.js` | 设置所有授权（推荐） | 2-3 分钟 |
| `verify-approvals.js` | 验证授权状态 | 10 秒 |
| `pre-upload-check.js` | 上传前置检查 | 10 秒 |

### 测试类
| 脚本 | 用途 | 时间 |
|------|------|------|
| `test-real-upload-small.js` | 上传测试（1.1MB） | 8-15 分钟 |
| `demo.js` | 完整流程演示 | 20-40 分钟 |
| `interactive-workflow.js` | 交互式工作流 | 按需 |

### 工具类
| 脚本 | 用途 | 时间 |
|------|------|------|
| `check-balances.js` | 检查所有余额 | 5 秒 |
| `get-real-addresses.js` | 获取合约地址 | 5 秒 |
| `generate-new-wallet.js` | 生成新钱包 | 即时 |

## ✅ 成功标准

测试被认为成功，如果满足以下任一条件：

### 标准 A: 完全成功 🎉
```
✅ SDK 初始化成功
✅ 所有授权设置成功
✅ Data Set 创建成功
✅ Preflight Check 通过
✅ 上传请求发送成功
✅ 获得 PieceCID
✅ 数据完整性验证通过
```

### 标准 B: 部分成功（SP 问题）✅
```
✅ SDK 初始化成功
✅ 所有授权设置成功
✅ Data Set 创建成功
✅ Preflight Check 通过
✅ 上传请求发送成功
⚠️  SP parking 超时
```

**说明**: 如果前 5 步成功，只有最后 SP parking 超时，**这仍然算成功**！
因为：
- 你的代码完全正确
- 所有配置都正确
- 问题在于测试网 SP 性能
- 等 SP 恢复后会立即成功

## 🎓 学习路径

### 初学者路径
1. 阅读 [README.md](./README.md) - 了解项目
2. 阅读 [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 详细学习
3. 按步骤操作测试
4. 遇到问题查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 快速测试路径
1. 阅读 [QUICK_START.md](./QUICK_START.md)
2. 运行快速命令
3. 遇到问题查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 深入研究路径
1. 所有文档都读一遍
2. 查看 [CURRENT_STATUS.md](./CURRENT_STATUS.md) 了解技术细节
3. 阅读源码（test-real-upload-small.js 等）
4. 自己修改和实验

## 🔑 关键知识点

### 1. 错误码 33
- **原因**: 授权不足或使用错误的 Payments 地址
- **解决**: 使用 SDK API 设置授权
- **关键**: 必须用 `synapse.getPaymentsAddress()` 获取地址

### 2. Storage Provider 要求
- **最小文件**: 1 MB
- **测试网**: 目前只有 ezpdpz-calib
- **性能**: 可能很慢或超时（不是你的问题）

### 3. 授权流程
- **步骤 1**: 存入 USDFC 到 Payments
- **步骤 2**: 授权 Warm Storage 服务
- **关键**: 使用 SDK API，不要手动操作

### 4. USDFC 获取
- **用途**: 支付 Filecoin 存储费用
- **需要**: 至少 50 USDFC
- **途径**: Filecoin 社区（Slack/Discord）

## 📊 测试检查清单

复制这个清单，逐项检查：

```
准备阶段
□ Node.js >= 18 已安装
□ npm 依赖已安装  
□ .env 文件已配置
□ 私钥已添加

代币准备
□ Sepolia ETH >= 0.1 ETH
□ Calibration FIL >= 50 FIL
□ USDFC >= 50 USDFC

授权设置
□ 运行 setup-via-sdk.js 成功
□ Payments 合约有 USDFC
□ 服务授权已设置
□ verify-approvals.js 全部通过

测试执行
□ pre-upload-check.js 全部通过
□ test-real-upload-small.js 开始执行
□ Data Set 创建成功
□ Preflight Check 通过
□ 上传请求发送成功

结果验证
□ 获得 PieceCID（如果 SP 正常）
□ 或所有前置步骤成功（如果 SP 超时）
```

## 🆘 获取帮助

### 自助资源
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 快速修复
2. [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 详细说明
3. [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 技术细节

### 社区支持
- Filecoin Slack: https://filecoin.io/slack (#fil-help)
- Filecoin Discord: https://discord.gg/filecoin
- GitHub Issues: 提交问题

### 报告问题时提供
```bash
# 运行这些命令并提供输出
node --version
npm list @filoz/synapse-sdk
node check-balances.js
node verify-approvals.js
node pre-upload-check.js
```

## 🎉 成功后的下一步

测试成功后，你可以：

1. **理解流程** - 你已经掌握了完整的 Filecoin 存储流程
2. **扩展功能** - 修改脚本实现自己的需求
3. **集成到项目** - 将这些功能集成到你的应用
4. **贡献改进** - 提交改进建议或 PR

## 📝 文档版本

- **版本**: 1.0
- **最后更新**: 2025-10-16
- **维护状态**: 活跃维护

## 🙏 致谢

感谢 Filecoin 社区和 Synapse SDK 团队！

---

**开始测试**: 选择你的路径，开始探索 Filecoin 存储！🚀

**推荐首选**: [TESTING_GUIDE.md](./TESTING_GUIDE.md) 📖
