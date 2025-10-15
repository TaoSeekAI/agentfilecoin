// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Counters.sol";
import "../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 compliant Agent Identity Registry, refactored based on ChaosChain guide.
 * @dev Inherits from OpenZeppelin's ERC721 standards for security and compatibility.
 */
contract AgentIdentity is IAgentIdentity, ERC721URIStorage, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _agentIdCounter;

    // Mapping to store registration timestamp, as it's not part of the standard ERC721
    mapping(uint256 => uint256) private _registrationTimestamps;
    // Mapping to store active status
    mapping(uint256 => bool) private _agentStatus;

    uint256 public registrationFee;
    address public contractOwner;

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    constructor(uint256 _registrationFee) ERC721("ERC-8004 Trustless Agent", "AGENT") {
        contractOwner = msg.sender;
        registrationFee = _registrationFee;
    }

    // --- ERC-8004 Functions ---

    function register(string calldata metadataURI) external payable nonReentrant returns (uint256 agentId) {
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        require(msg.value >= registrationFee, "Insufficient registration fee");

        _agentIdCounter.increment();
        agentId = _agentIdCounter.current();

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataURI);
        _registrationTimestamps[agentId] = block.timestamp;
        _agentStatus[agentId] = true;

        emit AgentRegistered(agentId, msg.sender, metadataURI, block.timestamp);

        if (msg.value > registrationFee) {
            (bool success, ) = msg.sender.call{value: msg.value - registrationFee}("");
            require(success, "Refund failed");
        }
    }

    function updateURI(uint256 agentId, string calldata metadataURI) external {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        string memory oldURI = tokenURI(agentId);
        _setTokenURI(agentId, metadataURI);

        emit AgentURIUpdated(agentId, oldURI, metadataURI, block.timestamp);
    }

    function setAgentStatus(uint256 agentId, bool isActive) external {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        _agentStatus[agentId] = isActive;
        emit AgentStatusChanged(agentId, isActive, block.timestamp);
    }

    function getAgentURI(uint256 agentId) external view returns (string memory) {
        require(_exists(agentId), "Agent does not exist");
        return tokenURI(agentId);
    }

    function getAgent(uint256 agentId)
        external
        view
        returns (
            address agentOwner,
            string memory metadataURI,
            uint256 registeredAt,
            bool isActive
        )
    {
        require(_exists(agentId), "Agent does not exist");
        agentOwner = ownerOf(agentId);
        metadataURI = tokenURI(agentId);
        registeredAt = _registrationTimestamps[agentId];
        isActive = _agentStatus[agentId];
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        require(_exists(agentId), "Agent does not exist");
        return _agentStatus[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _agentIdCounter.current();
    }

    function getGlobalIdentifier(uint256 agentId) external view returns (string memory) {
        require(_exists(agentId), "Agent does not exist");
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

    // --- Owner Functions ---

    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(contractOwner).call{value: balance}("");
        require(success, "Transfer failed");
    }

    // --- Overrides ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // --- Internal Helpers (copied from original contract for getGlobalIdentifier) ---
    
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