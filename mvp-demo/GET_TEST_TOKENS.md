# 🪙 获取测试代币指南

## ✅ 新钱包信息

**钱包地址**: `0xB34d4c8E3AcCB5FA62455228281649Be525D4e59`

**私钥**: `0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f`

**助记词**: `tired scout help hungry tray hero govern sting double reject wall cattle`

⚠️ **重要**: 这是测试钱包，仅用于Filecoin Calibration和Sepolia测试网！

---

## 🎯 需要获取的测试代币

### 1. 🔷 Sepolia ETH (用于 ERC-8004 合约交互)

**水龙头地址**:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

**步骤**:
1. 访问任一水龙头
2. 输入钱包地址: `0xB34d4c8E3AcCB5FA62455228281649Be525D4e59`
3. 完成验证（可能需要登录 Alchemy/QuickNode）
4. 获取 0.5 - 1 Sepolia ETH

**用途**: 在 Sepolia 上注册 ERC-8004 Agent 和创建验证请求

---

### 2. 🔶 Calibration FIL (用于 Filecoin 交易)

**水龙头地址**:
- https://faucet.calibration.fildev.network/
- https://beryx.zondax.ch/faucet

**步骤**:
1. 访问 Filecoin Calibration 水龙头
2. 输入钱包地址: `0xB34d4c8E3AcCB5FA62455228281649Be525D4e59`
3. 完成验证（可能需要 GitHub 账号）
4. 获取 5 - 10 tFIL

**用途**: 支付 Filecoin Calibration 测试网的 gas 费用

---

### 3. 💵 USDFC (用于 Filecoin 存储支付)

**USDFC 合约地址**: `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0`

**获取方式**:

#### 选项 A: USDFC 水龙头（如果存在）
目前没有公开的 USDFC 测试网水龙头。可以尝试：
- Filecoin 社区频道询问
- Slack 上的 #fil-lotus-help 频道
- Discord 上的 Filecoin 开发者频道

#### 选项 B: 从其他钱包转账
如果你有其他钱包有 USDFC：

```javascript
// 运行这个脚本从有 USDFC 的钱包转账
node transfer-usdfc.js
```

#### 选项 C: 使用测试脚本获取
某些 Filecoin 开发者工具可能提供 USDFC mint 功能。

**需要数量**: 至少 100 USDFC（用于测试上传）

**用途**: 支付 Filecoin 存储服务费用

---

## 🔍 检查余额

获取代币后，运行此命令检查余额：

```bash
node check-balances.js
```

预期输出：
```
✅ Sepolia ETH: 0.5+ ETH
✅ Calibration FIL: 5+ FIL
✅ USDFC: 100+ USDFC
```

---

## 🚀 准备就绪后

一旦所有测试代币到账，运行：

```bash
# 完整的 Filecoin 上传测试
node setup-and-upload-real.js

# 或运行完整的 MVP 演示
node demo.js
```

---

## 📞 获取帮助

### Filecoin 社区资源:
- **Slack**: https://filecoin.io/slack
- **Discord**: https://discord.gg/filecoin
- **Forum**: https://github.com/filecoin-project/community/discussions

### 询问内容:
- "需要 Calibration 测试网的 USDFC 代币用于开发测试"
- 提供你的钱包地址: `0xB34d4c8E3AcCB5FA62455228281649Be525D4e59`

---

## ⏱️ 预计时间

- **Sepolia ETH**: 即时 - 5分钟
- **Calibration FIL**: 即时 - 5分钟
- **USDFC**: 可能需要联系社区

---

## 🎉 完成后

所有代币到账后，你将能够：

1. ✅ 在 Sepolia 上注册 ERC-8004 AI Agent
2. ✅ 上传元数据到真实的 Filecoin Calibration 测试网
3. ✅ 在 https://pdp.vxb.ai/calibration 验证上传的数据
4. ✅ 完成完整的 NFT IPFS 到 Filecoin 迁移流程

🚀 **让我们开始吧！**
