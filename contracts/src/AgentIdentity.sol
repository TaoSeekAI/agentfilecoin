// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 compliant Agent Identity Registry, refactored based on ChaosChain guide.
 * @dev Inherits from OpenZeppelin's ERC721 standards for security and compatibility.
 */
contract AgentIdentity is IAgentIdentity, ERC721URIStorage, ReentrancyGuard {
    uint256 private _nextAgentId = 1;

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

        agentId = _nextAgentId++;


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
        return _nextAgentId - 1;
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

    function ownerOf(uint256 tokenId)
        public
        view
        override(ERC721, IAgentIdentity, IERC721)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // --- Internal Helpers ---

    /**
     * @dev Check if a token exists (replaces deprecated _exists from OZ v4)
     * @param tokenId The token ID to check
     * @return bool True if the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Check if spender is owner or approved for tokenId (replaces deprecated _isApprovedOrOwner from OZ v4)
     * @param spender Address to check
     * @param tokenId Token ID to check
     * @return bool True if spender is owner or approved
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

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