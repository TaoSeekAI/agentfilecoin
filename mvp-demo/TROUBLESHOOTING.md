# 🔧 故障排查速查表

快速解决常见问题！

## 🚨 错误码对照表

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| 33 | 授权不足 | `node setup-via-sdk.js` |
| timeout | 网络/SP 慢 | 等待重试或检查网络 |
| invalid private key | 私钥格式错误 | 确保以 0x 开头 |
| insufficient funds | 代币不足 | 获取更多测试代币 |

## 💡 快速修复命令

### 重置所有授权
```bash
node setup-via-sdk.js
node verify-approvals.js
```

### 检查所有状态
```bash
node check-balances.js
node pre-upload-check.js
```

### 获取合约地址
```bash
node get-real-addresses.js
```

## 🔍 诊断流程

### 步骤 1: 检查余额
```bash
node check-balances.js
```

期望看到：
- ✅ FIL > 1
- ✅ USDFC (钱包) > 5  
- ✅ USDFC (Payments) > 5

### 步骤 2: 验证授权
```bash
node verify-approvals.js
```

期望看到：
- ✅ Payments 合约有余额
- ✅ 服务授权已设置

### 步骤 3: 运行前置检查
```bash
node pre-upload-check.js
```

应该全部通过 ✅

### 步骤 4: 重新测试
```bash
node test-real-upload-small.js
```

## 📋 问题决策树

```
遇到错误
    |
    ├─ 错误码 33？
    │   └─ 运行: node setup-via-sdk.js
    |
    ├─ 超时错误？
    │   ├─ 网络连接？
    │   │   └─ 测试: curl https://api.calibration.node.glif.io/rpc/v1
    │   └─ SP 慢？
    │       └─ 等待重试（不是你的问题）
    |
    ├─ 余额不足？
    │   └─ 获取测试代币（参考 TESTING_GUIDE.md）
    |
    └─ 其他错误？
        └─ 查看完整文档或联系社区
```

## 🆘 获取帮助

### 准备信息
运行这些命令并保存输出：
```bash
# 1. 版本信息
node --version
npm list @filoz/synapse-sdk

# 2. 余额状态
node check-balances.js

# 3. 授权状态
node verify-approvals.js

# 4. 前置检查
node pre-upload-check.js
```

### 联系社区
- Filecoin Slack: https://filecoin.io/slack (#fil-help)
- Discord: https://discord.gg/filecoin
- GitHub: 提交 Issue

---

**大多数问题都可以通过重新运行 `setup-via-sdk.js` 解决！**
