# ⚡ 5 分钟快速开始

最快速度开始测试 Filecoin 上传！

## 🎯 前提条件

- ✅ 已有测试代币（Sepolia ETH, Calibration FIL, USDFC）
- ✅ Node.js >= 18
- ✅ 有钱包私钥

## 🚀 快速命令

### 1. 安装和配置 (30 秒)

```bash
# 安装依赖
npm install

# 配置私钥
echo "PRIVATE_KEY=0x你的私钥" > .env
```

### 2. 设置授权 (2-3 分钟)

```bash
# 一键设置所有授权
node setup-via-sdk.js

# 预期输出：
# ✅ 存款成功
# ✅ 服务授权成功
# 🎉 完成！
```

### 3. 验证设置 (10 秒)

```bash
# 运行前置检查
node pre-upload-check.js

# 应该全部 ✅：
# ✅ 私钥配置正确
# ✅ Synapse 初始化成功
# ✅ FIL 余额充足
# ✅ Payments 合约余额充足
# ✅ 服务授权已设置
```

### 4. 测试上传 (8-15 分钟)

```bash
# 运行上传测试
node test-real-upload-small.js

# 预期流程：
# 📦 初始化... ✅
# 💰 检查余额... ✅
# 🌐 创建 Data Set... ✅
# 🔍 Preflight Check... ✅
# 📤 上传到 Filecoin... ✅
# 🎉 成功！
```

## 🎉 完成！

如果看到 PieceCID，恭喜！你已经成功将数据上传到 Filecoin！

## ⚠️  可能遇到的问题

### 问题 1: "错误码 33"

```bash
# 解决：重新运行授权
node setup-via-sdk.js
```

### 问题 2: "SP 超时"

这不是你的问题！测试网 SP 有时很慢。

所有其他步骤成功 = 你的代码是对的 ✅

稍后重试即可。

## 📚 需要更多帮助？

- 详细指南: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- 当前状态: [CURRENT_STATUS.md](./CURRENT_STATUS.md)
- 项目说明: [README.md](./README.md)

---

**总时间**: 5-20 分钟（取决于网络和 SP 速度）
