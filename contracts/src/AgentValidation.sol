// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IAgentValidation.sol";
import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentValidation
 * @notice ERC-8004 compliant Agent Validation Registry
 * @dev Manages validation requests and responses for agent work
 */
contract AgentValidation is IAgentValidation {
    struct ValidationRequest {
        uint256 agentId;
        address requester;
        address validator;
        string workURI;
        ValidationStatus status;
        bool isValid;
        string proofURI;
        uint256 requestedAt;
        uint256 completedAt;
    }

    /// @notice Reference to identity registry
    IAgentIdentity public identityRegistry;

    /// @notice Mapping from request ID to validation request
    mapping(uint256 => ValidationRequest) private _validationRequests;

    /// @notice Mapping from agent ID to validation request IDs
    mapping(uint256 => uint256[]) private _agentValidations;

    /// @notice Current request counter
    uint256 private _requestCounter;

    /// @notice Validation expiry time (7 days)
    uint256 public constant VALIDATION_EXPIRY = 7 days;

    modifier agentExists(uint256 agentId) {
        (address agentOwner,,,) = identityRegistry.getAgent(agentId);
        require(agentOwner != address(0), "Agent does not exist");
        _;
    }

    modifier requestExists(uint256 requestId) {
        require(_validationRequests[requestId].requester != address(0), "Request does not exist");
        _;
    }

    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IAgentIdentity(_identityRegistry);
    }

    /// @inheritdoc IAgentValidation
    function requestValidation(uint256 agentId, string calldata workURI, address validator)
        external
        agentExists(agentId)
        returns (uint256 requestId)
    {
        require(validator != address(0), "Invalid validator address");
        require(bytes(workURI).length > 0, "Empty work URI");

        _requestCounter++;
        requestId = _requestCounter;

        _validationRequests[requestId] = ValidationRequest({
            agentId: agentId,
            requester: msg.sender,
            validator: validator,
            workURI: workURI,
            status: ValidationStatus.Pending,
            isValid: false,
            proofURI: "",
            requestedAt: block.timestamp,
            completedAt: 0
        });

        _agentValidations[agentId].push(requestId);

        emit ValidationRequested(requestId, agentId, msg.sender, validator, workURI, block.timestamp);
    }

    /// @inheritdoc IAgentValidation
    function submitValidation(uint256 requestId, bool isValid, string calldata proofURI)
        external
        requestExists(requestId)
    {
        ValidationRequest storage request = _validationRequests[requestId];

        require(msg.sender == request.validator, "Not the assigned validator");
        require(request.status == ValidationStatus.Pending, "Request not pending");
        require(
            block.timestamp <= request.requestedAt + VALIDATION_EXPIRY,
            "Validation expired"
        );

        request.status = ValidationStatus.Completed;
        request.isValid = isValid;
        request.proofURI = proofURI;
        request.completedAt = block.timestamp;

        emit ValidationSubmitted(
            requestId, request.agentId, msg.sender, isValid, proofURI, block.timestamp
        );
    }

    /// @inheritdoc IAgentValidation
    function expireValidation(uint256 requestId) external requestExists(requestId) {
        ValidationRequest storage request = _validationRequests[requestId];

        require(request.status == ValidationStatus.Pending, "Request not pending");
        require(
            block.timestamp > request.requestedAt + VALIDATION_EXPIRY,
            "Validation not yet expired"
        );

        request.status = ValidationStatus.Expired;

        emit ValidationExpired(requestId, block.timestamp);
    }

    /// @inheritdoc IAgentValidation
    function getValidationRequest(uint256 requestId)
        external
        view
        requestExists(requestId)
        returns (uint256, address, address, string memory, ValidationStatus, bool, string memory, uint256, uint256)
    {
        ValidationRequest storage request = _validationRequests[requestId];
        return (
            request.agentId,
            request.requester,
            request.validator,
            request.workURI,
            request.status,
            request.isValid,
            request.proofURI,
            request.requestedAt,
            request.completedAt
        );
    }

    /// @inheritdoc IAgentValidation
    function getValidationStatus(uint256 requestId)
        external
        view
        requestExists(requestId)
        returns (ValidationStatus, bool)
    {
        ValidationRequest storage request = _validationRequests[requestId];
        return (request.status, request.isValid);
    }

    /// @inheritdoc IAgentValidation
    function getAgentValidations(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256[] memory)
    {
        return _agentValidations[agentId];
    }

    /// @inheritdoc IAgentValidation
    function getValidationStats(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256 totalValidations, uint256 passedValidations, uint256 failedValidations, uint256 pendingValidations)
    {
        uint256[] memory validationIds = _agentValidations[agentId];
        totalValidations = validationIds.length;

        for (uint256 i = 0; i < totalValidations; i++) {
            ValidationRequest storage request = _validationRequests[validationIds[i]];

            if (request.status == ValidationStatus.Pending) {
                pendingValidations++;
            } else if (request.status == ValidationStatus.Completed) {
                if (request.isValid) {
                    passedValidations++;
                } else {
                    failedValidations++;
                }
            }
        }
    }

    /**
     * @notice Check if validation has expired
     * @param requestId Request identifier
     * @return Has expired
     */
    function isExpired(uint256 requestId) external view requestExists(requestId) returns (bool) {
        ValidationRequest storage request = _validationRequests[requestId];
        return request.status == ValidationStatus.Pending
            && block.timestamp > request.requestedAt + VALIDATION_EXPIRY;
    }
}
