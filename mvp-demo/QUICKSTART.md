# 🚀 快速启动指南 - ETH Sepolia 测试网

**目标**: 5 分钟内完成 NFT IPFS 到 Filecoin 迁移演示

## ✅ 优势：无需部署合约！

- ✅ ERC-8004 合约已部署在 Sepolia
- ✅ 使用现成的 NFT 项目
- ✅ 只需配置钱包即可运行

---

## 📋 前置条件

### 1. 获取 Sepolia ETH

访问任一水龙头（建议多试几个）：

```bash
# 官方水龙头（需要 0.001 ETH 主网）
https://sepoliafaucet.com/

# Alchemy 水龙头（需要账号）
https://sepoliafaucet.com/

# Infura 水龙头
https://www.infura.io/faucet/sepolia

# Chainlink 水龙头
https://faucets.chain.link/sepolia

# QuickNode 水龙头
https://faucet.quicknode.com/ethereum/sepolia
```

**建议余额**: 0.1 ETH（足够测试）

### 2. 准备钱包私钥

```bash
# 导出 MetaMask 私钥：
# MetaMask → 账户详情 → 导出私钥

# 或生成新钱包：
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

---

## 🎯 3 步运行

### 步骤 1: 安装依赖

```bash
cd mvp-demo
npm install
```

预计时间: 30 秒

### 步骤 2: 配置环境

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env，只需修改这一行：
nano .env  # 或 vim .env
```

**只需修改**:
```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

其他配置已预填好：
- ✅ Sepolia RPC
- ✅ ERC-8004 合约地址（已部署）
- ✅ 测试 NFT 合约地址（Sepolia 上现成的）
- ✅ Token ID 范围（0-4，共 5 个 NFT）

### 步骤 3: 运行 Demo

```bash
npm run demo
```

预计时间: 3-5 分钟（取决于网络）

---

## 📊 预期输出

```
================================================================================
🚀 NFT IPFS to Filecoin Migration MVP
    ERC-8004 Agent Integration Demo
================================================================================

🔧 Validating Configuration...
✅ Configuration valid
   Network: https://rpc.sepolia.org
   Chain ID: 11155111
   NFT Contract: 0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8
   Token Range: 0 - 4

🔐 Initializing Ethers...
✅ Wallet: 0xYourAddress

💰 Checking Balance...
   Balance: 0.1 ETH

================================================================================
PHASE 1: Initialize Clients
================================================================================
✅ NFT Scanner initialized
✅ Filecoin Uploader initialized (Synapse SDK)
✅ ERC-8004 Client initialized

================================================================================
PHASE 2: Register ERC-8004 Agent
================================================================================

📝 Registering Agent with ERC-8004...
   Registration Fee: 0.0 ETH  (free on testnet!)
   Sending transaction...
   Transaction hash: 0xabcd1234...

✅ Agent Registered Successfully!
   Agent ID: 42

================================================================================
PHASE 3: Scan NFT Project
================================================================================

🔍 Starting NFT Scan...

📝 Contract Information:
   Name: Azuki Sample
   Symbol: AZUKI
   Type: ERC721
   Address: 0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8

📡 Scanning NFT tokens 0 to 4...

  Scanning token #0...
  ✅ Token #0:
     Owner: 0x1234...
     Metadata CID: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
     Image CID: QmPAg1mjxcEQPPtqsLoEcauVedaeMH81WXDPvPx3VC5zUz

📊 Scan Summary:
   Total Tokens Scanned: 5
   Successful: 5
   Failed: 0
   Unique IPFS CIDs Found: 8

================================================================================
PHASE 4: Create ERC-8004 Validation Request
================================================================================

📋 Creating Validation Request...
   Agent ID: 42
   Task URI: file:///path/to/output/task-metadata.json

✅ Validation Request Created!
   Request ID: 123

================================================================================
PHASE 5: Migrate to Filecoin
================================================================================

📦 Batch Migration: 8 IPFS CIDs

[1/8] Processing: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
📥 Downloading from IPFS...
   ✅ Downloaded successfully (45.2 KB)

📤 Uploading to Filecoin...
   Creating storage context...
   Starting upload...
   ✅ Upload complete! Piece CID: bafykbzacedli...
   ✅ Piece added to storage! CAR CID: bafy2bzaced...

🎉 Filecoin Upload Successful!

... (repeat for 8 CIDs)

📊 Batch Migration Summary:
   Total: 8
   Successful: 8
   Failed: 0
   Success Rate: 100.0%

================================================================================
PHASE 6: Submit Proof to ERC-8004
================================================================================

📤 Submitting Proof...
   Request ID: 123
   Proof URI: file:///path/to/output/proof-metadata.json

✅ Proof Submitted!

================================================================================
PHASE 7: Approve Validation
================================================================================

✅ Approving Validation...
   Request ID: 123

✅ Validation Approved!

================================================================================
PHASE 8: Verify and Generate Final Report
================================================================================

🔍 Querying Agent #42...
📋 Agent Information:
   Owner: 0xYourAddress
   Active: true

🔍 Querying Validation Request #123...
📋 Validation Request:
   Status: Approved

================================================================================
🎉 MVP DEMO COMPLETED SUCCESSFULLY!
================================================================================

📊 Summary:
   ERC-8004 Agent ID: 42
   Validation Request ID: 123
   Validation Status: Approved
   NFT Contract: 0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8
   Tokens Scanned: 5
   Unique IPFS CIDs: 8
   Migrated to Filecoin: 8/8
   Success Rate: 100.0%

📁 Output Files:
   Reports: ./output/
   Downloads: ./downloads/

🔗 Transactions:
   Agent Registration: 0xabcd1234...
   Validation Request: 0xef567890...
   Proof Submission: 0x12345678...
   Validation Approval: 0x90abcdef...

✅ All data saved to: /path/to/output

================================================================================
💡 ERC-8004 Value Demonstrated:
   ✅ Decentralized Identity - Agent registered on-chain
   ✅ Work Validation - Task and proof recorded immutably
   ✅ Trust Layer - Verifiable migration results
   ✅ Composability - Other agents can verify this work
================================================================================
```

---

## 🔍 验证结果

### 1. 查看输出文件

```bash
# 查看所有报告
ls -la output/

# 查看最终报告
cat output/final-report.json | jq

# 查看迁移结果
cat output/migration-report.json | jq '.filecoinCIDs'
```

### 2. 链上验证

```bash
# 查看你的 Agent
cast call 0x7177a6867296406881E20d6647232314736Dd09A \
  "getAgent(uint256)(address,string,uint256,bool)" \
  YOUR_AGENT_ID \
  --rpc-url https://rpc.sepolia.org

# 查看验证请求
cast call 0x662b40A526cb4017d947e71eAF6753BF3eeE66d8 \
  "getValidationRequest(uint256)" \
  YOUR_REQUEST_ID \
  --rpc-url https://rpc.sepolia.org
```

### 3. 区块浏览器

访问 Sepolia Etherscan:
```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

---

## 🛠️ 故障排除

### 问题 1: "Insufficient balance"

**解决**: 获取更多 Sepolia ETH
```bash
# 检查余额
cast balance YOUR_ADDRESS --rpc-url https://rpc.sepolia.org

# 访问水龙头（见上文）
```

### 问题 2: "Network timeout"

**解决 1**: 配置代理
```env
# 在 .env 中取消注释
HTTP_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
HTTPS_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
```

**解决 2**: 更换 RPC 端点
```env
# 在 .env 中修改
RPC_URL=https://eth-sepolia.public.blastapi.io
# 或
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

### 问题 3: "IPFS gateway timeout"

**解决**: 更换 IPFS 网关
```env
# 在 .env 中修改
IPFS_GATEWAY=https://cloudflare-ipfs.com/ipfs/
# 或
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### 问题 4: "Token does not exist"

**解决**: 调整 token ID 范围
```env
# 某些 NFT 合约从 1 开始，不是 0
NFT_START_TOKEN_ID=1
NFT_END_TOKEN_ID=5
```

---

## 📚 使用的合约地址

### ERC-8004 合约（Sepolia 测试网）

来源: https://github.com/ChaosChain/trustless-agents-erc-ri

| 合约 | 地址 |
|------|------|
| IdentityRegistry | `0x7177a6867296406881E20d6647232314736Dd09A` |
| ReputationRegistry | `0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322` |
| ValidationRegistry | `0x662b40A526cb4017d947e71eAF6753BF3eeE66d8` |

**注意**: 这些合约在 5 个测试网上使用相同地址（确定性部署）：
- Ethereum Sepolia ✅ (本 Demo 使用)
- 0G Testnet
- Mode Testnet
- Base Sepolia
- Optimism Sepolia

### 测试 NFT 合约

| 项目 | 地址 | 网络 | Token 范围 |
|------|------|------|-----------|
| Azuki Sample | `0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8` | Sepolia | 0-4 |

---

## 🎓 下一步

### 测试成功后：

1. **查看输出报告** - 理解每个阶段的结果
2. **链上验证** - 使用 cast 或 Etherscan 查看交易
3. **修改参数** - 尝试不同的 NFT 项目或 token 范围
4. **阅读代码** - 理解 ERC-8004 集成细节

### 扩展实验：

```bash
# 测试其他网络（相同 ERC-8004 地址）
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532  # Base Sepolia

# 测试更多 NFT
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=19  # 扫描 20 个 NFT
```

---

## 💡 关键概念

### ERC-8004 三大支柱

1. **Identity (身份)**: Agent 在链上注册，获得唯一 ID
2. **Validation (验证)**: 工作结果链上验证，不可篡改
3. **Reputation (信誉)**: 历史反馈累积，建立信任

### Filecoin 存储概念

- **Piece CID**: Filecoin 存储单元标识
- **CAR CID**: CAR (Content Addressable aRchive) 文件标识
- **Synapse SDK**: 简化 Filecoin 存储的 SDK

---

## 📞 需要帮助？

- 查看完整文档: `README.md`
- 部署指南: `DEPLOYMENT.md`
- 技术报告: `MVP_COMPLETION_REPORT.md`
- ERC-8004 实现者指南: https://github.com/ChaosChain/trustless-agents-erc-ri

---

**预计总时间**: 5-10 分钟
**难度**: ⭐⭐ (简单 - 只需配置私钥)
**网络要求**: 需要稳定连接到 Sepolia RPC 和 IPFS 网关

**开始吧！** 🚀
