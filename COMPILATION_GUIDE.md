# 智能合约编译完整指南

## 概述

本项目包含三个核心 ERC-8004 智能合约，用于构建可信 AI Agent 生态系统。本文档提供详细的编译方法、验证步骤和故障排除指南。

## 快速开始

### 一键编译

```bash
# 进入项目根目录
cd /var/tmp/vibe-kanban/worktrees/0d79-aiagent

# 运行编译脚本（自动处理所有依赖）
./scripts/compile-contracts.sh

# 或者仅编译不运行测试
./scripts/compile-contracts.sh --no-test
```

### 使用代理（国内用户）

```bash
# 方式 1: 使用环境变量
export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
./scripts/compile-contracts.sh

# 方式 2: 脚本自动配置（推荐）
./scripts/compile-contracts.sh  # 脚本会自动尝试代理
```

## 详细编译步骤

### 步骤 1: 环境准备

#### 1.1 安装 Foundry（推荐）

**Linux / macOS:**
```bash
# 方法 A: 官方安装脚本
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 方法 B: 使用我们的安装脚本（支持代理）
./scripts/install-foundry.sh

# 方法 C: 手动下载二进制文件
# 从 https://github.com/foundry-rs/foundry/releases 下载
# 解压到 ~/.foundry/bin/
# 添加到 PATH: export PATH="$HOME/.foundry/bin:$PATH"
```

**验证安装:**
```bash
forge --version
# 输出示例: forge 0.2.0 (...)

cast --version
# 输出示例: cast 0.2.0 (...)
```

#### 1.2 或使用 Docker（无需本地安装）

```bash
# 拉取 Foundry Docker 镜像
docker pull ghcr.io/foundry-rs/foundry:latest

# 创建别名方便使用
alias forge='docker run --rm -v $(pwd):/app -w /app ghcr.io/foundry-rs/foundry:latest forge'
alias cast='docker run --rm -v $(pwd):/app -w /app ghcr.io/foundry-rs/foundry:latest cast'
```

### 步骤 2: 安装项目依赖

```bash
cd contracts

# 初始化 git submodules
git submodule update --init --recursive

# 安装 OpenZeppelin 合约
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit

# 安装 Forge 标准库
forge install foundry-rs/forge-std --no-commit

# 验证依赖
ls lib/
# 应该看到: forge-std  openzeppelin-contracts
```

### 步骤 3: 配置编译选项

确认 `contracts/foundry.toml` 配置正确:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
via_ir = false
evm_version = "paris"

# Filecoin 网络配置
[rpc_endpoints]
calibration = "https://api.calibration.node.glif.io/rpc/v1"
mainnet = "https://api.node.glif.io/rpc/v1"

[etherscan]
calibration = { key = "${ETHERSCAN_API_KEY}", url = "https://calibration.filfox.info/api" }
```

### 步骤 4: 清理旧编译产物

```bash
# 清理编译缓存和输出
forge clean

# 验证清理
ls out/ 2>/dev/null || echo "out/ 目录已清理"
ls cache/ 2>/dev/null || echo "cache/ 目录已清理"
```

### 步骤 5: 编译合约

```bash
# 标准编译
forge build

# 强制重新编译
forge build --force

# 详细输出（显示所有信息）
forge build --force -vvv

# 仅编译特定合约
forge build --contracts src/AgentIdentity.sol
```

### 步骤 6: 验证编译结果

```bash
# 检查编译输出
ls -lh out/

# 应该看到以下目录:
# out/AgentIdentity.sol/
# out/AgentReputation.sol/
# out/AgentValidation.sol/

# 查看编译的 ABI
cat out/AgentIdentity.sol/AgentIdentity.json | jq '.abi' | head -20

# 查看 bytecode 大小
cat out/AgentIdentity.sol/AgentIdentity.json | jq -r '.bytecode.object' | wc -c
```

## 编译输出说明

### 输出结构

编译成功后，`out/` 目录结构如下:

```
out/
├── AgentIdentity.sol/
│   ├── AgentIdentity.json              # 完整编译输出
│   ├── AgentIdentity.metadata.json     # 合约元数据
│   ├── IAgentIdentity.json             # 接口 ABI
│   └── ...
├── AgentReputation.sol/
│   ├── AgentReputation.json
│   ├── AgentReputation.metadata.json
│   └── ...
└── AgentValidation.sol/
    ├── AgentValidation.json
    ├── AgentValidation.metadata.json
    └── ...
```

### JSON 文件内容

每个 `.json` 文件包含:

```json
{
  "abi": [...],                    // 合约 ABI（用于调用合约）
  "bytecode": {
    "object": "0x608060...",       // 部署字节码
    "sourceMap": "...",            // 源码映射
    "linkReferences": {}           // 库引用
  },
  "deployedBytecode": {
    "object": "0x608060...",       // 已部署字节码
    "sourceMap": "...",
    "linkReferences": {}
  },
  "methodIdentifiers": {           // 函数选择器
    "register(string)": "d393c871",
    "getAgent(uint256)": "2de94807",
    ...
  },
  "gasEstimates": {                // Gas 估算
    "creation": {...},
    "external": {...}
  },
  "metadata": "{...}"              // 完整元数据 JSON 字符串
}
```

## 提取 ABI 供后端使用

### 方法 1: 使用 jq 提取

```bash
# 创建 ABI 输出目录
mkdir -p ../backend/src/contracts/abis

# 提取每个合约的 ABI
jq '.abi' out/AgentIdentity.sol/AgentIdentity.json \
  > ../backend/src/contracts/abis/AgentIdentity.json

jq '.abi' out/AgentReputation.sol/AgentReputation.json \
  > ../backend/src/contracts/abis/AgentReputation.json

jq '.abi' out/AgentValidation.sol/AgentValidation.json \
  > ../backend/src/contracts/abis/AgentValidation.json
```

### 方法 2: 使用 forge inspect

```bash
# 直接提取 ABI
forge inspect AgentIdentity abi > ../backend/src/contracts/abis/AgentIdentity.json
forge inspect AgentReputation abi > ../backend/src/contracts/abis/AgentReputation.json
forge inspect AgentValidation abi > ../backend/src/contracts/abis/AgentValidation.json

# 提取 bytecode
forge inspect AgentIdentity bytecode > bytecode/AgentIdentity.bin
```

## 运行测试

### 单元测试

```bash
# 运行所有测试
forge test

# 详细输出
forge test -vvv

# 运行特定测试文件
forge test --match-path test/AgentIdentity.t.sol

# 运行特定测试函数
forge test --match-test testRegister

# 显示 gas 报告
forge test --gas-report
```

### 集成测试

```bash
# 运行集成测试脚本
forge script script/IntegrationTest.s.sol -vvv
```

## 合约部署

### 本地测试网部署（Anvil）

```bash
# 终端 1: 启动本地节点
anvil

# 终端 2: 部署合约
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### Filecoin Calibration 测试网部署

```bash
# 设置环境变量
export PRIVATE_KEY="0x..."
export RPC_URL="https://api.calibration.node.glif.io/rpc/v1"

# 部署
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# 记录部署的合约地址
# 输出示例:
# AgentIdentity deployed at: 0x1234...
# AgentReputation deployed at: 0x5678...
# AgentValidation deployed at: 0x9abc...
```

## 故障排除

### 常见错误及解决方案

#### 错误 1: 找不到 OpenZeppelin 合约

```
Error:
  --> src/AgentIdentity.sol:4:1:
   |
4 | import "@openzeppelin/contracts/access/Ownable.sol";
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   = note: File not found
```

**解决方案:**
```bash
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit
```

#### 错误 2: Solidity 版本不匹配

```
Error: Source file requires different compiler version
Current compiler is 0.8.19 but the source requires 0.8.20
```

**解决方案:**
在 `foundry.toml` 中设置:
```toml
solc_version = "0.8.20"
```

#### 错误 3: Stack too deep

```
CompilerError: Stack too deep when compiling inline assembly
```

**解决方案:**
```toml
# 在 foundry.toml 中启用 IR 编译
via_ir = true
```

或重构代码减少局部变量:
```solidity
// 之前
function foo() {
    uint256 a = 1;
    uint256 b = 2;
    // ... 很多变量
}

// 优化后
function foo() {
    _helperFunction(1, 2);
}

function _helperFunction(uint256 a, uint256 b) internal {
    // 分解逻辑
}
```

#### 错误 4: Gas 估算失败

```
Error: Transaction reverted during gas estimation
```

**解决方案:**
1. 检查构造函数参数
2. 确保账户有足够余额
3. 使用 `--gas-limit` 指定 gas 上限

```bash
forge script Deploy.s.sol \
  --rpc-url $RPC_URL \
  --gas-limit 10000000
```

#### 错误 5: RPC 连接超时

```
Error: Failed to connect to RPC
```

**解决方案:**
1. 检查网络连接
2. 使用代理:
```bash
export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
```
3. 增加超时时间:
```toml
# foundry.toml
[rpc_storage_caching]
enabled = true
timeout = 60000  # 60 seconds
```

## 高级编译选项

### 优化级别

```toml
[profile.default]
optimizer = true
optimizer_runs = 200  # 平衡部署成本和运行成本

[profile.production]
optimizer_runs = 10000  # 优化运行成本（部署更贵）

[profile.development]
optimizer = false  # 快速编译（调试用）
```

使用特定 profile:
```bash
FOUNDRY_PROFILE=production forge build
```

### 编译目标 EVM 版本

```toml
evm_version = "paris"  # Filecoin 使用 Paris
# 可选: "london", "berlin", "istanbul", "constantinople"
```

### 使用 Solc 编译器（不用 Foundry）

如果无法安装 Foundry，可以直接使用 `solc`:

```bash
# 安装 solc
npm install -g solc

# 编译单个文件
solc --optimize --abi --bin \
  --base-path . \
  --include-path lib/openzeppelin-contracts \
  src/AgentIdentity.sol \
  -o build/

# 编译所有合约
find src -name "*.sol" -exec solc --optimize --abi --bin \
  --base-path . \
  --include-path lib/openzeppelin-contracts \
  {} -o build/ \;
```

## 编译性能优化

### 使用缓存

```bash
# Forge 会自动缓存未修改的合约
# 清理缓存:
forge clean

# 仅重新编译修改的文件:
forge build  # 默认行为
```

### 并行编译

```bash
# Forge 默认使用多核编译
# 可以通过环境变量调整:
FOUNDRY_JOBS=8 forge build
```

### 跳过测试合约编译

```toml
[profile.default]
test = "test"
script = "script"

# 不编译测试
build.skip = ["test/**"]
```

## 验证合约源码

### 在 Filecoin Explorer 验证

```bash
# 自动验证（部署时）
forge script Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# 手动验证已部署合约
forge verify-contract \
  --chain-id 314159 \
  --compiler-version v0.8.20+commit.a1b79de6 \
  CONTRACT_ADDRESS \
  src/AgentIdentity.sol:AgentIdentity \
  --etherscan-api-key $API_KEY
```

## 生成文档

```bash
# 从 NatSpec 注释生成文档
forge doc

# 生成并预览
forge doc --serve --port 3001

# 访问 http://localhost:3001
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Compile Contracts

on: [push, pull_request]

jobs:
  compile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Compile contracts
        run: |
          cd contracts
          forge build

      - name: Run tests
        run: |
          cd contracts
          forge test -vvv

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: compiled-contracts
          path: contracts/out/
```

## 总结

### 成功编译的标志

✅ 所有合约文件生成在 `out/` 目录
✅ 每个合约有对应的 `.json` 文件
✅ ABI 和 bytecode 完整
✅ 测试全部通过
✅ Gas 估算合理

### 下一步

1. **部署**: 使用 `forge script` 部署到测试网
2. **集成**: 将 ABI 集成到 Rust 后端
3. **测试**: 运行端到端测试验证功能
4. **优化**: 根据 gas 报告优化合约
5. **审计**: 进行安全审计

## 参考资源

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/contracts/)
- [ERC-8004 规范](https://github.com/ethereum/ERCs/pull/8004)
- [Filecoin EVM 文档](https://docs.filecoin.io/smart-contracts/fundamentals/the-fvm)
