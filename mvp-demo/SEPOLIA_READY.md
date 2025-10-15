# ✅ Sepolia 测试网 - 即刻可用配置

## 🎉 好消息

MVP 已完全配置为使用 **Ethereum Sepolia 测试网**，无需部署任何合约！

---

## 📦 预部署资源

### ERC-8004 合约（已部署）

来源：https://github.com/ChaosChain/trustless-agents-erc-ri

| 合约名称 | 地址 | 功能 |
|---------|------|------|
| IdentityRegistry | `0x7177a6867296406881E20d6647232314736Dd09A` | Agent 注册 |
| ValidationRegistry | `0x662b40A526cb4017d947e71eAF6753BF3eeE66d8` | 工作验证 |
| ReputationRegistry | `0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322` | 信誉系统 |

**注意**：这些地址在 5 个测试网上相同（确定性部署）：
- ✅ Ethereum Sepolia (推荐)
- 0G Testnet
- Mode Testnet
- Base Sepolia
- Optimism Sepolia

### 测试 NFT 合约（Sepolia 上已有）

| 项目 | 地址 | Tokens |
|------|------|--------|
| 测试 NFT | `0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8` | 0-4 (5个) |

---

## 🚀 3 分钟启动

### 步骤 1: 安装依赖 (30 秒)

```bash
cd mvp-demo
npm install
```

### 步骤 2: 配置环境 (1 分钟)

```bash
# 1. 复制模板
cp .env.example .env

# 2. 编辑 .env
nano .env  # 或 vim .env
```

**只需修改一行**:
```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

其他配置已预填：
```env
# ✅ Sepolia RPC
RPC_URL=https://rpc.sepolia.org
CHAIN_ID=11155111

# ✅ ERC-8004 合约地址
AGENT_IDENTITY_ADDRESS=0x7177a6867296406881E20d6647232314736Dd09A
AGENT_REPUTATION_ADDRESS=0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322
AGENT_VALIDATION_ADDRESS=0x662b40A526cb4017d947e71eAF6753BF3eeE66d8

# ✅ 测试 NFT
NFT_CONTRACT_ADDRESS=0xF42A3F3a7E1883b1d76B84bbB0b5697ba6e8d0c8
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4
```

### 步骤 3: 测试设置 (30 秒)

```bash
npm test
```

预期输出：
```
🧪 Testing MVP Setup...
============================================================

1️⃣  Checking environment variables...
   ✅ All required variables present

2️⃣  Testing RPC connectivity...
   ✅ Connected to network: sepolia (Chain ID: 11155111)

3️⃣  Checking wallet...
   ✅ Wallet address: 0xYourAddress
   💰 Balance: 0.1 ETH

4️⃣  Verifying ERC-8004 contracts...
   ✅ Identity contract at 0x7177...
   📋 Registration fee: 0.0 ETH
   ✅ Validation contract at 0x662b...

5️⃣  Checking NFT contract...
   ✅ NFT contract at 0xF42A...
   📋 Name: TestNFT
   📋 Symbol: TNFT

6️⃣  Testing IPFS gateway...
   ✅ IPFS gateway accessible

============================================================
📊 Test Summary:
   ✅ Passed: 6
   ❌ Failed: 0
============================================================

🎉 All tests passed! You can now run:
   npm run demo
```

### 步骤 4: 运行 Demo (3-5 分钟)

```bash
npm run demo
```

---

## 💰 获取 Sepolia ETH

需要余额：~0.1 ETH（建议）

### 水龙头列表（建议多试几个）:

1. **Alchemy** (推荐)
   - https://sepoliafaucet.com/
   - 需要账号，每天 0.5 ETH

2. **Infura**
   - https://www.infura.io/faucet/sepolia
   - 需要账号

3. **Chainlink**
   - https://faucets.chain.link/sepolia
   - 需要 GitHub 账号

4. **QuickNode**
   - https://faucet.quicknode.com/ethereum/sepolia
   - 需要账号

5. **POW Faucet** (无需账号)
   - https://sepolia-faucet.pk910.de/
   - 通过 PoW 挖矿获取

### 检查余额

```bash
cast balance YOUR_ADDRESS --rpc-url https://rpc.sepolia.org
```

---

## 📊 预期执行流程

### Phase 1: 初始化客户端
```
✅ NFT Scanner initialized
✅ Filecoin Uploader initialized (Synapse SDK)
✅ ERC-8004 Client initialized
```

### Phase 2: 注册 Agent
```
📝 Registering Agent with ERC-8004...
   Registration Fee: 0.0 ETH
   Transaction hash: 0xabcd...

✅ Agent Registered Successfully!
   Agent ID: 42
```

### Phase 3: 扫描 NFT
```
🔍 Starting NFT Scan...
📝 Contract Information:
   Name: TestNFT
   Symbol: TNFT
   Type: ERC721

📊 Scan Summary:
   Total Tokens Scanned: 5
   Successful: 5
   Unique IPFS CIDs Found: 8
```

### Phase 4: 创建验证请求
```
📋 Creating Validation Request...
✅ Validation Request Created!
   Request ID: 123
```

### Phase 5: 迁移到 Filecoin
```
📦 Batch Migration: 8 IPFS CIDs

[1/8] Processing: QmYwAPJzv...
📥 Downloading from IPFS... ✅
📤 Uploading to Filecoin... ✅
   Piece CID: bafykbzaced...
   CAR CID: bafy2bzaced...

📊 Batch Migration Summary:
   Success Rate: 100.0%
```

### Phase 6-8: 提交证明并验证
```
📤 Submitting Proof... ✅
✅ Approving Validation... ✅
🔍 Generating Final Report... ✅
```

### 完成
```
🎉 MVP DEMO COMPLETED SUCCESSFULLY!

📊 Summary:
   ERC-8004 Agent ID: 42
   Validation Request ID: 123
   Validation Status: Approved
   Success Rate: 100.0%

📁 Output Files: ./output/
🔗 Transactions: (6 transaction hashes)
```

---

## 🔍 验证结果

### 1. 查看输出文件

```bash
# 查看所有生成的报告
ls -la output/

# 查看最终报告
cat output/final-report.json | jq

# 查看迁移结果
cat output/migration-report.json | jq '.summary'
```

### 2. 链上验证

```bash
# 查看你的 Agent（替换 AGENT_ID）
cast call 0x7177a6867296406881E20d6647232314736Dd09A \
  "getAgent(uint256)" \
  YOUR_AGENT_ID \
  --rpc-url https://rpc.sepolia.org

# 查看验证请求（替换 REQUEST_ID）
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

查看你的 Agent 注册交易和验证交易。

---

## 🛠️ 常见问题

### Q: 没有 Sepolia ETH 怎么办？
A: 访问上面列出的任一水龙头。建议尝试多个，因为有些可能限流。

### Q: 网络连接超时？
A: 配置代理或更换 RPC：
```env
# 在 .env 中
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port

# 或更换 RPC
RPC_URL=https://eth-sepolia.public.blastapi.io
```

### Q: NFT 合约扫描失败？
A: 该合约可能没有 tokens。尝试其他 NFT 合约或调整 token ID 范围：
```env
NFT_START_TOKEN_ID=1
NFT_END_TOKEN_ID=5
```

### Q: IPFS 下载失败？
A: 更换 IPFS 网关：
```env
IPFS_GATEWAY=https://cloudflare-ipfs.com/ipfs/
# 或
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### Q: Gas 费用多少？
A: Sepolia 测试网 gas 费极低：
- Agent 注册: ~0.001 ETH
- 创建验证请求: ~0.0005 ETH
- 提交证明: ~0.0005 ETH
- 批准验证: ~0.0005 ETH

**总计**: < 0.005 ETH

### Q: 可以在主网运行吗？
A: 技术上可以，但：
1. 需要真实 ETH（贵！）
2. ERC-8004 合约需要部署到主网
3. 建议先在测试网验证

---

## 🌐 支持的网络

相同的 ERC-8004 合约地址在这些网络上都可用：

| 网络 | Chain ID | RPC | 水龙头 |
|------|----------|-----|--------|
| **Sepolia** ✅ | 11155111 | https://rpc.sepolia.org | [链接](https://sepoliafaucet.com/) |
| Base Sepolia | 84532 | https://sepolia.base.org | [链接](https://docs.base.org/tools/network-faucets) |
| Optimism Sepolia | 11155420 | https://sepolia.optimism.io | [链接](https://app.optimism.io/faucet) |
| Mode Testnet | 919 | https://sepolia.mode.network | [链接](https://www.mode.network/faucet) |
| 0G Testnet | 16600 | https://evmrpc-testnet.0g.ai | [链接](https://faucet.0g.ai/) |

**切换网络**：只需修改 .env 中的 `RPC_URL` 和 `CHAIN_ID`，合约地址保持不变！

---

## 📚 下一步

### 测试成功后：

1. ✅ **理解代码** - 阅读各模块源码
2. ✅ **查看报告** - 分析 output/ 中的 JSON 文件
3. ✅ **链上验证** - 使用 cast 或 Etherscan 验证
4. ✅ **尝试修改** - 更换 NFT 合约，调整参数

### 扩展实验：

```bash
# 1. 测试更多 NFT
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=19  # 20 个 NFT

# 2. 测试其他网络（相同合约地址）
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532  # Base Sepolia

# 3. 使用其他 IPFS 网关
IPFS_GATEWAY=https://dweb.link/ipfs/
```

---

## 💡 ERC-8004 核心价值

通过这个 Demo，你将看到：

### 1. 去中心化身份
```javascript
// 任何人都可以查询你的 Agent
const agent = await identityContract.getAgent(agentId);
// 返回: { owner, metadataURI, registeredAt, isActive }
```

### 2. 工作验证
```javascript
// 你的工作被永久记录在链上
const validation = await validationContract.getValidationRequest(requestId);
// 返回: { agentId, taskURI, proofURI, status: "Approved" }
```

### 3. 信任层
- 历史记录不可篡改
- 其他 Agent 可以基于你的工作
- 形成 Agent 信任网络

### 4. 可组合性
- 标准化接口
- 跨 Agent 协作
- 生态系统效应

---

## 🎯 总结

### 你将获得：

- ✅ 完整运行的 NFT -> Filecoin 迁移系统
- ✅ ERC-8004 Agent 注册和验证
- ✅ 链上可验证的工作记录
- ✅ 6 个详细的 JSON 报告
- ✅ 理解 AI Agent 去中心化信任

### 所需时间：

- 准备: 5 分钟（获取 ETH + 配置）
- 运行: 5 分钟（执行 Demo）
- 验证: 5 分钟（查看结果）

**总计: 15 分钟获得完整体验**

---

## 📞 获取帮助

- 📖 完整文档: [README.md](./README.md)
- 🚀 快速指南: [QUICKSTART.md](./QUICKSTART.md)
- 🔧 部署指南: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔍 ERC-8004 实现: https://github.com/ChaosChain/trustless-agents-erc-ri

---

**准备好了吗？开始吧！** 🚀

```bash
npm test  # 测试设置
npm run demo  # 运行 Demo
```
