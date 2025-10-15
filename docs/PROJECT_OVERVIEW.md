# 项目结构与技术栈概览

本文档旨在提供对 `vibe-kanban` 项目的高层次概览，包括其主要组件、技术栈和目录结构。

## 1. 项目目标

该项目旨在实现一个基于 **ERC-8004** 标准的去中心化 AI Agent 系统，该系统运行在 **Filecoin** 网络上。它结合了智能合约、去中心化存储和后端服务，以提供一个完整的 Agent 注册、声誉和验证框架。

## 2. 核心组件

项目主要由三个独立但相互关联的组件构成：

### a. `contracts` - 智能合约

此目录包含了项目的链上逻辑，使用 Solidity 编写，并利用 Foundry 框架进行开发、测试和部署。

- **技术栈**: Solidity, Foundry
- **功能**:
    - **AgentIdentity**: 基于 ERC-721 的 Agent 身份注册与管理。
    - **AgentReputation**: Agent 的声誉系统，用于收集和聚合反馈。
    - **AgentValidation**: Agent 的工作验证机制。
- **网络**: 主要面向 Filecoin EVM (包括 Calibration 测试网和主网)。

### b. `backend` - 后端服务与 CLI

这是项目的核心业务逻辑层，使用 Rust 实现。它既是一个后端服务，也提供了一个功能丰富的命令行工具 (`agent-cli`)。

- **技术栈**: Rust, Tokio, Alloy, Clap
- **功能**:
    - 与部署在 Filecoin EVM 上的智能合约进行交互。
    - 通过 IPFS 和 Lighthouse API 管理双层存储（IPFS 用于快速检索，Filecoin 用于持久化）。
    - 提供 `agent-cli` 工具，用于 Agent 注册、查询、提交反馈等所有核心操作。
    - 集成了模型上下文协议 (MCP) 的客户端部分。

### c. `mcp-server` - MCP 工具服务器

这是一个独立的 Node.js 服务器，用于实现和暴露 MCP (Model Context Protocol) 工具。Agent 可以通过这个服务器提供具体的功能（如计算、信息查询等）。

- **技术栈**: Node.js, TypeScript, Express.js (推断)
- **功能**:
    - 实现 MCP 规范，为 AI Agent 提供可调用的工具。
    - 与 `backend` 服务解耦，可以独立部署和扩展。

## 3. 目录结构概览

```
/
├── backend/         # Rust 后端服务和 CLI 工具
│   ├── src/
│   └── Cargo.toml   # Rust 依赖管理
├── contracts/       # Solidity 智能合约
│   ├── src/         # 合约源码
│   ├── script/      # 部署脚本
│   └── foundry.toml # Foundry 配置
├── mcp-server/      # Node.js MCP 工具服务器
│   ├── src/
│   └── package.json # Node.js 依赖管理
├── docs/            # 项目文档
├── scripts/         # 辅助脚本 (如部署、上传)
└── README.md        # 项目主入口文档
```

## 4. 交互流程

1.  **用户** 通过 `agent-cli` (由 `backend` 提供) 发起一个操作，例如注册一个新的 Agent。
2.  `backend` 服务将 Agent 的元数据上传到 **IPFS**，并通过 **Lighthouse** 将其 Pin 到 **Filecoin** 以实现持久化存储。
3.  `backend` 服务调用 **Filecoin EVM** 上的 `AgentIdentity` 智能合约，将元数据的 CID 和其他信息注册上链。
4.  当需要与 Agent 的工具交互时，请求将被路由到 `mcp-server`，该服务器执行相应工具并返回结果。

这个架构利用了不同技术的优势，形成了一个功能完备的去中心化应用。
