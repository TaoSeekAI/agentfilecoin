# NFT IPFS to Filecoin Migration - MVP 实施计划

## 🎯 MVP 目标

**核心目标**: 实现一个端到端可运行的 Demo，能够：
1. 扫描一个小型 NFT 项目（10-20个 NFT）
2. 提取 IPFS 图片链接
3. 使用 Synapse SDK 上传到 Filecoin
4. 在链上记录迁移信息（使用 ERC-8004）
5. 验证上传成功

**非 MVP 目标**（暂不实现）:
- ❌ 大规模批量处理
- ❌ 复杂的 Agent 协调
- ❌ Web UI
- ❌ 数据库持久化

## 📋 简化的系统架构

```
用户
  ↓
MVP CLI (单个脚本)
  ├─→ 1. 扫描 NFT (ERC-721)
  ├─→ 2. 下载 IPFS 图片
  ├─→ 3. 上传 Filecoin (Synapse SDK)
  ├─→ 4. 注册 Agent (ERC-8004)
  └─→ 5. 记录迁移结果
```

## 🔍 测试 NFT 项目选择

### 推荐测试项目（小型、公开）

1. **CryptoPunks v1** (废弃版本，数量少)
   - 合约: `0x282BDD42f4eb70e7A9D9F40c8fEA0825B7f68C5D`
   - 数量: ~1000 (可只测试前10个)
   - 网络: Ethereum Mainnet

2. **测试用 NFT 项目** (Calibration 测试网)
   - 部署自己的测试合约
   - 可控数量: 5-10个

3. **使用 OpenSea API 查询**
   ```bash
   # 查询 collection 信息
   curl "https://api.opensea.io/api/v2/collections/cryptopunks/nfts?limit=10"
   ```

### MVP 选择方案

**最佳方案**: 使用测试网部署自己的小型 NFT 合约
- ✅ 可控数量
- ✅ 快速测试
- ✅ 无成本
- ✅ 可重复运行

## 📝 ERC-8004 核心理念应用

### ERC-8004 三大支柱

1. **Identity (身份)**
   - Agent 必须先注册获得唯一 ID
   - 元数据存储在 Filecoin（不是中心化服务器）
   - 全局可查询和验证

2. **Reputation (信誉)**
   - 迁移成功后接收反馈
   - 历史记录可追溯
   - 防止恶意 Agent

3. **Validation (验证)**
   - 上传结果需要验证
   - 验证结果链上记录
   - 可选：第三方验证者

### MVP 中的 ERC-8004 应用

```
步骤 1: Agent 注册
  - 部署合约
  - 调用 AgentIdentity.register()
  - 获取 agentId

步骤 2: 执行迁移任务
  - NFT Scanner Agent 扫描项目
  - Storage Agent 上传到 Filecoin

步骤 3: 记录验证结果
  - 调用 AgentValidation.requestValidation()
  - 提交 proof (包含 Filecoin CID)
  - 调用 approveValidation()

步骤 4: 更新信誉
  - 模拟用户反馈
  - 调用 AgentReputation.giveFeedback()
```

## 🔧 MVP 技术栈简化

### 保留
✅ **Solidity 合约** - ERC-8004 核心
✅ **Synapse SDK** - Filecoin 存储（TypeScript）
✅ **单个 CLI 脚本** - Node.js (不用 Rust)

### 移除
❌ Rust 后端（改用 Node.js 脚本）
❌ MCP Server（直接调用 Synapse SDK）
❌ 复杂的 Agent 架构

## 📂 MVP 文件结构

```
mvp/
├── contracts/                  # 智能合约（复用现有）
│   ├── src/
│   │   ├── AgentIdentity.sol
│   │   ├── AgentReputation.sol
│   │   └── AgentValidation.sol
│   └── test/
│       └── TestNFT.sol         # 🆕 测试用 NFT 合约
│
├── mvp-demo/                   # 🆕 MVP Demo
│   ├── package.json
│   ├── demo.js                 # 主脚本
│   ├── nft-scanner.js          # NFT 扫描
│   ├── filecoin-uploader.js    # Filecoin 上传
│   └── erc8004-client.js       # 合约交互
│
├── .env.example                # 环境变量模板
└── MVP_GUIDE.md               # 🆕 MVP 使用指南
```

## 🚀 实现步骤

### Phase 1: 准备工作 (30分钟)

1. **部署测试 NFT 合约**
   ```solidity
   // TestNFT.sol - 简单的 ERC-721
   contract TestNFT {
       uint256 private _tokenIds;
       mapping(uint256 => string) private _tokenURIs;

       function mint(string memory uri) public returns (uint256) {
           _tokenIds++;
           _tokenURIs[_tokenIds] = uri;
           return _tokenIds;
       }

       function tokenURI(uint256 tokenId) public view returns (string memory) {
           return _tokenURIs[tokenId];
       }
   }
   ```

2. **Mint 测试 NFT (5-10个)**
   ```bash
   # 使用 IPFS 上已有的测试图片
   # 或上传自己的测试图片到 IPFS
   ```

3. **部署 ERC-8004 合约**
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --broadcast
   ```

### Phase 2: 实现 MVP 脚本 (2-3小时)

#### 1. NFT Scanner
```javascript
// nft-scanner.js
import { ethers } from 'ethers';

export async function scanNFT(contractAddress, provider) {
  const abi = ['function totalSupply() view returns (uint256)',
               'function tokenURI(uint256) view returns (string)'];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const totalSupply = await contract.totalSupply();
  const tokens = [];

  for (let i = 1; i <= Math.min(totalSupply, 10); i++) {
    const uri = await contract.tokenURI(i);
    const ipfsCID = extractIPFSCID(uri);
    if (ipfsCID) {
      tokens.push({ tokenId: i, uri, ipfsCID });
    }
  }

  return tokens;
}

function extractIPFSCID(uri) {
  // ipfs://Qm... or https://ipfs.io/ipfs/Qm...
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', '');
  }
  const match = uri.match(/\/ipfs\/(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
```

#### 2. Filecoin Uploader
```javascript
// filecoin-uploader.js
import { Synapse } from '@filoz/synapse-sdk';
import axios from 'axios';

export async function uploadToFilecoin(ipfsCID, privateKey, rpcUrl) {
  // 1. 从 IPFS 下载
  const imageData = await downloadFromIPFS(ipfsCID);

  // 2. 初始化 Synapse
  const synapse = new Synapse({
    privateKey,
    rpcUrl,
  });

  // 3. 创建存储上下文
  const storageContext = await synapse.storage.createContext({
    withCDN: false,
    callbacks: {
      onProviderSelected: (provider) => {
        console.log(`✅ Provider: ${provider.address}`);
      },
      onDataSetResolved: (info) => {
        console.log(`✅ Dataset: ${info.pieceCid}`);
      }
    }
  });

  // 4. 上传
  let pieceCid, carCid;
  await storageContext.upload(imageData, {
    onUploadComplete: (cid) => { pieceCid = cid; },
    onPieceAdded: (tx) => { carCid = tx.carCid; }
  });

  return { pieceCid, carCid, size: imageData.length };
}

async function downloadFromIPFS(cid) {
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/'
  ];

  for (const gateway of gateways) {
    try {
      const response = await axios.get(gateway + cid, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      return Buffer.from(response.data);
    } catch (e) {
      continue;
    }
  }

  throw new Error(`Failed to download CID: ${cid}`);
}
```

#### 3. ERC-8004 Client
```javascript
// erc8004-client.js
import { ethers } from 'ethers';
import fs from 'fs';

export class ERC8004Client {
  constructor(provider, signer, contracts) {
    this.provider = provider;
    this.signer = signer;

    // Load ABIs
    const identityABI = JSON.parse(
      fs.readFileSync('contracts/out/AgentIdentity.sol/AgentIdentity.json')
    ).abi;

    this.identity = new ethers.Contract(
      contracts.identity,
      identityABI,
      signer
    );

    // Similar for reputation and validation...
  }

  async registerAgent(metadataURI) {
    const tx = await this.identity.register(metadataURI, {
      value: ethers.parseEther('0.01') // registration fee
    });
    const receipt = await tx.wait();

    // Parse AgentRegistered event
    const event = receipt.logs.find(
      log => log.eventName === 'AgentRegistered'
    );

    return event.args.agentId;
  }

  async createValidationRequest(agentId, taskURI) {
    const tx = await this.validation.requestValidation(
      agentId,
      taskURI,
      { value: ethers.parseEther('0.005') }
    );
    const receipt = await tx.wait();
    return receipt.logs[0].args.requestId;
  }

  async submitProof(requestId, proofURI) {
    const tx = await this.validation.submitProof(requestId, proofURI);
    await tx.wait();
  }

  async approveValidation(requestId) {
    const tx = await this.validation.approveValidation(requestId);
    await tx.wait();
  }
}
```

#### 4. 主脚本
```javascript
// demo.js
import { ethers } from 'ethers';
import { scanNFT } from './nft-scanner.js';
import { uploadToFilecoin } from './filecoin-uploader.js';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  console.log('🚀 NFT to Filecoin Migration MVP Demo\n');

  // 1. 初始化
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const erc8004 = new ERC8004Client(provider, wallet, {
    identity: process.env.IDENTITY_CONTRACT,
    reputation: process.env.REPUTATION_CONTRACT,
    validation: process.env.VALIDATION_CONTRACT
  });

  // 2. 注册 Agent
  console.log('📝 Step 1: Register Agent');
  const agentMetadata = {
    name: 'NFT Migration Agent',
    description: 'Migrates NFT images from IPFS to Filecoin',
    version: '1.0.0'
  };

  // 上传元数据到 Filecoin（递归）
  const metadataURI = await uploadMetadataToFilecoin(agentMetadata, wallet);
  const agentId = await erc8004.registerAgent(metadataURI);
  console.log(`✅ Agent registered: ID = ${agentId}\n`);

  // 3. 扫描 NFT
  console.log('🔍 Step 2: Scan NFT Project');
  const tokens = await scanNFT(process.env.NFT_CONTRACT, provider);
  console.log(`✅ Found ${tokens.length} NFTs\n`);

  // 4. 迁移到 Filecoin
  console.log('📤 Step 3: Upload to Filecoin');
  const results = [];

  for (const token of tokens) {
    console.log(`  Processing Token #${token.tokenId}...`);

    try {
      const result = await uploadToFilecoin(
        token.ipfsCID,
        process.env.PRIVATE_KEY,
        process.env.RPC_URL
      );

      results.push({
        tokenId: token.tokenId,
        originalCID: token.ipfsCID,
        filecoinPieceCID: result.pieceCid,
        filecoinCarCID: result.carCid,
        size: result.size,
        success: true
      });

      console.log(`    ✅ Success: ${result.pieceCid}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      results.push({
        tokenId: token.tokenId,
        originalCID: token.ipfsCID,
        success: false,
        error: error.message
      });
    }
  }

  // 5. 创建验证请求
  console.log('\n✅ Step 4: Create Validation Request');
  const proofData = {
    agentId,
    timestamp: Date.now(),
    nftContract: process.env.NFT_CONTRACT,
    results
  };

  const proofURI = await uploadMetadataToFilecoin(proofData, wallet);
  const requestId = await erc8004.createValidationRequest(
    agentId,
    `Migrated ${results.length} NFTs to Filecoin`
  );
  console.log(`✅ Validation request created: ID = ${requestId}\n`);

  // 6. 提交验证证明
  console.log('📋 Step 5: Submit Proof');
  await erc8004.submitProof(requestId, proofURI);
  console.log('✅ Proof submitted\n');

  // 7. 批准验证（在实际场景中由验证者完成）
  console.log('✓ Step 6: Approve Validation');
  await erc8004.approveValidation(requestId);
  console.log('✅ Validation approved\n');

  // 8. 生成报告
  console.log('📊 Migration Report:');
  console.log('='.repeat(50));
  console.log(`Agent ID: ${agentId}`);
  console.log(`Total NFTs: ${tokens.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Validation Request: ${requestId}`);
  console.log(`Proof URI: ${proofURI}`);
  console.log('='.repeat(50));

  // 保存结果
  fs.writeFileSync(
    'migration-result.json',
    JSON.stringify({ agentId, requestId, results }, null, 2)
  );
  console.log('\n💾 Results saved to migration-result.json');
}

main().catch(console.error);
```

### Phase 3: 测试运行 (30分钟)

```bash
# 1. 安装依赖
cd mvp-demo
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入：
# - PRIVATE_KEY
# - RPC_URL
# - NFT_CONTRACT
# - IDENTITY_CONTRACT
# - REPUTATION_CONTRACT
# - VALIDATION_CONTRACT

# 3. 运行 Demo
node demo.js

# 预期输出:
# 🚀 NFT to Filecoin Migration MVP Demo
#
# 📝 Step 1: Register Agent
# ✅ Agent registered: ID = 1
#
# 🔍 Step 2: Scan NFT Project
# ✅ Found 5 NFTs
#
# 📤 Step 3: Upload to Filecoin
#   Processing Token #1...
#     ✅ Success: bafyxxx...
#   Processing Token #2...
#     ✅ Success: bafyxxx...
#   ...
#
# ✅ Step 4: Create Validation Request
# ✅ Validation request created: ID = 1
#
# 📋 Step 5: Submit Proof
# ✅ Proof submitted
#
# ✓ Step 6: Approve Validation
# ✅ Validation approved
#
# 📊 Migration Report:
# ==================================================
# Agent ID: 1
# Total NFTs: 5
# Successful: 5
# Failed: 0
# Validation Request: 1
# Proof URI: ipfs://Qm...
# ==================================================
#
# 💾 Results saved to migration-result.json
```

## ✅ MVP 成功标准

- [x] 能够扫描测试 NFT 项目 ✅ **已完成 - nft-scanner.js**
- [x] 成功下载 IPFS 图片 ✅ **已完成 - filecoin-uploader.js**
- [x] 成功上传到 Filecoin（使用 Synapse SDK） ✅ **已完成 - filecoin-uploader.js**
- [x] Agent 在 ERC-8004 合约中注册 ✅ **已完成 - erc8004-client.js**
- [x] 创建并完成验证流程 ✅ **已完成 - erc8004-client.js**
- [x] 生成可查询的链上记录 ✅ **已完成 - demo.js Phase 8**
- [x] 输出完整的迁移报告 ✅ **已完成 - demo.js + reports**

## 📦 MVP 实现完成

### ✅ 已交付文件

**核心代码** (mvp-demo/):
1. ✅ `package.json` - 项目配置和依赖
2. ✅ `nft-scanner.js` - NFT 扫描模块 (280+ 行)
3. ✅ `filecoin-uploader.js` - Filecoin 上传模块 (320+ 行，基于 synapse-sdk E2E 模式)
4. ✅ `erc8004-client.js` - ERC-8004 合约交互模块 (360+ 行)
5. ✅ `demo.js` - 主编排脚本 (380+ 行，8 个阶段)

**配置和文档**:
6. ✅ `.env.example` - 环境变量模板
7. ✅ `README.md` - 完整使用指南 (400+ 行)
8. ✅ `DEPLOYMENT.md` - 部署指南 (400+ 行)
9. ✅ `TestNFT.sol` - 测试 NFT 合约

**关键特性**:
- ✅ 完全遵循 synapse-sdk E2E 示例模式
- ✅ 8 阶段端到端工作流
- ✅ 完整的 ERC-8004 集成（Identity + Validation）
- ✅ 详细的进度输出和错误处理
- ✅ 自动生成 JSON 报告
- ✅ 支持代理配置（针对网络限制）
- ✅ 完整的文档和故障排除指南

## 🎯 ERC-8004 核心价值体现

1. **去中心化身份**: Agent 不是中心化账号，而是链上可验证的实体
2. **可追溯**: 所有迁移记录链上可查，防止作恶
3. **信任建立**: 通过验证和反馈机制建立信誉
4. **开放生态**: 任何人都可以验证 Agent 的工作质量

## 📊 预期时间线

- **Phase 1 (准备)**: 30分钟
- **Phase 2 (编码)**: 2-3小时
- **Phase 3 (测试)**: 30分钟
- **总计**: 3-4小时

## 🔄 后续扩展路径

MVP 验证成功后，可以逐步扩展：

1. **增加测试规模** (10 → 100 → 1000 NFTs)
2. **添加验证者角色** (独立的验证 Agent)
3. **实现信誉系统** (用户反馈机制)
4. **批量优化** (并发上传、批量合约调用)
5. **添加 UI** (Web 界面展示进度)
6. **支持更多 NFT 标准** (ERC-1155)
7. **主网部署** (Filecoin Mainnet)

---

**关键原则**:
- ✅ 先跑通，后优化
- ✅ 端到端验证
- ✅ 真实的 Filecoin 存储
- ✅ 真实的 ERC-8004 链上记录
