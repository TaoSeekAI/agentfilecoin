# NFT IPFS to Filecoin Migration System

## 项目概述

本系统是一个完整的 AI Agent 生态，用于自动扫描 OpenSea NFT 项目，提取所有 IPFS 资源链接，并使用 Filecoin Synapse SDK 将这些资源重新存储到 Filecoin 网络。系统基于 ERC-8004 Trustless Agents 标准构建，提供完整的信任层、验证机制和信誉系统。

## 系统架构

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                        │
│              (任务协调、状态管理、错误处理)                    │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
       ┌───────▼────────┐                ┌───────▼──────────┐
       │ NFT Scanner    │                │  Storage Agent   │
       │    Agent       │                │  (Synapse SDK)   │
       │                │                │                  │
       │ - 扫描合约      │                │ - 上传 Filecoin  │
       │ - 提取 metadata│                │ - 管理存储交易    │
       │ - 解析 IPFS CID│                │ - 状态跟踪       │
       └───────┬────────┘                └───────┬──────────┘
               │                                  │
               └──────────────┬───────────────────┘
                              │
                      ┌───────▼──────────┐
                      │ Validator Agent  │
                      │                  │
                      │ - 验证上传完整性  │
                      │ - 校验 CID 一致性│
                      │ - 提交验证结果    │
                      └───────┬──────────┘
                              │
                              │
                ┌─────────────▼──────────────────┐
                │   ERC-8004 Trust Layer         │
                │                                │
                │ - Identity Registry (身份)     │
                │ - Validation Registry (验证)   │
                │ - Reputation Registry (信誉)   │
                └────────────────────────────────┘
```

### 数据流

```
NFT 项目 → Scanner Agent → IPFS CID 列表 → Storage Agent → Filecoin
                                                     ↓
                                            Validator Agent
                                                     ↓
                                            ERC-8004 Contracts
```

## 合约编译指南

### 环境准备

#### 1. 安装 Foundry (推荐)

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 验证安装
forge --version
cast --version
```

#### 2. 或安装 Solidity 编译器

```bash
# Ubuntu/Debian
sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc

# macOS
brew update
brew upgrade
brew tap ethereum/ethereum
brew install solidity
```

### 编译步骤

#### 使用 Foundry (推荐)

```bash
# 1. 进入合约目录
cd contracts

# 2. 安装依赖
forge install

# 3. 编译合约
forge build

# 4. 查看编译输出
ls -la out/

# 5. 运行测试
forge test -vvv

# 6. 生成 ABI
forge inspect AgentIdentity abi > ../backend/src/contracts/AgentIdentity.json
forge inspect AgentReputation abi > ../backend/src/contracts/AgentReputation.json
forge inspect AgentValidation abi > ../backend/src/contracts/AgentValidation.json
```

#### 编译选项说明

```toml
# foundry.toml 配置
[profile.default]
src = "src"                    # 源代码目录
out = "out"                    # 编译输出目录
libs = ["lib"]                 # 依赖库目录
solc_version = "0.8.20"        # Solidity 版本
optimizer = true               # 启用优化器
optimizer_runs = 200           # 优化运行次数
via_ir = false                 # 不使用 IR 编译
evm_version = "paris"          # EVM 版本

# Filecoin Calibration 测试网配置
[rpc_endpoints]
calibration = "https://api.calibration.node.glif.io/rpc/v1"

[etherscan]
calibration = { key = "${ETHERSCAN_API_KEY}" }
```

### 编译输出解析

编译成功后，会在 `out/` 目录下生成以下文件：

```
out/
├── AgentIdentity.sol/
│   ├── AgentIdentity.json          # 完整的编译输出
│   └── AgentIdentity.metadata.json # 元数据
├── AgentReputation.sol/
│   ├── AgentReputation.json
│   └── AgentReputation.metadata.json
└── AgentValidation.sol/
    ├── AgentValidation.json
    └── AgentValidation.metadata.json
```

每个 `.json` 文件包含：
- `abi`: 合约 ABI (应用程序二进制接口)
- `bytecode`: 部署字节码
- `deployedBytecode`: 已部署字节码
- `methodIdentifiers`: 方法签名
- `gasEstimates`: Gas 估算

### 常见编译错误及解决方案

#### 错误 1: 找不到依赖

```
Error: Could not find lib/openzeppelin-contracts
```

**解决方案:**
```bash
git submodule update --init --recursive
forge install OpenZeppelin/openzeppelin-contracts
```

#### 错误 2: Solidity 版本不匹配

```
Error: Source file requires different compiler version
```

**解决方案:**
在 `foundry.toml` 中指定正确版本:
```toml
solc_version = "0.8.20"
```

#### 错误 3: Stack too deep

```
CompilerError: Stack too deep
```

**解决方案:**
1. 启用 via-ir: `via_ir = true`
2. 或重构代码，减少局部变量

## Agent 实现详解

### 1. NFT Scanner Agent

**职责:** 扫描 OpenSea NFT 项目，提取所有 IPFS 资源

**实现文件:** `backend/src/services/nft_scanner.rs`

**核心功能:**

```rust
pub struct NFTScannerAgent {
    contract_address: Address,
    rpc_provider: Provider<Http>,
    ipfs_gateway: String,
    mcp_client: Arc<MCPClient>,
}

impl NFTScannerAgent {
    /// 扫描 NFT 项目获取所有 token IDs
    pub async fn scan_nft_project(&self) -> Result<Vec<TokenMetadata>> {
        // 1. 获取 totalSupply 或使用事件日志
        // 2. 遍历所有 tokenId
        // 3. 调用 tokenURI(tokenId)
        // 4. 解析 metadata JSON
        // 5. 提取 IPFS CID
    }

    /// 解析 metadata 提取 IPFS 资源
    pub async fn extract_ipfs_resources(&self, metadata_uri: &str)
        -> Result<Vec<IpfsResource>> {
        // 1. 下载 metadata JSON
        // 2. 解析 image, animation_url, assets 等字段
        // 3. 提取 IPFS CID (支持多种格式)
        //    - ipfs://Qm...
        //    - https://ipfs.io/ipfs/Qm...
        //    - https://gateway.pinata.cloud/ipfs/Qm...
    }
}
```

**关键挑战:**

1. **合约接口多样性**
   - ERC-721: `tokenURI(uint256 tokenId)`
   - ERC-1155: `uri(uint256 id)`
   - 自定义接口

2. **Metadata 格式不统一**
   - OpenSea metadata standard
   - 自定义 JSON schema
   - 链上/链下混合存储

3. **IPFS 网关可用性**
   - 多网关重试机制
   - 超时处理
   - 缓存策略

**解决方案:**

```rust
// 多网关重试
const IPFS_GATEWAYS: &[&str] = &[
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://dweb.link/ipfs/",
];

async fn download_with_retry(cid: &str, max_retries: u32) -> Result<Bytes> {
    for gateway in IPFS_GATEWAYS {
        match download_from_gateway(gateway, cid).await {
            Ok(data) => return Ok(data),
            Err(e) => {
                warn!("Gateway {} failed: {}", gateway, e);
                continue;
            }
        }
    }
    Err(anyhow!("All gateways failed"))
}
```

### 2. Storage Agent

**职责:** 使用 Synapse SDK 将资源上传到 Filecoin

**实现文件:** `backend/src/services/storage_agent.rs`

**核心功能:**

```rust
pub struct StorageAgent {
    synapse_client: SynapseClient,
    mcp_client: Arc<MCPClient>,
    agent_id: u256,
}

impl StorageAgent {
    /// 上传单个资源到 Filecoin
    pub async fn upload_resource(&self, resource: &IpfsResource)
        -> Result<StorageResult> {
        // 1. 从 IPFS 下载原始内容
        let content = self.download_from_ipfs(&resource.cid).await?;

        // 2. 通过 MCP 调用 Synapse SDK 上传
        let response = self.mcp_client.upload_to_filecoin(
            &content,
            &format!("{}.dat", resource.cid)
        ).await?;

        // 3. 记录映射关系
        let storage_result = StorageResult {
            original_cid: resource.cid.clone(),
            piece_cid: response.piece_cid,
            car_cid: response.car_cid,
            size: response.size,
            provider: response.provider_address,
            timestamp: Utc::now(),
        };

        // 4. 保存到数据库
        self.save_storage_record(&storage_result).await?;

        Ok(storage_result)
    }

    /// 批量上传（带并发控制）
    pub async fn upload_batch(&self, resources: Vec<IpfsResource>)
        -> Result<Vec<StorageResult>> {
        // 使用 Semaphore 控制并发数
        let semaphore = Arc::new(Semaphore::new(5)); // 最多5个并发

        let tasks: Vec<_> = resources.into_iter().map(|resource| {
            let agent = self.clone();
            let sem = semaphore.clone();

            tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                agent.upload_resource(&resource).await
            })
        }).collect();

        // 等待所有任务完成
        futures::future::join_all(tasks).await
    }
}
```

**关键挑战:**

1. **存储成本控制**
   - 大文件上传费用高
   - 需要预算管理

2. **上传失败处理**
   - 网络中断
   - 合约调用失败
   - 余额不足

3. **状态同步**
   - 幂等性设计
   - 断点续传
   - 事务一致性

**解决方案:**

```rust
// 幂等性检查
async fn upload_with_idempotency(&self, resource: &IpfsResource)
    -> Result<StorageResult> {
    // 检查是否已上传
    if let Some(existing) = self.db.find_by_cid(&resource.cid).await? {
        info!("Resource {} already uploaded", resource.cid);
        return Ok(existing);
    }

    // 执行上传
    let mut retries = 0;
    loop {
        match self.try_upload(resource).await {
            Ok(result) => {
                // 成功后保存
                self.db.save(&result).await?;
                return Ok(result);
            }
            Err(e) if retries < MAX_RETRIES => {
                warn!("Upload failed (retry {}/{}): {}", retries, MAX_RETRIES, e);
                retries += 1;
                tokio::time::sleep(Duration::from_secs(2u64.pow(retries))).await;
            }
            Err(e) => return Err(e),
        }
    }
}
```

### 3. Validator Agent

**职责:** 验证上传完整性和正确性

**实现文件:** `backend/src/services/validator_agent.rs`

**核心功能:**

```rust
pub struct ValidatorAgent {
    mcp_client: Arc<MCPClient>,
    agent_id: u256,
    validation_contract: ValidationContract,
}

impl ValidatorAgent {
    /// 验证单个存储结果
    pub async fn validate_storage(&self, result: &StorageResult)
        -> Result<ValidationReport> {
        // 1. 从 Filecoin 下载内容
        let filecoin_content = self.mcp_client
            .download_from_filecoin(&result.piece_cid)
            .await?;

        // 2. 从原始 IPFS 下载内容（对比用）
        let original_content = self.download_from_ipfs(&result.original_cid)
            .await?;

        // 3. 比对内容
        let content_match = filecoin_content == original_content;

        // 4. 验证 CID 计算
        let computed_cid = calculate_cid(&filecoin_content);
        let cid_match = computed_cid == result.original_cid;

        // 5. 检查存储状态
        let storage_status = self.mcp_client
            .get_storage_status(&result.piece_cid)
            .await?;

        // 6. 生成验证报告
        let report = ValidationReport {
            storage_result_id: result.id,
            content_match,
            cid_match,
            storage_active: storage_status.active,
            validator_id: self.agent_id,
            timestamp: Utc::now(),
            score: self.calculate_score(content_match, cid_match, storage_status.active),
        };

        // 7. 提交到链上（ERC-8004 Validation Registry）
        self.submit_validation_onchain(&report).await?;

        Ok(report)
    }

    /// 提交验证结果到链上
    async fn submit_validation_onchain(&self, report: &ValidationReport)
        -> Result<TxHash> {
        let tx = self.validation_contract
            .submit_validation(
                report.storage_result_id,
                report.score,
                &serde_json::to_string(report)?
            )
            .send()
            .await?
            .await?;

        Ok(tx.transaction_hash)
    }
}
```

### 4. Orchestrator Agent

**职责:** 协调所有 Agent，管理整体流程

**实现文件:** `backend/src/services/orchestrator.rs`

**核心功能:**

```rust
pub struct OrchestratorAgent {
    scanner: Arc<NFTScannerAgent>,
    storage: Arc<StorageAgent>,
    validator: Arc<ValidatorAgent>,
    db: Arc<Database>,
}

impl OrchestratorAgent {
    /// 执行完整的迁移流程
    pub async fn execute_migration(&self, nft_contract: Address)
        -> Result<MigrationReport> {
        let start_time = Utc::now();

        // 阶段 1: 扫描 NFT 项目
        info!("Phase 1: Scanning NFT project...");
        let tokens = self.scanner.scan_nft_project().await?;
        info!("Found {} tokens", tokens.len());

        // 阶段 2: 提取 IPFS 资源
        info!("Phase 2: Extracting IPFS resources...");
        let mut resources = Vec::new();
        for token in &tokens {
            let token_resources = self.scanner
                .extract_ipfs_resources(&token.metadata_uri)
                .await?;
            resources.extend(token_resources);
        }
        info!("Extracted {} IPFS resources", resources.len());

        // 去重
        resources.dedup_by(|a, b| a.cid == b.cid);
        info!("Unique resources: {}", resources.len());

        // 阶段 3: 批量上传到 Filecoin
        info!("Phase 3: Uploading to Filecoin...");
        let storage_results = self.storage.upload_batch(resources).await?;
        let successful_uploads = storage_results.iter()
            .filter(|r| r.is_ok())
            .count();
        info!("Successfully uploaded {}/{}", successful_uploads, storage_results.len());

        // 阶段 4: 验证上传结果
        info!("Phase 4: Validating uploads...");
        let mut validation_reports = Vec::new();
        for result in &storage_results {
            if let Ok(storage_result) = result {
                match self.validator.validate_storage(storage_result).await {
                    Ok(report) => validation_reports.push(report),
                    Err(e) => warn!("Validation failed: {}", e),
                }
            }
        }

        let passed_validations = validation_reports.iter()
            .filter(|r| r.score >= 80)
            .count();
        info!("Validations passed: {}/{}", passed_validations, validation_reports.len());

        // 生成最终报告
        let report = MigrationReport {
            nft_contract,
            total_tokens: tokens.len(),
            total_resources: resources.len(),
            uploaded: successful_uploads,
            validated: passed_validations,
            start_time,
            end_time: Utc::now(),
            storage_results,
            validation_reports,
        };

        // 保存报告
        self.db.save_migration_report(&report).await?;

        Ok(report)
    }
}
```

## ERC-8004 集成

### Identity Registry

每个 Agent 在系统启动时注册到 Identity Registry:

```rust
async fn register_agent(
    identity_contract: &IdentityContract,
    agent_metadata: AgentMetadata
) -> Result<u256> {
    // 1. 创建 metadata JSON
    let metadata = serde_json::to_string(&agent_metadata)?;

    // 2. 上传 metadata 到 Filecoin (via MCP)
    let metadata_uri = upload_metadata_to_filecoin(&metadata).await?;

    // 3. 注册到合约
    let tx = identity_contract
        .register(metadata_uri)
        .value(parse_ether("0.1")?) // 注册费
        .send()
        .await?;

    let receipt = tx.await?;

    // 4. 从事件中获取 agent_id
    let agent_id = parse_agent_registered_event(&receipt)?;

    Ok(agent_id)
}
```

### Validation Registry

验证流程与 ERC-8004 的集成:

```rust
// 1. 创建验证请求
let validation_request_id = validation_contract
    .create_validation_request(
        storage_result_id,
        validator_agent_id,
        &task_description
    )
    .send()
    .await?
    .await?;

// 2. Validator Agent 执行验证
let validation_result = validator.validate_storage(&storage_result).await?;

// 3. 提交验证结果
validation_contract
    .submit_validation(
        validation_request_id,
        validation_result.score,
        &serde_json::to_string(&validation_result)?
    )
    .send()
    .await?;
```

### Reputation Registry

反馈和信誉管理:

```rust
// 用户/系统给 Agent 反馈
async fn give_feedback_to_agent(
    reputation_contract: &ReputationContract,
    agent_id: u256,
    score: u8,
    feedback_text: &str
) -> Result<TxHash> {
    // 1. 上传反馈内容到 Filecoin
    let feedback_uri = upload_feedback_to_filecoin(feedback_text).await?;

    // 2. 提交反馈
    let tx = reputation_contract
        .give_feedback(
            agent_id,
            score,
            vec!["migration".to_string(), "storage".to_string()],
            feedback_uri
        )
        .send()
        .await?;

    Ok(tx.transaction_hash)
}
```

## 测试与验证

### 单元测试

```bash
# 测试合约
cd contracts
forge test -vvv

# 测试 Rust 代码
cd ../backend
cargo test --all-features
```

### 集成测试

```bash
# 运行完整的端到端测试
cd backend
cargo test --test integration_tests -- --nocapture
```

### 手动测试流程

#### 1. 准备测试环境

```bash
# 启动 MCP 服务器
cd mcp-server
npm install
npm run build
npm start &

# 配置环境变量
export WALLET_PRIVATE_KEY="0x..."
export RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
export NFT_CONTRACT="0x..." # 测试用的 NFT 合约地址
```

#### 2. 部署合约

```bash
cd contracts

# 部署 Identity Registry
forge script script/Deploy.s.sol:DeployIdentity \
    --rpc-url $RPC_URL \
    --private-key $WALLET_PRIVATE_KEY \
    --broadcast

# 记录合约地址
export IDENTITY_CONTRACT="0x..."
export REPUTATION_CONTRACT="0x..."
export VALIDATION_CONTRACT="0x..."
```

#### 3. 运行迁移任务

```bash
cd ../backend

# 构建 CLI
cargo build --release

# 执行迁移
./target/release/agent-cli migrate \
    --nft-contract $NFT_CONTRACT \
    --identity-contract $IDENTITY_CONTRACT \
    --validation-contract $VALIDATION_CONTRACT \
    --reputation-contract $REPUTATION_CONTRACT \
    --rpc-url $RPC_URL \
    --output report.json
```

#### 4. 验证结果

```bash
# 查看迁移报告
cat report.json | jq .

# 检查链上数据
cast call $IDENTITY_CONTRACT "getAgent(uint256)" 1 --rpc-url $RPC_URL

# 验证 Filecoin 存储
# (从报告中获取 piece_cid)
curl -X POST http://localhost:3000 -d '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_storage_status",
    "arguments": {
      "piece_cid": "bafy..."
    }
  },
  "id": 1
}'
```

## 性能优化

### 1. 并发控制

```rust
// 限制并发数避免资源耗尽
const MAX_CONCURRENT_UPLOADS: usize = 10;
const MAX_CONCURRENT_VALIDATIONS: usize = 5;

let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_UPLOADS));
```

### 2. 缓存策略

```rust
// Metadata 缓存
use lru::LruCache;

struct CachedScanner {
    metadata_cache: Arc<Mutex<LruCache<String, TokenMetadata>>>,
    // ...
}
```

### 3. 批量操作

```rust
// 批量提交验证结果（减少 gas 费用）
async fn submit_validations_batch(
    validations: Vec<ValidationResult>
) -> Result<TxHash> {
    let batch_data = encode_batch_validations(validations);
    validation_contract.submit_batch(batch_data).send().await
}
```

## 监控和日志

### 日志级别

```rust
// 配置日志
env_logger::Builder::from_env(
    env_logger::Env::default()
        .default_filter_or("info")
).init();

// 使用日志
info!("Starting migration for NFT contract {}", contract_address);
debug!("Downloaded resource {}, size: {} bytes", cid, size);
warn!("Upload retry {}/{}", retry, max_retries);
error!("Validation failed: {}", error);
```

### 指标收集

```rust
use prometheus::{Counter, Histogram, Registry};

lazy_static! {
    static ref UPLOADS_TOTAL: Counter = Counter::new(
        "uploads_total",
        "Total number of uploads"
    ).unwrap();

    static ref UPLOAD_DURATION: Histogram = Histogram::new(
        "upload_duration_seconds",
        "Upload duration in seconds"
    ).unwrap();
}

// 记录指标
UPLOADS_TOTAL.inc();
let timer = UPLOAD_DURATION.start_timer();
// ... upload ...
timer.observe_duration();
```

## 错误处理

### 错误分类

```rust
#[derive(Debug, thiserror::Error)]
pub enum MigrationError {
    #[error("Contract error: {0}")]
    Contract(#[from] ContractError),

    #[error("IPFS download failed: {0}")]
    IpfsDownload(String),

    #[error("Filecoin upload failed: {0}")]
    FilecoinUpload(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}
```

### 重试策略

```rust
use backoff::{ExponentialBackoff, Error as BackoffError};

async fn retry_with_backoff<F, Fut, T>(f: F) -> Result<T>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T>>,
{
    backoff::future::retry(
        ExponentialBackoff::default(),
        || async {
            f().await.map_err(|e| {
                if is_retryable(&e) {
                    BackoffError::Transient(e)
                } else {
                    BackoffError::Permanent(e)
                }
            })
        }
    ).await
}
```

## 安全考虑

### 1. 私钥管理

```rust
// 使用环境变量或密钥管理服务
let private_key = std::env::var("WALLET_PRIVATE_KEY")
    .expect("WALLET_PRIVATE_KEY must be set");

// 使用 AWS KMS / HashiCorp Vault
let signer = AwsKmsSigner::new(kms_client, key_id).await?;
```

### 2. 输入验证

```rust
// 验证 NFT 合约地址
fn validate_contract_address(addr: &str) -> Result<Address> {
    let address: Address = addr.parse()
        .map_err(|_| anyhow!("Invalid contract address"))?;

    // 检查是否为合约（而非 EOA）
    if !is_contract(&address).await? {
        return Err(anyhow!("Address is not a contract"));
    }

    Ok(address)
}
```

### 3. 速率限制

```rust
use governor::{Quota, RateLimiter};

let limiter = RateLimiter::direct(
    Quota::per_second(nonzero!(10u32))
);

// 使用
limiter.until_ready().await;
make_api_call().await?;
```

## 部署清单

- [ ] 安装 Foundry 工具链
- [ ] 编译智能合约
- [ ] 部署合约到 Calibration 测试网
- [ ] 获取测试 FIL 和 USDFC
- [ ] 配置 MCP 服务器
- [ ] 构建 Rust 后端
- [ ] 注册 Agent 身份
- [ ] 运行集成测试
- [ ] 执行小规模试点迁移
- [ ] 监控和调优
- [ ] 执行完整迁移
- [ ] 生成最终报告

## 下一步

1. **短期 (1-2周)**
   - 完成所有 Agent 实现
   - 添加完整的错误处理
   - 完善测试覆盖率

2. **中期 (1个月)**
   - 优化性能和 gas 成本
   - 添加监控和告警
   - 支持更多 NFT 标准

3. **长期 (3个月+)**
   - 支持主网部署
   - 构建 Web UI
   - 开放 API 给第三方
