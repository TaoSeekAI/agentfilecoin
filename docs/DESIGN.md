# ERC-8004 Agent on Filecoin - 设计文档

## 1. 概述

本项目实现一个符合 ERC-8004 规范的 AI Agent 系统，使用 Filecoin 主网进行数据存储，通过智能合约管理 Agent 的身份、声誉和验证。

### 1.1 核心组件

- **智能合约层** (Solidity): 部署在 Filecoin EVM 上的 ERC-8004 兼容合约
- **存储层** (Filecoin): 使用 IPFS/Filecoin 存储 Agent 元数据和反馈数据
- **后端服务** (Rust): 处理 Filecoin pinning、MCP 协议集成
- **CLI 工具**: 最小化 MVP 用于验证功能

## 2. ERC-8004 规范解析

### 2.1 三大核心注册表

#### Identity Registry (身份注册表)
- 基于 ERC-721 标准
- 为每个 Agent 分配唯一的链上身份
- 全局标识符格式: `namespace:chainId:registryAddress:tokenId`
- 支持 Agent 元数据 URI (IPFS/HTTPS)

#### Reputation Registry (声誉注册表)
- 记录 Agent 的反馈信息
- 评分范围: 0-100
- 支持标签化反馈
- 可选文件 URI (存储详细反馈数据)
- 支持撤销和响应功能

#### Validation Registry (验证注册表)
- 验证 Agent 的工作输出
- 支持多种验证机制: TEE、zkML、质押验证
- 追踪验证请求和响应状态

### 2.2 Agent 注册文件结构

```json
{
  "name": "Agent Name",
  "description": "Agent description",
  "image": "ipfs://QmHash",
  "endpoints": [
    {
      "type": "a2a",
      "uri": "https://api.example.com/agent"
    },
    {
      "type": "mcp",
      "uri": "mcp://agent.example.com"
    }
  ],
  "supportedTrust": ["reputation", "validation"]
}
```

## 3. Filecoin 集成架构

### 3.1 存储方案

#### IPFS + Filecoin 双层存储
```
┌─────────────────┐
│   Agent Data    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   IPFS   │  ◄── 快速访问层
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Filecoin │  ◄── 持久化存储层
    └──────────┘
```

#### 数据类型与存储策略

1. **Agent 元数据** (小文件, < 1MB)
   - 存储位置: IPFS
   - Filecoin 策略: 使用 Lighthouse/Web3.Storage 自动 pin
   - 更新频率: 低频

2. **反馈数据** (中等大小, 1-10MB)
   - 存储位置: IPFS
   - Filecoin 策略: 批量 pin，周期性存储交易
   - 更新频率: 中频

3. **验证数据** (大文件, > 10MB，如模型权重、执行证明)
   - 存储位置: 直接 Filecoin
   - 策略: 使用 Filecoin.sol 合约触发存储交易
   - 更新频率: 低频

### 3.2 Filecoin EVM 合约交互

Filecoin 提供预编译合约用于：
- 查询存储交易状态
- 触发存储交易
- 管理数据 CID

## 4. 智能合约设计

### 4.1 合约架构

```
┌──────────────────────┐
│  AgentIdentity.sol   │  ◄── ERC-721, Identity Registry
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  AgentReputation.sol │  ◄── Reputation Registry
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  AgentValidation.sol │  ◄── Validation Registry
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ FilecoinStorage.sol  │  ◄── Filecoin 存储集成
└──────────────────────┘
```

### 4.2 核心接口

#### IAgentIdentity
```solidity
interface IAgentIdentity {
    function register(string calldata uri) external returns (uint256 agentId);
    function updateURI(uint256 agentId, string calldata uri) external;
    function getAgentURI(uint256 agentId) external view returns (string memory);
    function ownerOf(uint256 agentId) external view returns (address);
}
```

#### IAgentReputation
```solidity
interface IAgentReputation {
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        string[] calldata tags,
        string calldata fileURI
    ) external;

    function revokeFeedback(uint256 feedbackId) external;

    function appendResponse(
        uint256 feedbackId,
        string calldata response
    ) external;

    function getReputation(uint256 agentId)
        external view returns (uint256 avgScore, uint256 totalFeedbacks);
}
```

#### IAgentValidation
```solidity
interface IAgentValidation {
    function requestValidation(
        uint256 agentId,
        string calldata workURI,
        address validator
    ) external returns (uint256 requestId);

    function submitValidation(
        uint256 requestId,
        bool isValid,
        string calldata proofURI
    ) external;

    function getValidationStatus(uint256 requestId)
        external view returns (bool completed, bool isValid);
}
```

#### IFilecoinStorage
```solidity
interface IFilecoinStorage {
    function pinToFilecoin(string calldata cid) external;
    function getStorageStatus(string calldata cid)
        external view returns (bool isPinned, uint256 dealId);
}
```

### 4.3 数据结构

```solidity
struct Agent {
    address owner;
    string metadataURI;  // IPFS CID
    uint256 registeredAt;
    bool isActive;
}

struct Feedback {
    address from;
    uint256 agentId;
    uint8 score;
    string[] tags;
    string fileURI;  // IPFS CID for detailed feedback
    uint256 timestamp;
    bool revoked;
}

struct ValidationRequest {
    uint256 agentId;
    address requester;
    string workURI;
    address validator;
    bool completed;
    bool isValid;
    string proofURI;
}

struct FilecoinPin {
    string cid;
    uint256 dealId;
    bool isPinned;
    uint256 pinnedAt;
}
```

## 5. Rust 后端设计

### 5.1 架构概览

```
┌──────────────┐
│  CLI Tool    │
└──────┬───────┘
       │
┌──────▼───────────────────────┐
│    Backend Service (Rust)    │
├──────────────────────────────┤
│  - Filecoin Client           │
│  - IPFS Client               │
│  - Contract Interaction      │
│  - MCP Protocol Handler      │
└──────┬───────────────────────┘
       │
   ┌───▼────┐    ┌───────┐    ┌──────────┐
   │ IPFS   │    │ W3UP  │    │ Filecoin │
   │ Node   │    │ API   │    │ Network  │
   └────────┘    └───────┘    └──────────┘
```

### 5.2 依赖库

```toml
[dependencies]
# Filecoin SDK
fvm-sdk = "3.0"
fil-actor-interface = "13.0"

# IPFS
ipfs-api = "0.17"
cid = "0.11"

# Web3 / Ethereum
ethers = "2.0"
alloy = "0.1"

# Storage providers
lighthouse-rs = "0.1"  # Lighthouse API
web3-storage = "0.1"   # Web3.Storage API

# MCP Protocol
serde_json = "1.0"
tokio = "1.35"
reqwest = "0.11"

# CLI
clap = { version = "4.4", features = ["derive"] }
```

### 5.3 核心模块

#### FilecoinClient
```rust
pub struct FilecoinClient {
    rpc_endpoint: String,
    wallet: Wallet,
}

impl FilecoinClient {
    pub async fn pin_cid(&self, cid: &str) -> Result<DealId>;
    pub async fn get_deal_status(&self, deal_id: DealId) -> Result<DealStatus>;
    pub async fn verify_storage(&self, cid: &str) -> Result<bool>;
}
```

#### IPFSClient
```rust
pub struct IPFSClient {
    client: IpfsClient,
}

impl IPFSClient {
    pub async fn add_json(&self, data: &serde_json::Value) -> Result<Cid>;
    pub async fn get_json(&self, cid: &Cid) -> Result<serde_json::Value>;
    pub async fn pin_remote(&self, cid: &Cid) -> Result<()>;
}
```

#### ContractClient
```rust
pub struct ContractClient {
    provider: Provider<Http>,
    identity_contract: AgentIdentity,
    reputation_contract: AgentReputation,
    validation_contract: AgentValidation,
}

impl ContractClient {
    pub async fn register_agent(&self, metadata_cid: String) -> Result<U256>;
    pub async fn give_feedback(&self, agent_id: U256, score: u8, tags: Vec<String>) -> Result<TxHash>;
    pub async fn request_validation(&self, agent_id: U256, work_cid: String) -> Result<U256>;
}
```

#### MCPHandler
```rust
pub struct MCPHandler {
    server_uri: String,
}

impl MCPHandler {
    pub async fn list_tools(&self) -> Result<Vec<Tool>>;
    pub async fn call_tool(&self, name: &str, args: Value) -> Result<Value>;
    pub async fn register_agent_tool(&self, agent_id: U256) -> Result<()>;
}
```

### 5.4 工作流程

#### Agent 注册流程
```
1. 准备 Agent 元数据 (JSON)
   ↓
2. 上传到 IPFS
   ↓
3. 获取 CID
   ↓
4. Pin 到 Filecoin (via Lighthouse/Web3.Storage)
   ↓
5. 调用智能合约注册 Agent
   ↓
6. 返回 Agent ID
```

#### 反馈提交流程
```
1. 构建反馈数据
   ↓
2. (可选) 上传详细反馈到 IPFS
   ↓
3. 调用 giveFeedback 合约方法
   ↓
4. 后台 Pin 反馈数据到 Filecoin
```

## 6. MVP 最小可行产品

### 6.1 功能范围

**核心功能:**
1. Agent 注册 (register)
2. Agent 查询 (query)
3. 提交反馈 (feedback)
4. 查询声誉 (reputation)
5. MCP 协议验证 (mcp-test)

**存储功能:**
1. IPFS 上传/下载
2. Filecoin Pin (通过 Lighthouse API)

### 6.2 CLI 命令设计

```bash
# 初始化配置
agent-cli init --network calibration --private-key <KEY>

# 注册 Agent
agent-cli register \
  --name "My Agent" \
  --description "AI Agent Description" \
  --mcp-endpoint "mcp://localhost:3000" \
  --image ./agent-avatar.png

# 查询 Agent
agent-cli query --agent-id 1

# 提交反馈
agent-cli feedback \
  --agent-id 1 \
  --score 85 \
  --tags "helpful,fast" \
  --message "Great agent!"

# 查询声誉
agent-cli reputation --agent-id 1

# 测试 MCP 功能
agent-cli mcp-test \
  --agent-id 1 \
  --tool "calculator" \
  --args '{"operation": "add", "a": 5, "b": 3}'

# 查询存储状态
agent-cli storage-status --cid QmXxx...

# Pin 数据到 Filecoin
agent-cli pin --file ./data.json
```

### 6.3 配置文件

```toml
# ~/.agent-cli/config.toml
[network]
name = "calibration"
rpc_url = "https://api.calibration.node.glif.io/rpc/v1"
chain_id = 314159

[contracts]
identity = "0x..."
reputation = "0x..."
validation = "0x..."

[storage]
ipfs_gateway = "https://ipfs.io/ipfs/"
lighthouse_api_key = "xxx"
web3_storage_token = "xxx"

[wallet]
private_key = "encrypted:xxx"
address = "0x..."

[mcp]
default_timeout = 30
```

## 7. 部署方案

### 7.1 网络选择

**测试网:** Filecoin Calibration Testnet
- Chain ID: 314159
- RPC: https://api.calibration.node.glif.io/rpc/v1
- Faucet: https://faucet.calibration.fildev.network/

**主网:** Filecoin Mainnet
- Chain ID: 314
- RPC: https://api.node.glif.io/rpc/v1

### 7.2 合约部署步骤

```bash
# 1. 编译合约
cd contracts
forge build

# 2. 部署到 Calibration
forge create --rpc-url $CALIBRATION_RPC \
  --private-key $PRIVATE_KEY \
  src/AgentIdentity.sol:AgentIdentity

# 3. 验证合约
forge verify-contract \
  --chain-id 314159 \
  --compiler-version v0.8.23 \
  $CONTRACT_ADDRESS \
  src/AgentIdentity.sol:AgentIdentity

# 4. 部署其他合约
forge script script/Deploy.s.sol \
  --rpc-url $CALIBRATION_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 7.3 Lighthouse/Web3.Storage 集成

**Lighthouse 配置:**
```rust
// 上传文件
let api_key = std::env::var("LIGHTHOUSE_API_KEY")?;
let client = LighthouseClient::new(api_key);
let cid = client.upload_json(metadata).await?;

// Pin 到 Filecoin
client.pin_by_cid(cid).await?;
```

**Web3.Storage 配置:**
```rust
// 使用 w3up 协议
let space = w3up::Space::new()?;
let client = w3up::Client::new(space);
let cid = client.upload_car(data).await?;
```

## 8. 安全考虑

### 8.1 智能合约安全

1. **访问控制:**
   - 使用 OpenZeppelin 的 Ownable/AccessControl
   - Agent 注册需验证 msg.sender
   - 反馈撤销只能由提交者执行

2. **重入保护:**
   - 使用 ReentrancyGuard
   - 遵循 Checks-Effects-Interactions 模式

3. **数据验证:**
   - 验证 score 范围 (0-100)
   - 检查 URI 格式
   - 防止空数据提交

### 8.2 存储安全

1. **CID 验证:**
   - 验证 CID 格式
   - 确保内容可访问
   - 使用 IPFS 网关验证

2. **数据加密:**
   - 敏感数据使用端到端加密
   - 公钥存储在链上
   - 私钥本地管理

3. **Pin 策略:**
   - 使用多个 pinning 服务
   - 定期验证数据可用性
   - 实现数据恢复机制

### 8.3 Sybil 攻击防护

1. **注册成本:**
   - 收取少量注册费用
   - 使用时间锁定机制

2. **声誉权重:**
   - 基于交易历史的权重系统
   - 验证者质押机制

3. **速率限制:**
   - 限制反馈提交频率
   - 防止垃圾信息

## 9. 性能优化

### 9.1 Gas 优化

1. **批量操作:**
   - 支持批量反馈提交
   - 合并存储写入

2. **存储优化:**
   - 使用 packed storage
   - 最小化状态变量

3. **事件日志:**
   - 使用 indexed 参数
   - 减少事件数据大小

### 9.2 存储优化

1. **IPFS 优化:**
   - 使用 CAR 文件格式
   - 压缩 JSON 数据
   - 使用 IPLD 链接

2. **Filecoin 优化:**
   - 批量存储交易
   - 选择性 pinning
   - 使用 Filecoin Plus (10x 存储能力)

## 10. 测试策略

### 10.1 智能合约测试

```solidity
// Foundry 测试
contract AgentIdentityTest is Test {
    function testRegister() public {
        uint256 agentId = identity.register("ipfs://Qm...");
        assertEq(identity.ownerOf(agentId), address(this));
    }

    function testFeedback() public {
        // ... 测试反馈功能
    }
}
```

### 10.2 集成测试

```rust
#[tokio::test]
async fn test_register_and_query_agent() {
    let client = create_test_client().await;

    // 注册 agent
    let agent_id = client.register_agent(test_metadata()).await.unwrap();

    // 查询 agent
    let agent = client.query_agent(agent_id).await.unwrap();
    assert_eq!(agent.name, "Test Agent");
}
```

### 10.3 MCP 协议测试

```rust
#[tokio::test]
async fn test_mcp_tool_execution() {
    let handler = MCPHandler::new("mcp://localhost:3000");

    // 列出工具
    let tools = handler.list_tools().await.unwrap();
    assert!(!tools.is_empty());

    // 调用工具
    let result = handler.call_tool("echo", json!({"message": "test"})).await.unwrap();
    assert_eq!(result["message"], "test");
}
```

## 11. 路线图

### Phase 1: MVP (2 周)
- [x] 设计文档
- [ ] 智能合约实现
- [ ] Rust 后端基础框架
- [ ] CLI 基本命令
- [ ] 本地测试

### Phase 2: 测试网部署 (1 周)
- [ ] 部署到 Calibration 测试网
- [ ] Lighthouse 集成
- [ ] 完整测试套件
- [ ] 文档完善

### Phase 3: MCP 集成 (1 周)
- [ ] MCP 协议完整实现
- [ ] Agent 工具注册
- [ ] 工具调用验证
- [ ] 端到端测试

### Phase 4: 主网准备 (1 周)
- [ ] 安全审计
- [ ] 性能优化
- [ ] 主网部署
- [ ] 监控和维护

## 12. 参考资料

- ERC-8004 Specification: https://eips.ethereum.org/EIPS/eip-8004
- Filecoin EVM Docs: https://docs.filecoin.io/smart-contracts/fundamentals/
- Lighthouse API: https://docs.lighthouse.storage/
- MCP Protocol: https://modelcontextprotocol.io/
- Foundry Book: https://book.getfoundry.sh/
- Ethers-rs: https://docs.rs/ethers/latest/ethers/
