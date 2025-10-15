#!/bin/bash

###############################################################################
# Foundry 安装脚本
# 支持代理环境和离线安装
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置代理
setup_proxy() {
    log_info "配置代理环境..."
    export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
    export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"

    if curl -I -s --connect-timeout 5 https://www.google.com > /dev/null 2>&1; then
        log_success "代理连接成功"
        return 0
    else
        log_warn "代理连接失败"
        unset http_proxy https_proxy
        return 1
    fi
}

# 方法 1: 使用官方安装脚本
install_via_official() {
    log_info "方法 1: 使用官方脚本安装 Foundry..."

    if curl -L https://foundry.paradigm.xyz | bash; then
        log_success "Foundry 安装脚本下载成功"

        # 运行 foundryup
        if command -v foundryup &> /dev/null; then
            foundryup
        elif [ -f "$HOME/.foundry/bin/foundryup" ]; then
            "$HOME/.foundry/bin/foundryup"
        else
            log_error "找不到 foundryup 命令"
            return 1
        fi

        # 添加到 PATH
        if ! grep -q '.foundry/bin' "$HOME/.bashrc"; then
            echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> "$HOME/.bashrc"
        fi

        export PATH="$HOME/.foundry/bin:$PATH"

        log_success "Foundry 安装完成"
        return 0
    else
        log_error "官方脚本安装失败"
        return 1
    fi
}

# 方法 2: 使用预编译二进制文件
install_via_binary() {
    log_info "方法 2: 下载预编译二进制文件..."

    local arch=$(uname -m)
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')

    case "$os" in
        linux)
            case "$arch" in
                x86_64) local platform="linux-amd64" ;;
                aarch64) local platform="linux-arm64" ;;
                *) log_error "不支持的架构: $arch"; return 1 ;;
            esac
            ;;
        darwin)
            case "$arch" in
                x86_64) local platform="darwin-amd64" ;;
                arm64) local platform="darwin-arm64" ;;
                *) log_error "不支持的架构: $arch"; return 1 ;;
            esac
            ;;
        *)
            log_error "不支持的操作系统: $os"
            return 1
            ;;
    esac

    local install_dir="$HOME/.foundry/bin"
    mkdir -p "$install_dir"

    # 下载最新版本
    local version=$(curl -s https://api.github.com/repos/foundry-rs/foundry/releases/latest | grep '"tag_name"' | cut -d'"' -f4)

    if [ -z "$version" ]; then
        log_warn "无法获取最新版本，使用默认版本"
        version="nightly"
    fi

    local base_url="https://github.com/foundry-rs/foundry/releases/download/${version}"

    local tools=("forge" "cast" "anvil" "chisel")

    for tool in "${tools[@]}"; do
        log_info "下载 $tool..."
        if curl -L -o "$install_dir/$tool" "${base_url}/foundry_${version}_${platform}.tar.gz"; then
            chmod +x "$install_dir/$tool"
            log_success "$tool 安装成功"
        else
            log_warn "$tool 下载失败"
        fi
    done

    export PATH="$install_dir:$PATH"
    return 0
}

# 方法 3: 从源码编译（需要 Rust）
install_from_source() {
    log_info "方法 3: 从源码编译 Foundry..."

    # 检查 Rust
    if ! command -v cargo &> /dev/null; then
        log_error "需要先安装 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        return 1
    fi

    # 克隆仓库
    local tmp_dir=$(mktemp -d)
    cd "$tmp_dir"

    if git clone https://github.com/foundry-rs/foundry.git; then
        cd foundry
        cargo build --release --bins

        # 安装到系统
        local install_dir="$HOME/.foundry/bin"
        mkdir -p "$install_dir"

        cp target/release/{forge,cast,anvil,chisel} "$install_dir/"

        log_success "从源码编译完成"
        cd -
        rm -rf "$tmp_dir"
        return 0
    else
        log_error "克隆仓库失败"
        cd -
        rm -rf "$tmp_dir"
        return 1
    fi
}

# 验证安装
verify_installation() {
    log_info "验证 Foundry 安装..."

    local tools=("forge" "cast" "anvil" "chisel")
    local all_installed=true

    for tool in "${tools[@]}"; do
        if command -v $tool &> /dev/null; then
            local version=$($tool --version 2>&1 | head -1 || echo "unknown")
            log_success "✓ $tool: $version"
        else
            log_error "✗ $tool 未找到"
            all_installed=false
        fi
    done

    if [ "$all_installed" = true ]; then
        log_success "所有 Foundry 工具已正确安装"
        return 0
    else
        log_error "部分工具安装失败"
        return 1
    fi
}

# 主函数
main() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Foundry 安装脚本 v1.0.0                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # 配置代理
    setup_proxy

    # 检查是否已安装
    if command -v forge &> /dev/null; then
        log_info "Foundry 已安装"
        verify_installation
        exit 0
    fi

    # 尝试不同的安装方法
    log_info "开始安装 Foundry..."

    if install_via_official; then
        log_success "使用官方脚本安装成功"
    elif install_via_binary; then
        log_success "使用预编译二进制安装成功"
    elif install_from_source; then
        log_success "从源码编译安装成功"
    else
        log_error "所有安装方法均失败"
        log_info "请手动访问 https://book.getfoundry.sh/getting-started/installation 获取帮助"
        exit 1
    fi

    # 验证安装
    if verify_installation; then
        echo ""
        log_success "Foundry 安装完成！"
        echo ""
        log_info "请运行以下命令使配置生效:"
        echo "  source ~/.bashrc"
        echo ""
        log_info "或者重新打开终端"
    else
        log_error "安装验证失败"
        exit 1
    fi
}

main "$@"
