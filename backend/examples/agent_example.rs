use agent_backend::{AgentContractService, ContractConfig};
use anyhow::Result;
use std::env;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing for logging
    tracing_subscriber::fmt::init();

    // Example configuration - replace with your actual values
    let config = ContractConfig {
        rpc_url: "https://api.calibration.node.glif.io/rpc/v1".to_string(), // Filecoin calibration testnet
        private_key: env::var("PRIVATE_KEY")?, // Your private key
        identity_address: "0xYourContractAddress".to_string(), // Your deployed contract address
    };

    // Create the contract service
    let service = AgentContractService::new(config).await?;

    // Example 1: Register a new agent
    println!("Registering a new agent...");
    let metadata_uri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json";
    let agent_id = service.register_agent(metadata_uri.to_string()).await?;
    println!("Agent registered with ID: {}", agent_id);

    // Example 2: Get agent information
    println!("\nGetting agent information...");
    let agent_info = service.get_agent_info(agent_id.clone()).await?;
    println!("Agent owner: {}", agent_info.owner);
    println!("Agent metadata URI: {}", agent_info.metadata_uri);
    println!("Registered at: {}", agent_info.registered_at);
    println!("Is active: {}", agent_info.is_active);

    // Example 3: Update agent status
    println!("\nUpdating agent status to inactive...");
    let tx_hash = service.update_agent_status(agent_id.clone(), false).await?;
    println!("Status updated. Transaction hash: {}", tx_hash);

    // Example 4: Update agent metadata URI
    println!("\nUpdating agent metadata URI...");
    let new_uri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/updated.json";
    let tx_hash = service.update_agent_uri(agent_id.clone(), new_uri.to_string()).await?;
    println!("URI updated. Transaction hash: {}", tx_hash);

    // Example 5: Get agent URI
    println!("\nGetting updated agent URI...");
    let uri = service.get_agent_uri(agent_id.clone()).await?;
    println!("Agent URI: {}", uri);

    // Example 6: Check if agent is active
    println!("\nChecking if agent is active...");
    let is_active = service.is_agent_active(agent_id.clone()).await?;
    println!("Is active: {}", is_active);

    // Example 7: Get global identifier
    println!("\nGetting global identifier...");
    let global_id = service.get_global_identifier(agent_id.clone()).await?;
    println!("Global identifier: {}", global_id);

    // Example 8: Get owned agents
    println!("\nGetting owned agents...");
    let owned_agents = service.get_owned_agents().await?;
    println!("Owned agents: {:?}", owned_agents);

    // Example 9: Get total agents
    println!("\nGetting total agents...");
    let total = service.get_total_agents().await?;
    println!("Total agents: {}", total);

    // Example 10: Get contract info
    println!("\nGetting contract info...");
    let owner = service.get_contract_owner().await?;
    println!("Contract owner: {}", owner);

    let fee = service.get_registration_fee().await?;
    println!("Registration fee: {} wei", fee);

    Ok(())
}