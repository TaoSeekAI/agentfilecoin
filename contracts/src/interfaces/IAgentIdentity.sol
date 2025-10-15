// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IAgentIdentity
 * @notice Interface for ERC-8004 Agent Identity Registry
 * @dev Manages agent registration and identity as ERC-721 tokens
 */
interface IAgentIdentity {
    /// @notice Emitted when a new agent is registered
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string metadataURI,
        uint256 timestamp
    );

    /// @notice Emitted when agent metadata URI is updated
    event AgentURIUpdated(
        uint256 indexed agentId,
        string oldURI,
        string newURI,
        uint256 timestamp
    );

    /// @notice Emitted when agent status changes
    event AgentStatusChanged(
        uint256 indexed agentId,
        bool isActive,
        uint256 timestamp
    );

    /**
     * @notice Register a new agent with metadata URI
     * @param metadataURI IPFS or HTTPS URI pointing to agent metadata JSON
     * @return agentId Unique identifier for the registered agent
     */
    function register(string calldata metadataURI) external payable returns (uint256 agentId);

    /**
     * @notice Update agent metadata URI
     * @param agentId Agent identifier
     * @param metadataURI New metadata URI
     */
    function updateURI(uint256 agentId, string calldata metadataURI) external;

    /**
     * @notice Set agent active status
     * @param agentId Agent identifier
     * @param isActive Active status
     */
    function setAgentStatus(uint256 agentId, bool isActive) external;

    /**
     * @notice Get agent metadata URI
     * @param agentId Agent identifier
     * @return Metadata URI
     */
    function getAgentURI(uint256 agentId) external view returns (string memory);

    /**
     * @notice Get agent details
     * @param agentId Agent identifier
     * @return owner Agent owner address
     * @return metadataURI Metadata URI
     * @return registeredAt Registration timestamp
     * @return isActive Active status
     */
    function getAgent(uint256 agentId)
        external
        view
        returns (
            address owner,
            string memory metadataURI,
            uint256 registeredAt,
            bool isActive
        );

    /**
     * @notice Check if agent is active
     * @param agentId Agent identifier
     * @return Active status
     */
    function isAgentActive(uint256 agentId) external view returns (bool);

    /**
     * @notice Get total number of registered agents
     * @return Total agent count
     */
    function totalAgents() external view returns (uint256);

    /**
     * @notice Get global agent identifier
     * @param agentId Agent identifier
     * @return Global identifier in format: eip155:chainId:contractAddress:tokenId
     */
    function getGlobalIdentifier(uint256 agentId) external view returns (string memory);

    /**
     * @notice Returns the owner of the agent.
     * @param agentId The identifier for an agent.
     * @return The owner of the agent.
     */
    function ownerOf(uint256 agentId) external view returns (address);
}
