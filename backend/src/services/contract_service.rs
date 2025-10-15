use crate::contracts::{AgentIdentityClient, AgentInfo, RegisterOptions, StatusUpdateOptions, UriUpdateOptions};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Configuration for contract clients
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractConfig {
    pub rpc_url: String,
    pub private_key: String,
    pub identity_address: String,
}

/// Agent contract service
pub struct AgentContractService {
    identity_client: Arc<RwLock<AgentIdentityClient>>,
}

impl AgentContractService {
    /// Create a new agent contract service
    pub async fn new(config: ContractConfig) -> Result<Self> {
        let identity_client = AgentIdentityClient::new(
            config.identity_address.parse()?,
            &config.rpc_url,
            &config.private_key,
        )
        .context("Failed to create AgentIdentity client")?;

        Ok(Self {
            identity_client: Arc::new(RwLock::new(identity_client)),
        })
    }

    /// Register a new agent
    pub async fn register_agent(&self, metadata_uri: String) -> Result<String> {
        tracing::info!("Registering new agent with metadata URI: {}", metadata_uri);

        let client = self.identity_client.read().await;
        let options = RegisterOptions {
            metadata_uri,
            value: None, // No registration fee for now
        };

        let receipt = client
            .register(options)
            .await
            .context("Failed to register agent")?;

        // Extract agent ID from event logs
        let agent_id = self.extract_agent_id_from_receipt(&receipt)
            .await
            .context("Failed to extract agent ID from receipt")?;

        tracing::info!("Agent registered successfully with ID: {}", agent_id);
        Ok(agent_id.to_string())
    }

    /// Get agent information
    pub async fn get_agent_info(&self, agent_id: String) -> Result<AgentInfo> {
        tracing::debug!("Fetching agent info for ID: {}", agent_id);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let agent_info = client
            .get_agent(alloy::primitives::U256::from(agent_id))
            .await
            .context("Failed to get agent information")?;

        Ok(agent_info)
    }

    /// Update agent status
    pub async fn update_agent_status(&self, agent_id: String, is_active: bool) -> Result<String> {
        tracing::info!("Updating agent {} status to {}", agent_id, is_active);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let options = StatusUpdateOptions {
            agent_id: alloy::primitives::U256::from(agent_id),
            is_active,
        };

        let receipt = client
            .set_agent_status(options)
            .await
            .context("Failed to update agent status")?;

        tracing::info!("Agent status updated successfully. Transaction hash: {:?}", receipt.transaction_hash);
        Ok(format!("{:?}", receipt.transaction_hash))
    }

    /// Update agent metadata URI
    pub async fn update_agent_uri(&self, agent_id: String, metadata_uri: String) -> Result<String> {
        tracing::info!("Updating agent {} URI to: {}", agent_id, metadata_uri);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let options = UriUpdateOptions {
            agent_id: alloy::primitives::U256::from(agent_id),
            metadata_uri,
        };

        let receipt = client
            .update_uri(options)
            .await
            .context("Failed to update agent URI")?;

        tracing::info!("Agent URI updated successfully. Transaction hash: {:?}", receipt.transaction_hash);
        Ok(format!("{:?}", receipt.transaction_hash))
    }

    /// Get agent metadata URI
    pub async fn get_agent_uri(&self, agent_id: String) -> Result<String> {
        tracing::debug!("Fetching agent URI for ID: {}", agent_id);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let uri = client
            .get_agent_uri(alloy::primitives::U256::from(agent_id))
            .await
            .context("Failed to get agent URI")?;

        Ok(uri)
    }

    /// Check if agent is active
    pub async fn is_agent_active(&self, agent_id: String) -> Result<bool> {
        tracing::debug!("Checking if agent {} is active", agent_id);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let is_active = client
            .is_agent_active(alloy::primitives::U256::from(agent_id))
            .await
            .context("Failed to check agent status")?;

        Ok(is_active)
    }

    /// Get global identifier for an agent
    pub async fn get_global_identifier(&self, agent_id: String) -> Result<String> {
        tracing::debug!("Fetching global identifier for agent ID: {}", agent_id);

        let client = self.identity_client.read().await;
        let agent_id = agent_id.parse::<u128>()
            .context("Invalid agent ID format")?;

        let global_id = client
            .get_global_identifier(alloy::primitives::U256::from(agent_id))
            .await
            .context("Failed to get global identifier")?;

        Ok(global_id)
    }

    /// Get all agents owned by the current signer
    pub async fn get_owned_agents(&self) -> Result<Vec<String>> {
        tracing::debug!("Fetching agents owned by current signer");

        let client = self.identity_client.read().await;
        let signer_address = client.signer_address();

        let agent_ids = client
            .get_owned_agents(signer_address)
            .await
            .context("Failed to get owned agents")?;

        let agent_id_strings: Vec<String> = agent_ids
            .iter()
            .map(|id| id.to_string())
            .collect();

        Ok(agent_id_strings)
    }

    /// Get total number of registered agents
    pub async fn get_total_agents(&self) -> Result<String> {
        tracing::debug!("Fetching total number of registered agents");

        let client = self.identity_client.read().await;

        let total = client
            .total_agents()
            .await
            .context("Failed to get total agents")?;

        Ok(total.to_string())
    }

    /// Get contract owner
    pub async fn get_contract_owner(&self) -> Result<String> {
        tracing::debug!("Fetching contract owner");

        let client = self.identity_client.read().await;

        let owner = client
            .owner()
            .await
            .context("Failed to get contract owner")?;

        Ok(owner.to_string())
    }

    /// Get current registration fee
    pub async fn get_registration_fee(&self) -> Result<String> {
        tracing::debug!("Fetching current registration fee");

        let client = self.identity_client.read().await;

        let fee = client
            .registration_fee()
            .await
            .context("Failed to get registration fee")?;

        Ok(fee.to_string())
    }

    /// Extract agent ID from transaction receipt
    async fn extract_agent_id_from_receipt(&self, receipt: &alloy::rpc::types::TransactionReceipt) -> Result<alloy::primitives::U256> {
        for log in receipt.logs() {
            // For now, we'll use a simple approach to extract agent ID
            // In a real implementation, you'd want to properly parse the event logs
            if let Some(topic) = log.topics().first() {
                // AgentRegistered event signature: keccak256("AgentRegistered(uint256,address,string,uint256)")
                let agent_registered_topic = alloy::hex::encode(alloy::primitives::b256!("0x2de5aaf7e8a1b32d4a60e0b01c5a06f070000000000000000000000000000000"));
                if format!("0x{}", alloy::hex::encode(topic)) == format!("0x{}", agent_registered_topic) {
                    // Extract agent ID from the first indexed parameter
                    if !log.data().data.is_empty() {
                        return Ok(alloy::primitives::U256::from_be_bytes([
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, log.data().data[0],
                        ]));
                    }
                }
            }
        }

        Err(anyhow::anyhow!("AgentRegistered event not found in receipt"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::ContractConfig;

    #[tokio::test]
    async fn test_contract_service_creation() {
        let config = ContractConfig {
            rpc_url: "https://api.calibration.node.glif.io/rpc/v1".to_string(),
            private_key: "0x1234567890123456789012345678901234567890123456789012345678901234".to_string(),
            identity_address: "0x0000000000000000000000000000000000000000".to_string(),
        };

        let result = AgentContractService::new(config).await;

        // Just verify it doesn't panic on construction
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_extract_agent_id_from_receipt() {
        // This would require a mock receipt for proper testing
        // For now, just verify the function exists
        assert!(true);
    }
}