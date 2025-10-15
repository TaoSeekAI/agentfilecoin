# 🚀 Filecoin 真实上传配置指南

## ✅ 发现：真正的 Filecoin 上传实现

经过深入调查，我们发现：

1. **npm 上的 `@filoz/synapse-sdk@0.1.0` 是 Mock 实现** - 不能真正上传到 Filecoin
2. **GitHub 上的最新版本 v0.33.0 包含真实实现** - 已发布到 npm
3. **我们已经成功升级到 v0.33.0** ✅

## 📊 测试结果

### ✅ 成功部分：
- Synapse SDK v0.33.0 成功初始化
- 连接到 Filecoin Calibration 测试网
- 选择了真实的 Storage Provider: `0x682467D59F5679cB0BF13115d4C94550b8218CF2`
- 钱包有 5 FIL 余额

### ❌ 失败部分：
- 创建 Data Set 失败，错误码 33
- **原因：缺少 USDFC 代币余额！**

```
USDFC balance: 0.0000 USDFC
```

## 💡 问题根源

Filecoin 的 Synapse 系统使用 **USDFC（USD Filecoin Coin）** 作为支付代币来支付存储费用，而不是直接使用 FIL。

需要：
1. 获取 USDFC 测试代币
2. 将 USDFC 存入 Payments 合约
3. 授权 Warm Storage 服务使用 USDFC

## 🔧 解决方案

### 选项 1：获取 USDFC 测试代币（推荐）

你需要：

1. **获取 USDFC 代币**：
   - USDFC 合约地址（Calibration）: `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0`
   - 可能需要通过 Filecoin 社区或测试网水龙头获取

2. **存入 USDFC 到 Payments 合约**：
   ```javascript
   // 存入 10 USDFC
   const depositAmount = 10n * 10n**18n  // 10 USDFC in smallest unit
   await synapse.payments.deposit(depositAmount, 'USDFC')
   ```

3. **授权 Warm Storage 服务**：
   ```javascript
   const warmStorageAddress = synapse.getWarmStorageAddress()
   await synapse.payments.approveService(
     warmStorageAddress,
     ethers.parseUnits('10', 18),    // 10 USDFC per epoch rate allowance
     ethers.parseUnits('1000', 18),  // 1000 USDFC lockup allowance
     30                               // 30 epochs max lockup period
   )
   ```

### 选项 2：使用现有的 CommP 计算（临时方案）

如果只是为了 MVP 演示，我们可以：

1. **仅计算 CommP（Piece CID）**
   - 不需要 USDFC
   - 生成真实的 Filecoin Piece CID
   - 可以用于链上存储 URI

2. **URI 格式**：
   ```
   ipfs://{pieceCID}
   ```

3. **优点**：
   - 不需要支付
   - CommP 是真实的 Filecoin Piece CID
   - 可以展示完整流程

4. **缺点**：
   - 数据不会真正存储在 Filecoin 上
   - 无法通过 `https://pdp.vxb.ai/calibration` 验证

## 📝 当前实现状态

### ✅ 已完成：
1. 升级到 Synapse SDK v0.33.0（真实实现）
2. 创建 `FilecoinUploaderV033` 类
3. 实现真实的上传 API：
   - `synapse.storage.createContext()` - 创建存储上下文
   - `storageContext.upload()` - 上传到 Filecoin
   - `synapse.storage.download()` - 从 Filecoin 下载
4. 测试发现需要 USDFC 代币

### ⏳ 待完成：
1. 获取 USDFC 测试代币
2. 配置 Payments 合约
3. 完成真实上传测试
4. 在 `https://pdp.vxb.ai/calibration` 上验证

## 🎯 下一步

**请选择一个选项：**

### A. 完整的真实 Filecoin 上传
需要你提供或获取 USDFC 代币：
- 找到 USDFC 测试网水龙头
- 或者从 Filecoin 社区获取测试代币

### B. 仅使用 CommP 计算（临时方案）
我们可以：
1. 计算真实的 CommP（Piece CID）
2. 在合约中存储 `ipfs://{commP}`
3. 数据临时存储在本地
4. 等获取 USDFC 后再完成真实上传

### C. 混合方案
1. 现在使用 CommP 计算完成 MVP
2. 并行寻找 USDFC 代币来源
3. 找到后升级到真实上传

## 📚 参考资源

- Synapse SDK v0.33.0: https://github.com/FilOzone/synapse-sdk
- Example Storage E2E: `utils/example-storage-e2e.js`
- PDP Verification: https://pdp.vxb.ai/calibration
- USDFC Contract (Calibration): `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0`

## 💬 你的选择？

请告诉我你想选择哪个方案，我会相应地更新代码！
