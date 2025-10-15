# Filecoin Upload Issue - 详细分析

## 问题概述

**错误信息**: `Cannot read properties of undefined (reading 'createContext')`

**发生位置**: `filecoin-uploader.js:125` - `this.synapse.storage.createContext()`

**影响**: IPFS 下载成功(2/2)，但 Filecoin 上传失败(0/2)

---

## 根本原因分析

### 1. API 接口不匹配

**我们的代码 (filecoin-uploader.js:125):**
```javascript
const storageContext = await this.synapse.storage.createContext({
  withCDN: false,
  callbacks: {
    onProviderSelected,
    onDataSetResolved
  }
});
```

**实际的 Synapse SDK API (synapse.js:102):**
```javascript
// SDK 中没有 `storage` 属性！
// 正确的方法是:
async createStorage(options) {
  // 返回 MockStorageService
  return new MockStorageService(...);
}
```

### 2. SDK 结构分析

#### Synapse 类的实际结构:

```javascript
class Synapse {
  // 可用的属性/方法:
  _signer
  _network
  _withCDN
  _payments

  // 方法:
  get payments()           // ✅ 存在
  createStorage(options)   // ✅ 存在 (不是 storage.createContext)
  getPDPAuthHelper()       // ✅ 存在
}
```

**关键发现**: Synapse 类**没有** `storage` 属性！

#### 正确的调用方式:

```javascript
// ❌ 错误 (我们当前的代码):
this.synapse.storage.createContext()

// ✅ 正确:
const storageService = await this.synapse.createStorage({
  proofSetId: 'optional',
  storageProvider: 'f01234'  // Storage Provider ID
});
```

### 3. Synapse SDK 初始化问题

#### 我们的初始化代码 (filecoin-uploader.js:27-30):

```javascript
this.synapse = new Synapse({
  privateKey: this.privateKey,
  rpcUrl: this.rpcUrl
});
```

#### SDK 实际要求 (synapse.js:12-91):

```javascript
// SDK 不支持直接 new Synapse()
// 必须使用静态工厂方法:
const synapse = await Synapse.create({
  privateKey: '0x...',
  rpcURL: 'https://...',  // 注意: 是 rpcURL 不是 rpcUrl
  withCDN: false,
  disableNonceManager: false
});
```

**关键区别**:
1. 使用 `Synapse.create()` 而不是 `new Synapse()`
2. 参数是 `rpcURL` (大写) 而不是 `rpcUrl`
3. `create()` 是异步方法，返回 Promise

### 4. 网络限制

SDK 检查代码 (synapse.js:78-86):

```javascript
if (chainId === CHAIN_IDS.mainnet) {
  network = 'mainnet';
} else if (chainId === CHAIN_IDS.calibration) {
  network = 'calibration';
} else {
  throw new Error(`Unsupported network with chain ID ${chainId}.
    Synapse SDK only supports Filecoin mainnet (314159265359)
    and calibration (314159) networks.`);
}
```

**问题**: 我们使用 **Sepolia** (Chain ID: 11155111)，但 SDK 只支持:
- Filecoin Mainnet (Chain ID: 314159265359)
- Filecoin Calibration (Chain ID: 314159)

---

## 完整的错误链

```
1. 调用 uploadToFilecoin()
   ↓
2. 检查 this.synapse 存在
   ✅ 通过 (synapse 对象已初始化)
   ↓
3. 尝试访问 this.synapse.storage
   ❌ 失败: storage 属性不存在 (undefined)
   ↓
4. 尝试调用 undefined.createContext()
   ❌ 失败: "Cannot read properties of undefined (reading 'createContext')"
```

---

## 解决方案

### 方案 1: 修复 SDK 使用方式 (推荐用于生产)

```javascript
// filecoin-uploader.js

async initialize() {
  console.log('\n🚀 Initializing Synapse SDK...');

  try {
    // 1. 使用 Synapse.create() 而不是 new Synapse()
    this.synapse = await Synapse.create({
      privateKey: this.privateKey,
      rpcURL: this.rpcUrl,  // 注意大写
      withCDN: false
    });

    // 2. 创建 storage service
    this.storageService = await this.synapse.createStorage({
      proofSetId: 'mvp-demo-' + Date.now(),
      storageProvider: 'f01234'  // 需要真实的 SP
    });

    console.log('✅ Synapse SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Synapse SDK:', error.message);
    throw error;
  }
}

async uploadToFilecoin(data, metadata = {}) {
  console.log('\n📤 Uploading to Filecoin...');

  if (!this.storageService) {
    await this.initialize();
  }

  try {
    // 3. 使用 storageService 上传
    const uploadTask = await this.storageService.upload(data);

    // 4. 等待上传完成
    const result = await uploadTask.complete();

    return {
      success: true,
      pieceCid: result.pieceCid,
      carCid: result.carCid,
      metadata,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Filecoin upload failed:', error.message);
    throw error;
  }
}
```

**但是**，这个方案还有一个问题：需要切换到 **Filecoin Calibration 网络**！

### 方案 2: 模拟 Filecoin 存储 (推荐用于 MVP 演示)

由于 SDK 的网络限制，最简单的 MVP 解决方案是**模拟** Filecoin 上传：

```javascript
async uploadToFilecoin(data, metadata = {}) {
  console.log('\n📤 Uploading to Filecoin (Simulated for MVP)...');

  try {
    // 模拟上传过程
    console.log('   📦 Preparing data for Filecoin storage...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成模拟的 CID
    const pieceCid = 'baga6ea4seaq' + Math.random().toString(36).substring(2, 15);
    const carCid = 'bafy2bzace' + Math.random().toString(36).substring(2, 15);

    console.log('   ✅ Upload simulated successfully');
    console.log(`   📍 Mock Piece CID: ${pieceCid}`);
    console.log(`   📍 Mock CAR CID: ${carCid}`);
    console.log('   ℹ️  Note: In production, this would store on Filecoin network');

    const result = {
      success: true,
      pieceCid,
      carCid,
      provider: 'mock-provider-f01234',
      metadata: {
        ...metadata,
        simulatedUpload: true,
        originalSize: data.length
      },
      timestamp: Date.now()
    };

    this.uploadResults.push(result);
    return result;
  } catch (error) {
    console.error('❌ Simulated upload failed:', error.message);
    throw error;
  }
}
```

### 方案 3: 使用 Lighthouse SDK (替代方案)

Lighthouse 是另一个 Filecoin 存储服务，API 更简单：

```bash
npm install @lighthouse-web3/sdk
```

```javascript
import lighthouse from '@lighthouse-web3/sdk';

async uploadToFilecoin(filePath, metadata = {}) {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;

  const uploadResponse = await lighthouse.upload(
    filePath,
    apiKey
  );

  return {
    success: true,
    cid: uploadResponse.data.Hash,
    url: `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`,
    metadata
  };
}
```

---

## 网络配置问题

### 当前配置 (不兼容):

```env
# 我们使用 Sepolia 用于 ERC-8004
VALIDATION_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
VALIDATION_NETWORK_CHAIN_ID=11155111
```

### Synapse SDK 要求:

```env
# 需要 Filecoin Calibration 网络
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
FILECOIN_CHAIN_ID=314159

# 或者 Filecoin Mainnet
FILECOIN_RPC_URL=https://api.node.glif.io/rpc/v1
FILECOIN_CHAIN_ID=314159265359
```

### 架构建议:

实际上我们需要 **三个网络**：

1. **Ethereum Mainnet** - 读取 NFT (只读，无成本)
2. **Ethereum Sepolia** - ERC-8004 验证 (测试网交易)
3. **Filecoin Calibration** - Filecoin 存储 (Synapse SDK 要求)

更新后的配置:

```env
# NFT 读取
NFT_NETWORK_RPC_URL=https://eth-mainnet.public.blastapi.io
NFT_NETWORK_CHAIN_ID=1

# ERC-8004 验证
VALIDATION_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
VALIDATION_NETWORK_CHAIN_ID=11155111

# Filecoin 存储
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
FILECOIN_NETWORK_CHAIN_ID=314159
```

---

## MVP 演示建议

考虑到以上复杂性，对于 MVP 演示，我**强烈推荐**使用**方案 2: 模拟上传**：

### 优点:
1. ✅ 立即可用，无需额外配置
2. ✅ 演示完整流程（IPFS → Filecoin 概念）
3. ✅ 避免网络兼容性问题
4. ✅ 不需要真实的 Filecoin 测试币
5. ✅ 可以在文档中清楚说明这是模拟
6. ✅ 生成的 CID 格式正确（教育目的）

### 实现步骤:
1. 保留 IPFS 下载（已经工作）
2. 替换 Filecoin 上传为模拟实现
3. 在日志中明确标注 "Simulated"
4. 在最终报告中说明实际生产环境需要的配置

### 用户价值:
- **演示价值**: 用户看到完整的 7 个阶段流程
- **教育价值**: 清楚展示 IPFS vs Filecoin 的区别
- **ERC-8004 集成**: 核心功能（Agent + Validation）完全工作
- **可复现性**: 用户无需配置 Filecoin 网络即可运行

---

## 总结

**根本原因**:
1. SDK API 使用错误 (`storage.createContext()` vs `createStorage()`)
2. SDK 初始化方法错误 (`new Synapse()` vs `Synapse.create()`)
3. 网络不兼容 (Sepolia vs Filecoin Calibration)

**推荐解决方案**:
- **短期 (MVP)**: 使用模拟上传（方案 2）
- **长期 (生产)**: 修复 SDK 使用 + 添加 Filecoin Calibration 网络（方案 1）

**实施优先级**:
1. ⚡ **立即**: 实现模拟上传，完成 MVP 演示 (30 分钟)
2. 📝 **文档**: 更新说明，解释模拟的原因和生产配置
3. 🔧 **未来**: 如需真实上传，按方案 1 或 3 实现

---

**文件**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/FILECOIN_UPLOAD_ISSUE.md`
**创建时间**: 2025-10-15 14:25 UTC
