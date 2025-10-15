use alloy::primitives::{Address, U256};
use alloy::sol;
use alloy::providers::{Provider, ProviderBuilder, DynProvider};
use alloy::rpc::types::TransactionReceipt;
use alloy::signers::local::PrivateKeySigner;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// Define the AgentIdentity contract interface using alloy's sol! macro
sol! {
    #[sol(rpc)]
    contract AgentIdentity {
        event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 timestamp);
        event AgentStatusChanged(uint256 indexed agentId, bool indexed isActive, uint256 timestamp);
        event AgentURIUpdated(uint256 indexed agentId, string oldURI, string newURI, uint256 timestamp);

        function getAgent(uint256 agentId) external view returns (address owner, string memory metadataURI, uint256 registeredAt, bool isActive);
        function getAgentURI(uint256 agentId) external view returns (string memory);
        function getGlobalIdentifier(uint256 agentId) external view returns (string memory);
        function getOwnedAgents(address ownerAddress) external view returns (uint256[] memory);
        function isAgentActive(uint256 agentId) external view returns (bool);
        function owner() external view returns (address);
        function register(string calldata metadataURI) external payable returns (uint256 agentId);
        function registrationFee() external view returns (uint256);
        function setAgentStatus(uint256 agentId, bool isActive) external;
        function setRegistrationFee(uint256 newFee) external;
        function totalAgents() external view returns (uint256);
        function updateURI(uint256 agentId, string calldata metadataURI) external;
        function withdrawFees() external;
    }
}

/// Agent information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub owner: Address,
    pub metadata_uri: String,
    pub registered_at: U256,
    pub is_active: bool,
}

/// Agent registration options
#[derive(Debug, Clone)]
pub struct RegisterOptions {
    pub metadata_uri: String,
    pub value: Option<U256>, // Registration fee
}

/// Agent status update options
#[derive(Debug, Clone)]
pub struct StatusUpdateOptions {
    pub agent_id: U256,
    pub is_active: bool,
}

/// Agent URI update options
#[derive(Debug, Clone)]
pub struct UriUpdateOptions {
    pub agent_id: U256,
    pub metadata_uri: String,
}

/// AgentIdentity contract client
pub struct AgentIdentityClient {
    contract: AgentIdentity::AgentIdentityInstance<DynProvider>,
    signer: Arc<PrivateKeySigner>,
    contract_address: Address,
}

impl AgentIdentityClient {
    /// Create a new AgentIdentity client
    pub fn new(
        contract_address: Address,
        rpc_url: &str,
        private_key: &str,
    ) -> Result<Self> {
        let signer = Arc::new(private_key.parse::<PrivateKeySigner>()
            .context("Invalid private key")?);

        // Create a basic HTTP provider
        let provider = ProviderBuilder::new()
            .connect_http(rpc_url.parse().context("Invalid RPC URL")?);

        let contract = AgentIdentity::new(
            contract_address,
            provider.erased(),
        );

        Ok(Self {
            contract,
            signer,
            contract_address,
        })
    }

    /// Get the contract address
    pub fn address(&self) -> Address {
        self.contract_address
    }

    /// Get the signer address
    pub fn signer_address(&self) -> Address {
        self.signer.address()
    }

    /// Register a new agent
    pub async fn register(&self, options: RegisterOptions) -> Result<TransactionReceipt> {
        tracing::info!("Registering agent with metadata URI: {}", options.metadata_uri);

        let call = self.contract.register(options.metadata_uri);

        let call = if let Some(value) = options.value {
            call.value(value)
        } else {
            call
        };

        let pending_tx = call
            .from(self.signer.address()) // Use the signer address
            .send()
            .await
            .context("Failed to send register transaction")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("Failed to get transaction receipt")?;

        tracing::info!("Agent registered successfully. Transaction hash: {:?}", receipt.transaction_hash);

        Ok(receipt)
    }

    /// Get agent information
    pub async fn get_agent(&self, agent_id: U256) -> Result<AgentInfo> {
        tracing::debug!("Fetching agent info for ID: {}", agent_id);

        let result = self.contract
            .getAgent(agent_id)
            .call()
            .await
            .context("Failed to get agent information")?;

        Ok(AgentInfo {
            owner: result.owner,
            metadata_uri: result.metadataURI,
            registered_at: result.registeredAt,
            is_active: result.isActive,
        })
    }

    /// Get agent metadata URI
    pub async fn get_agent_uri(&self, agent_id: U256) -> Result<String> {
        tracing::debug!("Fetching agent URI for ID: {}", agent_id);

        let uri = self.contract
            .getAgentURI(agent_id)
            .call()
            .await
            .context("Failed to get agent URI")?;

        Ok(uri)
    }

    /// Get global identifier for an agent
    pub async fn get_global_identifier(&self, agent_id: U256) -> Result<String> {
        tracing::debug!("Fetching global identifier for agent ID: {}", agent_id);

        let global_id = self.contract
            .getGlobalIdentifier(agent_id)
            .call()
            .await
            .context("Failed to get global identifier")?;

        Ok(global_id)
    }

    /// Get all agents owned by an address
    pub async fn get_owned_agents(&self, owner_address: Address) -> Result<Vec<U256>> {
        tracing::debug!("Fetching agents owned by: {}", owner_address);

        let agent_ids = self.contract
            .getOwnedAgents(owner_address)
            .call()
            .await
            .context("Failed to get owned agents")?;

        Ok(agent_ids.to_vec())
    }

    /// Check if an agent is active
    pub async fn is_agent_active(&self, agent_id: U256) -> Result<bool> {
        tracing::debug!("Checking if agent {} is active", agent_id);

        let is_active = self.contract
            .isAgentActive(agent_id)
            .call()
            .await
            .context("Failed to check agent status")?;

        Ok(is_active)
    }

    /// Get the contract owner
    pub async fn owner(&self) -> Result<Address> {
        tracing::debug!("Fetching contract owner");

        let owner = self.contract
            .owner()
            .call()
            .await
            .context("Failed to get contract owner")?;

        Ok(owner)
    }

    /// Get the current registration fee
    pub async fn registration_fee(&self) -> Result<U256> {
        tracing::debug!("Fetching registration fee");

        let fee = self.contract
            .registrationFee()
            .call()
            .await
            .context("Failed to get registration fee")?;

        Ok(fee)
    }

    /// Update agent status (active/inactive)
    pub async fn set_agent_status(&self, options: StatusUpdateOptions) -> Result<TransactionReceipt> {
        tracing::info!("Setting agent {} status to {}", options.agent_id, options.is_active);

        let pending_tx = self.contract
            .setAgentStatus(options.agent_id, options.is_active)
            .from(self.signer.address()) // Use the signer address
            .send()
            .await
            .context("Failed to send setAgentStatus transaction")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("Failed to get transaction receipt")?;

        tracing::info!("Agent status updated successfully. Transaction hash: {:?}", receipt.transaction_hash);

        Ok(receipt)
    }

    /// Set new registration fee (owner only)
    pub async fn set_registration_fee(&self, new_fee: U256) -> Result<TransactionReceipt> {
        tracing::info!("Setting new registration fee: {}", new_fee);

        let pending_tx = self.contract
            .setRegistrationFee(new_fee)
            .from(self.signer.address()) // Use the signer address
            .send()
            .await
            .context("Failed to send setRegistrationFee transaction")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("Failed to get transaction receipt")?;

        tracing::info!("Registration fee updated successfully. Transaction hash: {:?}", receipt.transaction_hash);

        Ok(receipt)
    }

    /// Get total number of registered agents
    pub async fn total_agents(&self) -> Result<U256> {
        tracing::debug!("Fetching total number of agents");

        let total = self.contract
            .totalAgents()
            .call()
            .await
            .context("Failed to get total agents")?;

        Ok(total)
    }

    /// Update agent metadata URI
    pub async fn update_uri(&self, options: UriUpdateOptions) -> Result<TransactionReceipt> {
        tracing::info!("Updating URI for agent {}: {}", options.agent_id, options.metadata_uri);

        let pending_tx = self.contract
            .updateURI(options.agent_id, options.metadata_uri)
            .from(self.signer.address()) // Use the signer address
            .send()
            .await
            .context("Failed to send updateURI transaction")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("Failed to get transaction receipt")?;

        tracing::info!("Agent URI updated successfully. Transaction hash: {:?}", receipt.transaction_hash);

        Ok(receipt)
    }

    /// Withdraw collected fees (owner only)
    pub async fn withdraw_fees(&self) -> Result<TransactionReceipt> {
        tracing::info!("Withdrawing collected fees");

        let pending_tx = self.contract
            .withdrawFees()
            .from(self.signer.address()) // Use the signer address
            .send()
            .await
            .context("Failed to send withdrawFees transaction")?;

        let receipt = pending_tx
            .get_receipt()
            .await
            .context("Failed to get transaction receipt")?;

        tracing::info!("Fees withdrawn successfully. Transaction hash: {:?}", receipt.transaction_hash);

        Ok(receipt)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_info_creation() {
        let agent_info = AgentInfo {
            owner: Address::ZERO,
            metadata_uri: "ipfs://test".to_string(),
            registered_at: U256::from(1234567890),
            is_active: true,
        };

        assert_eq!(agent_info.metadata_uri, "ipfs://test");
        assert_eq!(agent_info.registered_at, U256::from(1234567890));
        assert!(agent_info.is_active);
    }

    #[test]
    fn test_register_options_creation() {
        let options = RegisterOptions {
            metadata_uri: "ipfs://test-metadata".to_string(),
            value: Some(U256::from(1000000000000000000u64)), // 1 ETH
        };

        assert_eq!(options.metadata_uri, "ipfs://test-metadata");
        assert!(options.value.is_some());
        assert_eq!(options.value.unwrap(), U256::from(1000000000000000000u64));
    }

    #[test]
    fn test_status_update_options_creation() {
        let options = StatusUpdateOptions {
            agent_id: U256::from(123),
            is_active: false,
        };

        assert_eq!(options.agent_id, U256::from(123));
        assert!(!options.is_active);
    }

    #[test]
    fn test_uri_update_options_creation() {
        let options = UriUpdateOptions {
            agent_id: U256::from(456),
            metadata_uri: "ipfs://new-metadata".to_string(),
        };

        assert_eq!(options.agent_id, U256::from(456));
        assert_eq!(options.metadata_uri, "ipfs://new-metadata");
    }
}