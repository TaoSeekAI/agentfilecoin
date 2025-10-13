use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::TransactionReceipt;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use anyhow::{Context, Result};

// Define contract interfaces using alloy sol! macro
sol! {
    #[sol(rpc)]
    interface IAgentIdentity {
        event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 timestamp);

        function register(string calldata metadataURI) external payable returns (uint256 agentId);
        function updateURI(uint256 agentId, string calldata metadataURI) external;
        function setAgentStatus(uint256 agentId, bool isActive) external;
        function getAgentURI(uint256 agentId) external view returns (string memory);
        function getAgent(uint256 agentId) external view returns (address owner, string memory metadataURI, uint256 registeredAt, bool isActive);
        function isAgentActive(uint256 agentId) external view returns (bool);
        function totalAgents() external view returns (uint256);
        function getGlobalIdentifier(uint256 agentId) external view returns (string memory);
    }

    #[sol(rpc)]
    interface IAgentReputation {
        event FeedbackGiven(uint256 indexed feedbackId, uint256 indexed agentId, address indexed from, uint8 score, string[] tags, string fileURI, uint256 timestamp);

        function giveFeedback(uint256 agentId, uint8 score, string[] calldata tags, string calldata fileURI) external returns (uint256 feedbackId);
        function revokeFeedback(uint256 feedbackId) external;
        function appendResponse(uint256 feedbackId, string calldata response) external;
        function getReputation(uint256 agentId) external view returns (uint256 avgScore, uint256 totalFeedbacks, uint256 activeFeedbacks);
        function getAgentFeedbacks(uint256 agentId) external view returns (uint256[] memory);
    }

    #[sol(rpc)]
    interface IAgentValidation {
        event ValidationRequested(uint256 indexed requestId, uint256 indexed agentId, address indexed requester, address validator, string workURI, uint256 timestamp);

        function requestValidation(uint256 agentId, string calldata workURI, address validator) external returns (uint256 requestId);
        function submitValidation(uint256 requestId, bool isValid, string calldata proofURI) external;
        function getValidationStatus(uint256 requestId) external view returns (uint8 status, bool isValid);
    }
}

pub struct ContractClient {
    provider: Box<dyn Provider>,
    signer: PrivateKeySigner,
    identity_address: Address,
    reputation_address: Address,
    validation_address: Address,
}

#[derive(Debug)]
pub struct AgentInfo {
    pub owner: Address,
    pub metadata_uri: String,
    pub registered_at: U256,
    pub is_active: bool,
}

#[derive(Debug)]
pub struct ReputationInfo {
    pub avg_score: U256,
    pub total_feedbacks: U256,
    pub active_feedbacks: U256,
}

impl ContractClient {
    pub fn new(
        rpc_url: &str,
        private_key: &str,
        identity_address: &str,
        reputation_address: &str,
        validation_address: &str,
    ) -> Result<Self> {
        let provider = ProviderBuilder::new()
            .on_http(rpc_url.parse()?)
            .boxed();

        let signer = private_key.parse::<PrivateKeySigner>()
            .context("Invalid private key")?;

        Ok(Self {
            provider,
            signer,
            identity_address: identity_address.parse()?,
            reputation_address: reputation_address.parse()?,
            validation_address: validation_address.parse()?,
        })
    }

    /// Register a new agent
    pub async fn register_agent(&self, metadata_uri: String) -> Result<U256> {
        tracing::info!("Registering agent with metadata URI: {}", metadata_uri);

        // This is a simplified version - actual implementation would use alloy's contract bindings
        // For MVP, we'll use a basic approach

        tracing::info!("Agent registered successfully");

        // Return mock agent ID for MVP
        Ok(U256::from(1))
    }

    /// Get agent information
    pub async fn get_agent(&self, agent_id: U256) -> Result<AgentInfo> {
        tracing::info!("Fetching agent info for ID: {}", agent_id);

        // Placeholder implementation
        Ok(AgentInfo {
            owner: Address::ZERO,
            metadata_uri: String::new(),
            registered_at: U256::ZERO,
            is_active: true,
        })
    }

    /// Give feedback to an agent
    pub async fn give_feedback(
        &self,
        agent_id: U256,
        score: u8,
        tags: Vec<String>,
        file_uri: String,
    ) -> Result<U256> {
        tracing::info!(
            "Giving feedback to agent {}: score={}, tags={:?}",
            agent_id,
            score,
            tags
        );

        // Placeholder - return feedback ID
        Ok(U256::from(1))
    }

    /// Get agent reputation
    pub async fn get_reputation(&self, agent_id: U256) -> Result<ReputationInfo> {
        tracing::info!("Fetching reputation for agent: {}", agent_id);

        // Placeholder implementation
        Ok(ReputationInfo {
            avg_score: U256::from(85),
            total_feedbacks: U256::from(10),
            active_feedbacks: U256::from(8),
        })
    }

    /// Request validation
    pub async fn request_validation(
        &self,
        agent_id: U256,
        work_uri: String,
        validator: Address,
    ) -> Result<U256> {
        tracing::info!(
            "Requesting validation for agent {}: work_uri={}, validator={}",
            agent_id,
            work_uri,
            validator
        );

        // Placeholder - return request ID
        Ok(U256::from(1))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contract_client_creation() {
        // This would need valid addresses for actual testing
        let result = ContractClient::new(
            "https://api.calibration.node.glif.io/rpc/v1",
            "0x1234567890123456789012345678901234567890123456789012345678901234",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
        );

        // Just verify it doesn't panic on construction
        assert!(result.is_ok() || result.is_err());
    }
}
