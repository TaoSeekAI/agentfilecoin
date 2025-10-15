# Agent Identity Contract Integration with Alloy.rs

This document provides a comprehensive guide for using the AgentIdentity contract bindings generated with alloy.rs.

## Overview

The AgentIdentity contract allows for the registration and management of AI agents on the blockchain. This integration provides Rust bindings for interacting with the contract using alloy.rs.

## Quick Start

### Prerequisites

- Rust 1.90+ with nightly toolchain
- Filecoin network access (mainnet or testnet)
- AgentIdentity contract deployed on the network

### Installation

Add the following to your `Cargo.toml`:

```toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
anyhow = "1.0"
tokio = { version = "1.35", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

### Basic Usage

```rust
use agent_backend::{AgentContractService, ContractConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Create configuration
    let config = ContractConfig {
        rpc_url: "https://api.calibration.node.glif.io/rpc/v1".to_string(),
        private_key: "0x...".to_string(),
        identity_address: "0x...".to_string(),
    };

    // Create service
    let service = AgentContractService::new(config).await?;

    // Register a new agent
    let metadata_uri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json";
    let agent_id = service.register_agent(metadata_uri.to_string()).await?;
    println!("Agent registered with ID: {}", agent_id);

    Ok(())
}
```

## Contract Methods

### Agent Registration

#### `register_agent(metadata_uri: String) -> Result<String>`

Registers a new agent with the specified metadata URI.

```rust
let agent_id = service.register_agent("ipfs://...".to_string()).await?;
```

**Parameters:**
- `metadata_uri`: IPFS or HTTPS URI pointing to agent metadata JSON

**Returns:** Agent ID as string

### Agent Information

#### `get_agent_info(agent_id: String) -> Result<AgentInfo>`

Retrieves detailed information about an agent.

```rust
let agent_info = service.get_agent_info("123".to_string()).await?;
println!("Owner: {}", agent_info.owner);
println!("Metadata: {}", agent_info.metadata_uri);
println!("Registered: {}", agent_info.registered_at);
println!("Active: {}", agent_info.is_active);
```

**Returns:** `AgentInfo` struct containing owner, metadata URI, registration timestamp, and active status.

#### `get_agent_uri(agent_id: String) -> Result<String>`

Gets the metadata URI for an agent.

```rust
let uri = service.get_agent_uri("123".to_string()).await?;
```

#### `is_agent_active(agent_id: String) -> Result<bool>`

Checks if an agent is active.

```rust
let active = service.is_agent_active("123".to_string()).await?;
```

#### `get_global_identifier(agent_id: String) -> Result<String>`

Gets the global identifier in format: `eip155:chainId:contractAddress:tokenId`.

```rust
let global_id = service.get_global_identifier("123".to_string()).await?;
```

### Agent Management

#### `update_agent_status(agent_id: String, is_active: bool) -> Result<String>`

Updates an agent's active status.

```rust
let tx_hash = service.update_agent_status("123".to_string(), false).await?;
```

#### `update_agent_uri(agent_id: String, metadata_uri: String) -> Result<String>`

Updates an agent's metadata URI.

```rust
let tx_hash = service.update_agent_uri("123".to_string(), "ipfs://...".to_string()).await?;
```

### Query Methods

#### `get_owned_agents() -> Result<Vec<String>>`

Gets all agents owned by the current signer.

```rust
let owned_agents = service.get_owned_agents().await?;
```

#### `get_total_agents() -> Result<String>`

Gets the total number of registered agents.

```rust
let total = service.get_total_agents().await?;
```

#### `get_contract_owner() -> Result<String>`

Gets the contract owner address.

```rust
let owner = service.get_contract_owner().await?;
```

#### `get_registration_fee() -> Result<String>`

Gets the current registration fee.

```rust
let fee = service.get_registration_fee().await?;
```

## Data Structures

### `AgentInfo`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub owner: Address,
    pub metadata_uri: String,
    pub registered_at: U256,
    pub is_active: bool,
}
```

### `RegisterOptions`

```rust
#[derive(Debug, Clone)]
pub struct RegisterOptions {
    pub metadata_uri: String,
    pub value: Option<U256>, // Registration fee
}
```

### `StatusUpdateOptions`

```rust
#[derive(Debug, Clone)]
pub struct StatusUpdateOptions {
    pub agent_id: U256,
    pub is_active: bool,
}
```

### `UriUpdateOptions`

```rust
#[derive(Debug, Clone)]
pub struct UriUpdateOptions {
    pub agent_id: U256,
    pub metadata_uri: String,
}
```

## Error Handling

All methods return `Result<T, Error>` and use `anyhow` for error handling:

```rust
match service.register_agent(metadata_uri).await {
    Ok(agent_id) => println!("Agent registered: {}", agent_id),
    Err(error) => {
        tracing::error!("Failed to register agent: {}", error);
        // Handle error appropriately
    }
}
```

## Logging and Tracing

The service uses `tracing` for detailed logging:

```rust
// Enable tracing
tracing_subscriber::fmt::init();

// Or configure with environment variable
// RUST_LOG=info cargo run
```

## Configuration

### `ContractConfig`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractConfig {
    pub rpc_url: String,
    pub private_key: String,
    pub identity_address: String,
}
```

**Configuration Options:**
- `rpc_url`: Filecoin network RPC endpoint
- `private_key`: Private key for transaction signing
- `identity_address`: Deployed AgentIdentity contract address

## Environment Variables

For security, store sensitive information in environment variables:

```bash
export PRIVATE_KEY="0x..."
export RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
export CONTRACT_ADDRESS="0x..."
```

## Network Configuration

### Filecoin Calibration Testnet

```rust
let config = ContractConfig {
    rpc_url: "https://api.calibration.node.glif.io/rpc/v1".to_string(),
    // ... other fields
};
```

### Filecoin Mainnet

```rust
let config = ContractConfig {
    rpc_url: "https://api.node.glif.io".to_string(),
    // ... other fields
};
```

## Best Practices

1. **Error Handling**: Always handle `Result` types properly
2. **Logging**: Use tracing for debugging and monitoring
3. **Security**: Never commit private keys to version control
4. **Testing**: Test on testnet before mainnet deployment
5. **Gas Management**: Monitor gas prices and adjust accordingly

## Event Handling

The contract emits the following events:

- `AgentRegistered`: When a new agent is registered
- `AgentStatusChanged`: When agent status changes
- `AgentURIUpdated`: When agent metadata URI is updated

## Troubleshooting

### Common Issues

1. **Transaction Reverted**: Check gas price and nonce
2. **Invalid Private Key**: Verify key format and permissions
3. **Network Errors**: Check RPC endpoint availability
4. **Contract Not Found**: Verify contract address

### Debugging

Enable verbose logging:
```bash
RUST_LOG=debug cargo run
```

Check transaction receipts:
```rust
let receipt = service.register_agent(metadata_uri).await?;
println!("Transaction hash: {:?}", receipt.transaction_hash);
```

## Advanced Usage

### Batch Operations

For multiple operations, consider batching for efficiency:

```rust
// Example: Register multiple agents
let mut agent_ids = Vec::new();
for metadata_uri in metadata_uris {
    let agent_id = service.register_agent(metadata_uri).await?;
    agent_ids.push(agent_id);
}
```

### Custom Signers

Implement custom signer for advanced use cases:

```rust
use alloy::signers::Signer;

struct CustomSigner {
    // Custom implementation
}

impl Signer for CustomSigner {
    // Implement required methods
}
```

## Testing

Run the example:
```bash
cargo run --example agent_example
```

Unit tests are included in each module:
```bash
cargo test
```

## License

MIT