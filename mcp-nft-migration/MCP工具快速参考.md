# 🛠️ MCP 工具快速参考

## 📚 所有可用工具

MCP Server 提供了 **13 个工具**，分为 4 个类别：

### 1️⃣ 环境设置工具 (Setup Tools)

#### `verify_setup`
验证环境配置是否正确，检查私钥、SDK版本、余额和授权状态

**参数**: 无

**使用示例**:
```
请使用 verify_setup 工具验证环境配置
```

**返回**: 环境配置状态报告

---

#### `setup_approvals`
自动设置 Filecoin 存储所需的所有授权（存入 USDFC 并授权 Warm Storage）

**参数**:
- `deposit_amount` (可选): USDFC 存款金额，默认 35

**使用示例**:
```
请使用 setup_approvals 工具设置 Filecoin 授权，存款金额为 50 USDFC
```

**返回**: 授权设置结果和交易哈希

---

#### `check_balances`
检查钱包余额（FIL、USDFC、Payments 余额）

**参数**: 无

**使用示例**:
```
请使用 check_balances 工具检查钱包余额
```

**返回**: FIL、USDFC 钱包余额、USDFC Payments 余额

---

### 2️⃣ NFT 扫描工具 (NFT Tools)

#### `nft_scan`
扫描以太坊 NFT 合约，获取 NFT 列表和元数据

**参数**:
- `contract_address` (必需): NFT 合约地址
- `token_ids` (可选): Token ID 列表，不提供则扫描所有

**使用示例**:
```
请使用 nft_scan 工具扫描 NFT 合约 0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a
```

**返回**: NFT 列表（Token ID、Owner、元数据、IPFS CID）

---

#### `get_nft_metadata`
获取单个 NFT 的元数据（从 IPFS 或 HTTP）

**参数**:
- `contract_address` (必需): NFT 合约地址
- `token_id` (必需): Token ID

**使用示例**:
```
请使用 get_nft_metadata 工具获取 Token ID 0 的元数据
合约地址: 0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a
```

**返回**: NFT 完整元数据（名称、描述、图像、属性）

---

### 3️⃣ 上传工具 (Upload Tools)

#### `upload_to_filecoin`
上传 NFT 元数据到 Filecoin，返回 PieceCID

**参数**:
- `nft_token_id` (必需): NFT Token ID
- `metadata` (必需): NFT 元数据对象
- `contract_address` (必需): NFT 合约地址

**使用示例**:
```
请使用 upload_to_filecoin 工具上传 Token ID 0 的元数据到 Filecoin
合约地址: 0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a
元数据: {
  "name": "Sample NFT #0",
  "description": "A sample NFT",
  "image": "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/image-0.png"
}
```

**返回**: PieceCID (ipfs://baga...)、Piece ID、Data Set ID

---

#### `test_upload`
使用测试数据测试 Filecoin 上传功能

**参数**:
- `file_size_mb` (可选): 测试文件大小（MB），默认 1.1

**使用示例**:
```
请使用 test_upload 工具测试 Filecoin 上传功能
```

**返回**: 测试上传结果和 PieceCID

---

### 4️⃣ ERC-8004 验证工具 (Validation Tools)

#### `register_agent`
在 ERC-8004 合约上注册 AI Agent

**参数**:
- `name` (必需): Agent 名称
- `description` (必需): Agent 描述
- `capabilities` (可选): Agent 能力列表

**使用示例**:
```
请使用 register_agent 工具注册一个新的 AI Agent
名称: NFT Migration Agent
描述: AI Agent for migrating NFT metadata from IPFS to Filecoin
能力: ["nft-scan", "filecoin-upload", "metadata-migration"]
```

**返回**: Agent ID、交易哈希、元数据

---

#### `get_agent_info`
查询 Agent 信息

**参数**:
- `agent_id` (必需): Agent ID

**使用示例**:
```
请使用 get_agent_info 工具查询 Agent ID 为 1 的 Agent 信息
```

**返回**: Agent 所有者、元数据 URI、注册时间、活跃状态

---

#### `create_validation_request`
创建验证请求

**参数**:
- `agent_id` (必需): Agent ID
- `nft_contract` (必需): NFT 合约地址
- `token_ids` (必需): Token ID 列表
- `validator` (必需): 验证者地址

**使用示例**:
```
请使用 create_validation_request 工具创建验证请求
Agent ID: 1
NFT 合约: 0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a
Token IDs: ["0", "1", "2", "3", "4"]
验证者: 0xB34d4c8E3AcCB5FA62455228281649Be525D4e59
```

**返回**: Request Hash、交易哈希、任务元数据

---

#### `submit_validation`
提交验证结果

**参数**:
- `request_hash` (必需): Request Hash
- `is_valid` (必需): 验证结果 (true/false)
- `proof_cid` (必需): 证明 CID (ipfs://...)
- `metadata` (可选): 验证元数据

**使用示例**:
```
请使用 submit_validation 工具提交验证结果
Request Hash: 0xabcdef1234567890...
验证结果: true
证明 CID: ipfs://baga6ea4seaqao7s73y24kcutaosvacpdjgfe5pw76ooefnyqw4ynr3d2y2vd
元数据: {
  "nft_contract": "0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a",
  "token_ids": ["0", "1", "2"],
  "filecoin_piece_cids": ["ipfs://baga...", "ipfs://baga...", "ipfs://baga..."]
}
```

**返回**: 验证状态、交易哈希、证明元数据

---

#### `get_validation_status`
查询验证状态

**参数**:
- `request_hash` (必需): Request Hash

**使用示例**:
```
请使用 get_validation_status 工具查询验证状态
Request Hash: 0xabcdef1234567890...
```

**返回**: 是否已验证、验证结果、验证者、证明 URI

---

## 📊 工具分类总览

| 类别 | 工具数量 | 工具列表 |
|------|----------|----------|
| **环境设置** | 3 | `verify_setup`, `setup_approvals`, `check_balances` |
| **NFT 扫描** | 2 | `nft_scan`, `get_nft_metadata` |
| **上传** | 2 | `upload_to_filecoin`, `test_upload` |
| **ERC-8004 验证** | 5 | `register_agent`, `get_agent_info`, `create_validation_request`, `submit_validation`, `get_validation_status` |
| **总计** | **13** | |

---

## 🔄 完整工作流程（使用的工具顺序）

```
1. verify_setup          - 验证环境配置
2. check_balances        - 检查余额
3. setup_approvals       - 设置授权（如需要）
4. register_agent        - 注册 Agent
5. get_agent_info        - 验证 Agent 注册
6. nft_scan              - 扫描 NFT 合约
7. create_validation_request - 创建验证请求
8. upload_to_filecoin    - 上传每个 NFT（重复）
9. submit_validation     - 提交验证结果
10. get_validation_status - 查询验证状态
```

---

## 🎯 常用命令示例

### 快速开始
```bash
# 1. 验证环境
请使用 verify_setup 工具验证环境配置

# 2. 检查余额
请使用 check_balances 工具检查钱包余额

# 3. 扫描 NFT
请使用 nft_scan 工具扫描 NFT 合约 0x50f5474724e0Ee42D9a4e711ccFB275809Fd6d4a
```

### ERC-8004 验证流程
```bash
# 1. 注册 Agent
请使用 register_agent 工具注册一个新的 AI Agent，名称为 "NFT Migration Agent"

# 2. 创建验证请求
请使用 create_validation_request 工具创建验证请求，Agent ID 为 1

# 3. 上传到 Filecoin
请使用 upload_to_filecoin 工具上传 Token ID 0 的元数据

# 4. 提交验证
请使用 submit_validation 工具提交验证结果

# 5. 查询状态
请使用 get_validation_status 工具查询验证状态
```

---

## 📚 相关文档

- [ERC8004分步骤演示指南.md](./ERC8004分步骤演示指南.md) - 详细步骤说明
- [ERC8004验证完整指南.md](./ERC8004验证完整指南.md) - 技术细节
- [ERC8004验证测试指南.md](./ERC8004验证测试指南.md) - 测试方法

---

**最后更新**: 2025-10-21
**版本**: 1.0.0
**MCP Server**: mcp-nft-migration v1.0.0
