# 🔑 测试钱包信息

**⚠️ 警告：这是测试钱包，仅用于测试网，切勿在主网使用或存入真实资金！**

## 钱包详情

生成时间：2025-10-15

```
Address:     0x1D621356Bc9484F5e5858a00103338579Cba9613
Private Key: 0x2ef99a70ceaef2a6a24899b503f95a3e3d2e3887d278643d78a443836cc1fde9
```

## 获取测试币

### 1. Ethereum Sepolia ETH

#### 方式 1: Alchemy Faucet (推荐)
```bash
# 访问：https://sepoliafaucet.com/
# 输入地址：0x1D621356Bc9484F5e5858a00103338579Cba9613
# 每天可获取 0.5 ETH
```

#### 方式 2: Chainlink Faucet
```bash
# 访问：https://faucets.chain.link/sepolia
# 需要 GitHub 账号
# 输入地址：0x1D621356Bc9484F5e5858a00103338579Cba9613
```

#### 方式 3: QuickNode Faucet
```bash
# 访问：https://faucet.quicknode.com/ethereum/sepolia
# 输入地址：0x1D621356Bc9484F5e5858a00103338579Cba9613
```

#### 方式 4: POW Faucet (无需账号)
```bash
# 访问：https://sepolia-faucet.pk910.de/
# 通过挖矿获取（需要时间）
# 地址：0x1D621356Bc9484F5e5858a00103338579Cba9613
```

#### 检查 Sepolia 余额
```bash
cast balance 0x1D621356Bc9484F5e5858a00103338579Cba9613 --rpc-url https://rpc.sepolia.org
```

### 2. Filecoin Calibration Test FIL

#### 官方水龙头
```bash
# 访问：https://faucet.calibration.fildev.network/
# 输入地址：0x1D621356Bc9484F5e5858a00103338579Cba9613
# 每次可获取 50 FIL
```

#### 检查 Calibration 余额
```bash
cast balance 0x1D621356Bc9484F5e5858a00103338579Cba9613 \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1
```

## 配置 .env

```bash
cd mvp-demo
cp .env.example .env
```

编辑 `.env`，填入私钥：
```env
PRIVATE_KEY=0x2ef99a70ceaef2a6a24899b503f95a3e3d2e3887d278643d78a443836cc1fde9
```

其他配置保持默认（已预填 Sepolia 配置）。

## 验证配置

```bash
# 测试配置
npm test

# 运行 Demo
npm run demo
```

## 其他测试网（可选）

这个钱包也可以用于其他测试网（ERC-8004 合约已部署）：

### Base Sepolia
```bash
# 水龙头：https://docs.base.org/tools/network-faucets
# 地址：0x1D621356Bc9484F5e5858a00103338579Cba9613

# 检查余额
cast balance 0x1D621356Bc9484F5e5858a00103338579Cba9613 \
  --rpc-url https://sepolia.base.org
```

### Optimism Sepolia
```bash
# 水龙头：https://app.optimism.io/faucet
# 地址：0x1D621356Bc9484F5e5858a00103338579Cba9613

# 检查余额
cast balance 0x1D621356Bc9484F5e5858a00103338579Cba9613 \
  --rpc-url https://sepolia.optimism.io
```

## 安全提示

✅ **可以做**：
- 在测试网上使用
- 分享给其他测试用户
- 用于开发和测试

❌ **不要做**：
- 在主网使用此私钥
- 存入真实资金
- 用于生产环境

---

**生成方法**：
```bash
cast wallet new
```

**工具**：Foundry Cast v1.4.1-stable
