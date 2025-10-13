.PHONY: help build test clean deploy

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: build-contracts build-backend ## Build all components

build-contracts: ## Build smart contracts
	@echo "Building smart contracts..."
	cd contracts && forge build

build-backend: ## Build Rust backend
	@echo "Building backend..."
	cd backend && cargo build --release

test: test-contracts test-backend ## Run all tests

test-contracts: ## Run contract tests
	@echo "Testing smart contracts..."
	cd contracts && forge test -vvv

test-backend: ## Run backend tests
	@echo "Testing backend..."
	cd backend && cargo test

clean: ## Clean build artifacts
	@echo "Cleaning..."
	cd contracts && forge clean
	cd backend && cargo clean

install: ## Install CLI tool
	@echo "Installing agent-cli..."
	cd backend && cargo install --path .

deploy-calibration: ## Deploy to Calibration testnet
	@echo "Deploying to Calibration..."
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Error: PRIVATE_KEY not set"; \
		exit 1; \
	fi
	cd contracts && forge script script/Deploy.s.sol \
		--rpc-url https://api.calibration.node.glif.io/rpc/v1 \
		--private-key $$PRIVATE_KEY \
		--broadcast

deploy-mainnet: ## Deploy to Mainnet (use with caution)
	@echo "WARNING: Deploying to Mainnet!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd contracts && forge script script/Deploy.s.sol \
			--rpc-url https://api.node.glif.io/rpc/v1 \
			--private-key $$PRIVATE_KEY \
			--broadcast; \
	fi

format: ## Format code
	@echo "Formatting Solidity..."
	cd contracts && forge fmt
	@echo "Formatting Rust..."
	cd backend && cargo fmt

lint: ## Lint code
	@echo "Linting Rust..."
	cd backend && cargo clippy -- -D warnings

doc: ## Generate documentation
	@echo "Generating Rust docs..."
	cd backend && cargo doc --no-deps --open

example: ## Run example commands
	@echo "Example: Register agent"
	@echo "agent-cli register --name 'Test Agent' --description 'A test agent' --mcp-endpoint 'mcp://localhost:3000'"
	@echo ""
	@echo "Example: Query agent"
	@echo "agent-cli query --agent-id 1"
	@echo ""
	@echo "Example: Give feedback"
	@echo "agent-cli feedback --agent-id 1 --score 85 --tags 'helpful,fast' --message 'Great!'"
	@echo ""
	@echo "Example: Test MCP"
	@echo "agent-cli mcp-test --tool calculator --args '{\"operation\":\"add\",\"a\":5,\"b\":3}'"
