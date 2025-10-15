// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IAgentValidation
 * @notice Interface for ERC-8004 Agent Validation Registry
 * @dev Manages validation requests and responses for agent work
 */
interface IAgentValidation {
    /// @notice Validation status enum
    enum ValidationStatus {
        Pending,
        Completed,
        Expired
    }

    /// @notice Emitted when validation is requested
    event ValidationRequested(
        bytes32 indexed requestHash,
        uint256 indexed agentId,
        address indexed requester,
        address validator,
        string workURI,
        uint256 timestamp
    );

    /// @notice Emitted when validation is submitted
    event ValidationSubmitted(
        bytes32 indexed requestHash,
        uint256 indexed agentId,
        address indexed validator,
        bool isValid,
        string proofURI,
        uint256 timestamp
    );

    /// @notice Emitted when validation expires
    event ValidationExpired(bytes32 indexed requestHash, uint256 timestamp);

    /**
     * @notice Request validation for agent's work
     * @param agentId Agent identifier
     * @param workURI IPFS URI pointing to work to be validated
     * @param validator Address of validator
     * @return requestHash Unique validation request identifier
     */
    function requestValidation(
        uint256 agentId,
        string calldata workURI,
        address validator
    ) external returns (bytes32 requestHash);

    /**
     * @notice Submit validation result
     * @param requestHash Validation request identifier
     * @param isValid Validation result
     * @param proofURI IPFS URI pointing to validation proof
     */
    function submitValidation(
        bytes32 requestHash,
        bool isValid,
        string calldata proofURI
    ) external;

    /**
     * @notice Mark validation as expired
     * @param requestHash Validation request identifier
     */
    function expireValidation(bytes32 requestHash) external;

    /**
     * @notice Get validation request details
     * @param requestHash Validation request identifier
     * @return agentId Agent identifier
     * @return requester Address of requester
     * @return validator Address of validator
     * @return workURI Work URI
     * @return status Validation status
     * @return isValid Validation result (if completed)
     * @return proofURI Proof URI (if completed)
     * @return requestedAt Request timestamp
     * @return completedAt Completion timestamp
     */
    function getValidationRequest(bytes32 requestHash)
        external
        view
        returns (
            uint256 agentId,
            address requester,
            address validator,
            string memory workURI,
            ValidationStatus status,
            bool isValid,
            string memory proofURI,
            uint256 requestedAt,
            uint256 completedAt
        );

    /**
     * @notice Get validation status
     * @param requestHash Validation request identifier
     * @return status Validation status
     * @return isValid Validation result
     */
    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (ValidationStatus status, bool isValid);

    /**
     * @notice Get all validation requests for an agent
     * @param agentId Agent identifier
     * @return Array of validation request hashes
     */
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory);

    /**
     * @notice Get validation statistics for an agent
     * @param agentId Agent identifier
     * @return totalValidations Total validation count
     * @return passedValidations Passed validation count
     * @return failedValidations Failed validation count
     * @return pendingValidations Pending validation count
     */
    function getValidationStats(uint256 agentId)
        external
        view
        returns (
            uint256 totalValidations,
            uint256 passedValidations,
            uint256 failedValidations,
            uint256 pendingValidations
        );
}