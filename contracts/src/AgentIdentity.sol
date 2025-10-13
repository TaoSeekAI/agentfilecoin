// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 compliant Agent Identity Registry
 * @dev Implements agent registration as ERC-721-like tokens without full ERC-721 compliance
 */
contract AgentIdentity is IAgentIdentity {
    struct Agent {
        address owner;
        string metadataURI;
        uint256 registeredAt;
        bool isActive;
    }

    /// @notice Mapping from agent ID to agent data
    mapping(uint256 => Agent) private _agents;

    /// @notice Mapping from owner to list of owned agent IDs
    mapping(address => uint256[]) private _ownedAgents;

    /// @notice Current agent counter
    uint256 private _agentCounter;

    /// @notice Registration fee (can be 0)
    uint256 public registrationFee;

    /// @notice Contract owner
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(_agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(_agents[agentId].owner != address(0), "Agent does not exist");
        _;
    }

    constructor(uint256 _registrationFee) {
        owner = msg.sender;
        registrationFee = _registrationFee;
    }

    /// @inheritdoc IAgentIdentity
    function register(string calldata metadataURI) external payable returns (uint256 agentId) {
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        require(msg.value >= registrationFee, "Insufficient registration fee");

        _agentCounter++;
        agentId = _agentCounter;

        _agents[agentId] = Agent({
            owner: msg.sender,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            isActive: true
        });

        _ownedAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, metadataURI, block.timestamp);

        // Refund excess payment
        if (msg.value > registrationFee) {
            payable(msg.sender).transfer(msg.value - registrationFee);
        }
    }

    /// @inheritdoc IAgentIdentity
    function updateURI(uint256 agentId, string calldata metadataURI)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        string memory oldURI = _agents[agentId].metadataURI;
        _agents[agentId].metadataURI = metadataURI;

        emit AgentURIUpdated(agentId, oldURI, metadataURI, block.timestamp);
    }

    /// @inheritdoc IAgentIdentity
    function setAgentStatus(uint256 agentId, bool isActive)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        _agents[agentId].isActive = isActive;
        emit AgentStatusChanged(agentId, isActive, block.timestamp);
    }

    /// @inheritdoc IAgentIdentity
    function getAgentURI(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (string memory)
    {
        return _agents[agentId].metadataURI;
    }

    /// @inheritdoc IAgentIdentity
    function getAgent(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (address, string memory, uint256, bool)
    {
        Agent memory agent = _agents[agentId];
        return (agent.owner, agent.metadataURI, agent.registeredAt, agent.isActive);
    }

    /// @inheritdoc IAgentIdentity
    function isAgentActive(uint256 agentId) external view agentExists(agentId) returns (bool) {
        return _agents[agentId].isActive;
    }

    /// @inheritdoc IAgentIdentity
    function totalAgents() external view returns (uint256) {
        return _agentCounter;
    }

    /// @inheritdoc IAgentIdentity
    function getGlobalIdentifier(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                "eip155:",
                _toString(block.chainid),
                ":",
                _toHexString(address(this)),
                ":",
                _toString(agentId)
            )
        );
    }

    /**
     * @notice Get agents owned by address
     * @param ownerAddress Address to query
     * @return Array of agent IDs
     */
    function getOwnedAgents(address ownerAddress) external view returns (uint256[] memory) {
        return _ownedAgents[ownerAddress];
    }

    /**
     * @notice Update registration fee
     * @param newFee New registration fee
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
    }

    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }

    // Helper functions
    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(address addr) private pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 value = uint8(uint160(addr) >> (8 * (19 - i)));
            buffer[2 + i * 2] = _toHexChar(value >> 4);
            buffer[3 + i * 2] = _toHexChar(value & 0x0f);
        }
        return string(buffer);
    }

    function _toHexChar(uint8 value) private pure returns (bytes1) {
        if (value < 10) {
            return bytes1(uint8(48 + value));
        }
        return bytes1(uint8(87 + value));
    }
}
