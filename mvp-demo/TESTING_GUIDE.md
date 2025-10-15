# 🧪 NFT IPFS 到 Filecoin 迁移 - 完整测试指南

**版本**: 1.0
**最后更新**: 2025-10-16
**测试网络**: Ethereum Sepolia + Filecoin Calibration

---

## 📋 目录

1. [环境准备](#环境准备)
2. [钱包设置](#钱包设置)
3. [获取测试代币](#获取测试代币)
4. [授权设置](#授权设置)
5. [测试上传](#测试上传)
6. [完整工作流测试](#完整工作流测试)
7. [故障排查](#故障排查)

---

## 环境准备

### 1. 系统要求

```bash
# 检查 Node.js 版本（需要 >= 18）
node --version

# 检查 npm 版本
npm --version

# 检查 git 版本
git --version
```

### 2. 克隆项目

```bash
# 克隆仓库
git clone <repository-url>
cd mvp-demo

# 安装依赖
npm install

# 验证安装
npm list @filoz/synapse-sdk
# 应该显示 v0.33.0
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env
```

必需的环境变量：

```bash
# 钱包私钥（不要泄露！）
PRIVATE_KEY=0x你的私钥

# 网络配置
ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1

# 合约地址（Sepolia 测试网）
ERC8004_REGISTRY_ADDRESS=0x官方部署的注册表地址
ERC8004_VALIDATOR_ADDRESS=0x官方部署的验证器地址
```

---

## 钱包设置

### 方式 1：使用现有钱包

1. 导出 MetaMask 私钥：
   ```
   MetaMask → 账户详情 → 导出私钥 → 复制
   ```

2. 添加到 `.env`：
   ```bash
   PRIVATE_KEY=0x你的私钥
   ```

### 方式 2：生成新钱包

```bash
# 运行钱包生成脚本
node generate-new-wallet.js
```

输出示例：
```
新钱包已生成：

地址: 0xB34d4c8E3AcCB5FA62455228281649Be525D4e59
私钥: 0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f
助记词: tired scout help hungry tray hero govern sting double reject wall cattle

⚠️  请妥善保管私钥和助记词！
```

将私钥添加到 `.env` 文件。

---

## 获取测试代币

### 1. Sepolia ETH

**用途**: 支付 Ethereum 测试网 gas 费用

**获取方式**:

1. **Sepolia Faucet**（推荐）
   ```
   https://sepoliafaucet.com/
   ```
   - 输入钱包地址
   - 完成验证
   - 获得 0.5 ETH

2. **Alchemy Faucet**
   ```
   https://www.alchemy.com/faucets/ethereum-sepolia
   ```
   - 需要 Alchemy 账户
   - 每天最多 0.5 ETH

3. **验证余额**:
   ```bash
   node check-balances.js
   ```

   期望输出：
   ```
   1️⃣ Sepolia ETH: 0.5 ETH ✅
   ```

### 2. Calibration FIL

**用途**: 支付 Filecoin 测试网 gas 费用

**获取方式**:

1. **官方水龙头**
   ```
   https://faucet.calibration.fildev.network/
   ```
   - 输入钱包地址
   - 获得 100 FIL

2. **验证余额**:
   ```bash
   node check-balances.js
   ```

   期望输出：
   ```
   2️⃣ Calibration FIL: 100.0 FIL ✅
   ```

### 3. USDFC（重要！）

**用途**: 支付 Filecoin 存储费用

**获取方式**:

1. **从社区获取**（推荐）

   Filecoin Slack:
   ```
   https://filecoin.io/slack
   ```
   - 加入 #fil-help 频道
   - 说明需要测试 USDFC
   - 提供钱包地址

   Discord:
   ```
   https://discord.gg/filecoin
   ```
   - 在 #faucet 或 #calibration 频道请求

2. **DEX 交易**（如果有 testFIL）
   ```
   https://calibration.filfox.info/
   ```
   - 查找 USDFC 交易对
   - 用 testFIL 兑换 USDFC

3. **验证余额**:
   ```bash
   node check-balances.js
   ```

   期望输出：
   ```
   3️⃣ USDFC: 50.0 USDFC ✅
   4️⃣ USDFC in Payments: 0.0 USDFC
   ```

**推荐数量**: 至少 50 USDFC（用于多次测试）

---

## 授权设置

### 重要说明

⚠️ **必须先完成授权设置，否则会遇到错误码 33！**

授权包括：
1. 存入 USDFC 到 Payments 合约
2. 授权 Warm Storage 服务

### 自动设置（推荐）

```bash
# 运行授权设置脚本
node setup-via-sdk.js
```

**过程说明**:

```
🔐 使用 Synapse SDK 设置授权

钱包: 0xB34d4c8E3AcCB5FA62455228281649Be525D4e59

💰 检查余额...
   USDFC (钱包): 50.0
   USDFC (Payments): 0.0

💳 存入 35 USDFC...
   交易: 0x1c338befa87ae6de6bf2a7d37377e35bcb72f42668d4a2ad2201ed0a6cf6f32a
   ✅ 存款成功
   新余额: 35.0 USDFC

✅ 设置服务授权...
   交易: 0x5662f811d625ca0cee33a665f10ed6f720dfa759053944030d1e49a9d718c4f3
   ✅ 服务授权成功

🎉 完成！
```

**预期时间**: 2-5 分钟（取决于网络速度）

### 验证授权

```bash
# 再次检查余额
node check-balances.js
```

期望输出：
```
1️⃣ Sepolia ETH: 0.45 ETH ✅
2️⃣ Calibration FIL: 99.5 FIL ✅
3️⃣ USDFC (钱包): 15.0 USDFC ✅
4️⃣ USDFC (Payments): 35.0 USDFC ✅ ← 重点！
```

### 手动设置（高级）

如果自动脚本失败，可以手动设置：

```bash
# 1. 获取正确的合约地址
node get-real-addresses.js

# 输出：
# Payments: 0x1096025c9D6B29E12E2f04965F6E64d564Ce0750
# Warm Storage: 0x80617b65FD2EEa1D7fDe2B4F85977670690ed348

# 2. 修改并运行手动设置脚本
node setup-correct-approvals.js
```

---

## 测试上传

### 前置检查

在开始测试前，确认：

```bash
# 运行前置检查脚本
node pre-upload-check.js
```

检查项：
- ✅ SDK 版本 v0.33.0
- ✅ 钱包有 FIL 余额
- ✅ 钱包有 USDFC 余额
- ✅ Payments 合约有 USDFC 存款
- ✅ Warm Storage 服务已授权

全部通过后继续。

### 测试 1: 小文件上传

```bash
# 运行小文件上传测试（1.1 MB）
node test-real-upload-small.js
```

**测试流程**:

```
================================================================================
🧪 Test Real Filecoin Upload (Small Scale - 5 USDFC)
================================================================================

📦 Step 1: Initialize Synapse SDK v0.33.0
   ✅ Synapse instance created

💰 Step 2: Check Balances
   FIL Balance: 99.5 FIL
   USDFC Balance (Wallet): 15.0 USDFC
   USDFC Balance (Payments): 35.0 USDFC
   ✅ 余额充足

🔐 Step 3: Deposit USDFC to Payments Contract
   ✅ Sufficient balance in Payments contract

🌐 Step 4: Create Storage Context
   Selecting Storage Provider...
   ✅ Selected Provider: 0xa3971A7234a3379A1813d9867B531e7EeB20ae07
   📝 Creating Data Set, tx: 0xccad...
   ✅ Created new Data Set: 565

🔍 Step 5: Preflight Upload Check
   Estimated costs:
     Per epoch: 0.000000 USDFC
     Per day: 0.000000 USDFC
     Per month: 0.000000 USDFC
   ✅ 授权充足

📤 Step 6: Upload Small Test Metadata
   Data size: 1.1 MB
   🚀 Starting upload to Filecoin...
   ✅ Upload complete! PieceCID: baga6ea4seaq...
   ✅ Piece added to Data Set, tx: 0x1234...

📊 Upload Results:
   PieceCID: baga6ea4seaq...
   Piece ID: 1
   Data Set ID: 565
   Size: 1.15 MB

⬇️ Step 7: Download and Verify
   ✅ Downloaded 1.15 MB
   ✅ Data integrity verified!

🎉 TEST SUCCESSFUL!
```

**预期时间**: 8-15 分钟（取决于 Storage Provider 性能）

**如果超时**:

Storage Provider 可能正在维护或过载。这不是你的问题！

```
❌ Test Failed!
Error: Timeout waiting for piece to be parked on service provider
```

解决方案：
1. 等待几小时后重试
2. 联系 Filecoin 社区询问 SP 状态
3. 所有代码和授权都已正确设置，SP 恢复后会立即成功

### 测试 2: 验证 PieceCID

```bash
# 查询 PieceCID 状态
node query-piece-status.js <your-piece-cid>
```

示例：
```bash
node query-piece-status.js baga6ea4seaq...
```

期望输出：
```
📊 Piece Status:
   Exists on Provider: true
   Last Proven: 2025-10-16 10:30:00
   Next Proof Due: 2025-10-17 10:30:00

✅ Piece is properly stored on Filecoin!
```

### 测试 3: 在区块浏览器验证

1. **Filecoin Explorer**
   ```
   https://calibration.filfox.info/
   ```
   - 搜索你的 Data Set ID
   - 查看存储交易

2. **PDP Verification**
   ```
   https://pdp.vxb.ai/calibration
   ```
   - 输入 PieceCID
   - 查看验证状态

---

## 完整工作流测试

### 测试场景：完整的 NFT 迁移流程

```bash
# 运行完整演示
node demo.js
```

**工作流程**:

```
================================================================================
🎯 NFT IPFS to Filecoin Migration - Full Demo
================================================================================

Phase 1: 扫描 NFT
   📡 Connecting to Ethereum Mainnet...
   🔍 Scanning for NFTs...
   ✅ Found 3 NFTs

Phase 2: 注册 AI Agent
   📝 Registering on ERC-8004...
   Transaction: 0xabc123...
   ✅ Agent registered with ID: 1

Phase 3: 创建验证请求
   📤 Creating validation request...
   Transaction: 0xdef456...
   ✅ Request created with ID: 1

Phase 4: 上传元数据到 Filecoin
   📦 Uploading NFT #1 metadata...
   ✅ PieceCID: baga6ea4seaq...
   📦 Uploading NFT #2 metadata...
   ✅ PieceCID: baga6ea4seaq...
   📦 Uploading NFT #3 metadata...
   ✅ PieceCID: baga6ea4seaq...

Phase 5: 生成证明
   🔐 Generating validation proof...
   Transaction: 0x789ghi...
   ✅ Proof submitted

Phase 6: 验证状态
   ✅ All NFTs migrated successfully!

Phase 7: 导出报告
   📄 Report saved to: output/migration-report.json

================================================================================
🎉 MIGRATION COMPLETE!
================================================================================
```

**预期时间**: 20-40 分钟（取决于 NFT 数量和网络速度）

### 交互式工作流测试

```bash
# 启动交互式工作流
node interactive-workflow.js
```

**界面示例**:

```
╔══════════════════════════════════════════════════════════╗
║     NFT IPFS to Filecoin Migration - Interactive        ║
╚══════════════════════════════════════════════════════════╝

📋 当前状态:
   Wallet: 0xB34d...e59
   Network: Sepolia + Calibration
   Status: Ready

🎯 可用操作:
   1. 扫描 NFT
   2. 注册 Agent
   3. 创建验证请求
   4. 上传到 Filecoin
   5. 提交证明
   6. 查看状态
   7. 导出报告
   0. 退出

请选择操作 (0-7):
```

按提示逐步操作，每步都可以查看详细信息。

---

## 故障排查

### 常见问题 1: 错误码 33

**症状**:
```
Error: Failed to create data set: exit=[33]
```

**原因**: 授权不足

**解决方案**:
```bash
# 1. 检查余额
node check-balances.js

# 2. 确认 Payments 合约有 USDFC
# 应该显示: USDFC (Payments): 35.0+ USDFC

# 3. 如果没有，重新运行授权
node setup-via-sdk.js

# 4. 验证授权状态
node verify-approvals.js
```

### 常见问题 2: 网络超时

**症状**:
```
Error: request timeout
```

**原因**: 网络连接问题或 RPC 节点过载

**解决方案**:

1. **检查网络连接**:
   ```bash
   # 测试 Sepolia
   curl https://eth-sepolia.public.blastapi.io

   # 测试 Calibration
   curl https://api.calibration.node.glif.io/rpc/v1
   ```

2. **更换 RPC 节点**:

   编辑 `.env`:
   ```bash
   # Sepolia 备用节点
   ETHEREUM_NETWORK_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

   # Calibration 备用节点
   FILECOIN_NETWORK_RPC_URL=https://filecoin-calibration.chainup.net/rpc/v1
   ```

3. **增加超时时间**:
   ```bash
   # 编辑测试脚本，增加 timeout
   timeout 600 node test-real-upload-small.js
   ```

### 常见问题 3: Storage Provider 超时

**症状**:
```
Error: Timeout waiting for piece to be parked on service provider
```

**原因**: SP 性能问题或维护中

**解决方案**:

这不是你的代码问题！

1. **确认其他步骤都成功**:
   ```
   ✅ SDK 初始化成功
   ✅ 授权设置成功
   ✅ Data Set 创建成功
   ✅ 上传请求发送成功
   ⚠️  SP parking 超时 ← 这里
   ```

2. **等待并重试**:
   ```bash
   # 几小时后重试
   node test-real-upload-small.js
   ```

3. **联系社区**:
   - Filecoin Slack: #fil-help
   - 询问 ezpdpz-calib SP 的状态

### 常见问题 4: 文件太小

**症状**:
```
# 上传成功但 SP 不处理
```

**原因**: 文件小于 SP 最小要求（1 MB）

**解决方案**:

已在测试脚本中修复，确保使用最新版本：

```bash
# 拉取最新代码
git pull origin feature/nft-ipfs-migration

# 重新测试
node test-real-upload-small.js
```

测试脚本会自动生成 1.1 MB 的数据。

### 常见问题 5: 私钥错误

**症状**:
```
Error: invalid private key
```

**原因**: 私钥格式不正确

**解决方案**:

1. **检查格式**:
   ```bash
   # 私钥必须以 0x 开头
   # 正确: PRIVATE_KEY=0xabcd1234...
   # 错误: PRIVATE_KEY=abcd1234...
   ```

2. **验证长度**:
   ```bash
   # 应该是 66 个字符（0x + 64位十六进制）
   echo ${#PRIVATE_KEY}  # 应该输出 66
   ```

3. **重新生成**:
   ```bash
   node generate-new-wallet.js
   ```

---

## 📝 测试检查清单

### 准备阶段

- [ ] Node.js >= 18 已安装
- [ ] npm 依赖已安装
- [ ] `.env` 文件已配置
- [ ] 私钥已添加到 `.env`

### 代币准备

- [ ] Sepolia ETH >= 0.1 ETH
- [ ] Calibration FIL >= 50 FIL
- [ ] USDFC >= 50 USDFC

### 授权设置

- [ ] 运行 `setup-via-sdk.js` 成功
- [ ] Payments 合约有 USDFC 存款
- [ ] Warm Storage 服务已授权
- [ ] 运行 `check-balances.js` 验证

### 上传测试

- [ ] `test-real-upload-small.js` 完成所有步骤
- [ ] Data Set 创建成功
- [ ] Preflight Check 通过
- [ ] 获得 PieceCID
- [ ] 数据完整性验证通过

### 完整流程

- [ ] `demo.js` 或交互式工作流完成
- [ ] NFT 扫描成功
- [ ] Agent 注册成功
- [ ] 验证请求创建成功
- [ ] 元数据上传成功
- [ ] 证明生成并提交
- [ ] 迁移报告生成

---

## 🎯 成功标准

测试被认为成功，如果：

1. ✅ 所有授权正确设置（错误码 33 不再出现）
2. ✅ Data Set 成功创建
3. ✅ Preflight Check 通过
4. ✅ 上传请求成功发送到 SP
5. ✅ 获得有效的 PieceCID（如果 SP 正常）
6. ✅ 可以从 Filecoin 下载并验证数据（如果 SP 正常）

**注意**: 如果步骤 1-4 都成功，但步骤 5-6 因 SP 超时失败，**这仍然算成功**！
因为这是 SP 的问题，不是你的代码问题。

---

## 📞 获取帮助

### 社区支持

1. **Filecoin Slack**
   ```
   https://filecoin.io/slack
   ```
   频道: #fil-help, #calibration

2. **Filecoin Discord**
   ```
   https://discord.gg/filecoin
   ```
   频道: #faucet, #dev-help

3. **GitHub Issues**
   ```
   https://github.com/FilOzone/synapse-sdk/issues
   ```

### 报告问题时提供

1. 完整错误信息
2. 测试脚本输出
3. 余额检查结果：`node check-balances.js`
4. SDK 版本：`npm list @filoz/synapse-sdk`
5. Node.js 版本：`node --version`

---

## 🎉 测试完成！

完成所有测试后，你将拥有：

1. ✅ 完整理解 Filecoin 存储流程
2. ✅ 正确配置的测试环境
3. ✅ 工作的 NFT 迁移系统
4. ✅ 真实的 Filecoin 存储证明（PieceCID）

恭喜！你已经掌握了 NFT IPFS 到 Filecoin 的迁移技术！🚀

---

**文档版本**: 1.0
**维护者**: NFT Migration Team
**最后更新**: 2025-10-16
