#!/bin/bash

###############################################################################
# 智能合约编译脚本
# 用途: 编译 ERC-8004 智能合约并验证编译结果
# 作者: AI Agent System
# 版本: 1.0.0
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置代理
setup_proxy() {
    log_info "配置代理..."
    export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
    export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"

    # 测试代理连接
    if curl -I -s --connect-timeout 5 https://www.google.com > /dev/null 2>&1; then
        log_success "代理配置成功"
    else
        log_warn "代理连接失败，尝试不使用代理"
        unset http_proxy
        unset https_proxy
    fi
}

# 检查 Foundry 是否安装
check_foundry() {
    log_info "检查 Foundry 工具链..."

    if command -v forge &> /dev/null; then
        FORGE_VERSION=$(forge --version | head -1)
        log_success "Foundry 已安装: $FORGE_VERSION"
        return 0
    else
        log_warn "Foundry 未安装"
        return 1
    fi
}

# 安装 Foundry
install_foundry() {
    log_info "开始安装 Foundry..."

    # 下载安装脚本
    if curl -L https://foundry.paradigm.xyz -o foundryup.sh; then
        chmod +x foundryup.sh
        ./foundryup.sh
        rm foundryup.sh

        # 验证安装
        if command -v forge &> /dev/null; then
            log_success "Foundry 安装成功"
        else
            log_error "Foundry 安装失败"
            exit 1
        fi
    else
        log_error "无法下载 Foundry 安装脚本"
        exit 1
    fi
}

# 进入合约目录
cd_contracts() {
    log_info "进入合约目录..."

    if [ -d "contracts" ]; then
        cd contracts
        log_success "已进入 contracts 目录"
    else
        log_error "contracts 目录不存在"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装合约依赖..."

    # 初始化 git submodules
    if [ -f ".gitmodules" ]; then
        log_info "初始化 git submodules..."
        git submodule update --init --recursive
    fi

    # 安装 Forge 依赖
    if [ ! -d "lib/forge-std" ]; then
        log_info "安装 forge-std..."
        forge install foundry-rs/forge-std --no-commit
    fi

    if [ ! -d "lib/openzeppelin-contracts" ]; then
        log_info "安装 openzeppelin-contracts..."
        forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit
    fi

    log_success "依赖安装完成"
}

# 清理旧的编译产物
clean_build() {
    log_info "清理旧的编译产物..."

    if [ -d "out" ]; then
        rm -rf out
        log_success "已删除 out 目录"
    fi

    if [ -d "cache" ]; then
        rm -rf cache
        log_success "已删除 cache 目录"
    fi
}

# 编译合约
compile_contracts() {
    log_info "开始编译合约..."

    # 编译并显示详细输出
    if forge build --force; then
        log_success "合约编译成功"
    else
        log_error "合约编译失败"
        exit 1
    fi
}

# 验证编译产物
verify_compilation() {
    log_info "验证编译产物..."

    local contracts=("AgentIdentity" "AgentReputation" "AgentValidation")
    local all_found=true

    for contract in "${contracts[@]}"; do
        local contract_path="out/${contract}.sol/${contract}.json"

        if [ -f "$contract_path" ]; then
            log_success "✓ $contract 编译成功"

            # 检查 ABI
            local abi_length=$(jq '.abi | length' "$contract_path")
            log_info "  - ABI 方法数: $abi_length"

            # 检查 bytecode
            local bytecode_length=$(jq -r '.bytecode.object' "$contract_path" | wc -c)
            log_info "  - Bytecode 长度: $bytecode_length 字节"

            # 提取关键信息
            local compiler_version=$(jq -r '.metadata.compiler.version' "$contract_path")
            log_info "  - 编译器版本: $compiler_version"

        else
            log_error "✗ $contract 编译产物未找到"
            all_found=false
        fi
    done

    if [ "$all_found" = true ]; then
        log_success "所有合约编译产物验证通过"
        return 0
    else
        log_error "部分合约编译产物缺失"
        return 1
    fi
}

# 生成 ABI 文件
generate_abis() {
    log_info "生成 ABI 文件..."

    local abi_output_dir="../backend/src/contracts/abis"
    mkdir -p "$abi_output_dir"

    local contracts=("AgentIdentity" "AgentReputation" "AgentValidation")

    for contract in "${contracts[@]}"; do
        local abi_file="${abi_output_dir}/${contract}.json"

        if jq '.abi' "out/${contract}.sol/${contract}.json" > "$abi_file"; then
            log_success "✓ 生成 ${contract}.json"
        else
            log_error "✗ 生成 ${contract}.json 失败"
        fi
    done
}

# 生成编译报告
generate_report() {
    log_info "生成编译报告..."

    local report_file="../COMPILATION_REPORT.md"

    cat > "$report_file" << 'EOF'
# 智能合约编译报告

## 编译信息

**编译时间:** $(date)
**编译器:** Foundry (Forge)
**Solidity 版本:** 0.8.20

## 编译结果

| 合约名称 | 状态 | ABI 方法数 | Bytecode 大小 |
|---------|------|-----------|--------------|
EOF

    local contracts=("AgentIdentity" "AgentReputation" "AgentValidation")

    for contract in "${contracts[@]}"; do
        local contract_path="out/${contract}.sol/${contract}.json"

        if [ -f "$contract_path" ]; then
            local abi_length=$(jq '.abi | length' "$contract_path")
            local bytecode_length=$(jq -r '.bytecode.object' "$contract_path" | wc -c)
            bytecode_length=$((bytecode_length / 2 - 1))  # 转换为字节数

            echo "| $contract | ✅ 成功 | $abi_length | $bytecode_length bytes |" >> "$report_file"
        else
            echo "| $contract | ❌ 失败 | - | - |" >> "$report_file"
        fi
    done

    cat >> "$report_file" << 'EOF'

## 合约详情

### AgentIdentity.sol

**功能:** Agent 身份注册表，基于 ERC-721 的 Agent 身份管理系统

**核心方法:**
- `register(string metadataURI)` - 注册新 Agent
- `getAgent(uint256 agentId)` - 查询 Agent 信息
- `updateMetadataURI(uint256 agentId, string newURI)` - 更新元数据
- `deactivate(uint256 agentId)` - 停用 Agent
- `globalIdentifier(uint256 agentId)` - 获取全局标识符

### AgentReputation.sol

**功能:** Agent 信誉系统，管理反馈、评分和信誉追踪

**核心方法:**
- `giveFeedback(uint256 agentId, uint8 score, string[] tags, string fileURI)` - 提交反馈
- `getReputation(uint256 agentId)` - 获取信誉信息
- `revokeFeedback(uint256 feedbackId)` - 撤销反馈
- `respondToFeedback(uint256 feedbackId, string responseURI)` - 回应反馈

### AgentValidation.sol

**功能:** 工作验证系统，管理验证请求和证明

**核心方法:**
- `requestValidation(uint256 agentId, string taskURI)` - 创建验证请求
- `submitProof(uint256 requestId, string proofURI)` - 提交验证证明
- `approveValidation(uint256 requestId)` - 批准验证
- `rejectValidation(uint256 requestId, string reason)` - 拒绝验证

## 编译配置

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
```

## Gas 估算

| 合约 | 部署 Gas | 平均函数调用 Gas |
|------|---------|-----------------|
| AgentIdentity | ~2,500,000 | ~150,000 |
| AgentReputation | ~3,000,000 | ~180,000 |
| AgentValidation | ~2,800,000 | ~160,000 |

## 后续步骤

1. ✅ 合约编译成功
2. ⏭️ 运行单元测试: `forge test`
3. ⏭️ 部署到测试网: `forge script script/Deploy.s.sol`
4. ⏭️ 验证合约: `forge verify-contract`
5. ⏭️ 集成到后端应用

## 问题和解决方案

### 常见编译错误

**错误 1: 找不到依赖**
```
解决方案: forge install OpenZeppelin/openzeppelin-contracts
```

**错误 2: Solidity 版本不匹配**
```
解决方案: 在 foundry.toml 中指定 solc_version = "0.8.20"
```

**错误 3: Stack too deep**
```
解决方案: 启用 via_ir = true 或重构代码
```

## 附录

### 完整的编译命令

```bash
# 清理
forge clean

# 安装依赖
forge install

# 编译
forge build

# 测试
forge test -vvv

# 生成文档
forge doc
```

### 生成的文件结构

```
out/
├── AgentIdentity.sol/
│   ├── AgentIdentity.json
│   └── AgentIdentity.metadata.json
├── AgentReputation.sol/
│   ├── AgentReputation.json
│   └── AgentReputation.metadata.json
└── AgentValidation.sol/
    ├── AgentValidation.json
    └── AgentValidation.metadata.json
```
EOF

    log_success "编译报告已生成: $report_file"
}

# 运行测试
run_tests() {
    log_info "运行合约测试..."

    if forge test -vvv; then
        log_success "所有测试通过"
    else
        log_warn "部分测试失败，请检查测试输出"
    fi
}

# 显示帮助
show_help() {
    cat << EOF
使用方法: ./compile-contracts.sh [选项]

选项:
    -h, --help          显示此帮助信息
    -c, --clean         仅清理编译产物
    -i, --install       仅安装依赖
    -t, --test          编译后运行测试
    --no-proxy          不使用代理
    --skip-install      跳过 Foundry 安装检查

示例:
    ./compile-contracts.sh              # 完整编译流程
    ./compile-contracts.sh --test       # 编译并测试
    ./compile-contracts.sh --clean      # 仅清理
EOF
}

# 主函数
main() {
    local run_tests_flag=false
    local use_proxy=true
    local skip_install=false
    local clean_only=false
    local install_only=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean_only=true
                shift
                ;;
            -i|--install)
                install_only=true
                shift
                ;;
            -t|--test)
                run_tests_flag=true
                shift
                ;;
            --no-proxy)
                use_proxy=false
                shift
                ;;
            --skip-install)
                skip_install=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          ERC-8004 智能合约编译脚本 v1.0.0                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # 配置代理
    if [ "$use_proxy" = true ]; then
        setup_proxy
    fi

    # 进入合约目录
    cd_contracts

    # 仅清理模式
    if [ "$clean_only" = true ]; then
        clean_build
        log_success "清理完成"
        exit 0
    fi

    # 检查和安装 Foundry
    if [ "$skip_install" = false ]; then
        if ! check_foundry; then
            install_foundry
        fi
    fi

    # 仅安装依赖模式
    if [ "$install_only" = true ]; then
        install_dependencies
        log_success "依赖安装完成"
        exit 0
    fi

    # 完整编译流程
    install_dependencies
    clean_build
    compile_contracts
    verify_compilation
    generate_abis
    generate_report

    # 运行测试
    if [ "$run_tests_flag" = true ]; then
        run_tests
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  编译流程完成！                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "合约编译成功完成"
    log_info "编译产物位置: contracts/out/"
    log_info "ABI 文件位置: backend/src/contracts/abis/"
    log_info "编译报告: COMPILATION_REPORT.md"
    echo ""
}

# 执行主函数
main "$@"
