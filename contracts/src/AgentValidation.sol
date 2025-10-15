// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IAgentValidation.sol";
import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentValidation
 * @notice ERC-8004 compliant Agent Validation Registry, refactored with security enhancements.
 * @dev Manages validation requests and responses for agent work.
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

    IAgentIdentity public identityRegistry;

    // --- SECURITY: Use request hash as the unique ID to prevent overwrites ---
    mapping(bytes32 => ValidationRequest) private _validationRequests;
    mapping(bytes32 => bool) private _requestExists;
    // ---

    mapping(uint256 => bytes32[]) private _agentValidations;
    uint256 public constant VALIDATION_EXPIRY = 7 days;

    modifier agentExists(uint256 agentId) {
        require(identityRegistry.ownerOf(agentId) != address(0), "Agent does not exist");
        _;
    }

    modifier requestExists(bytes32 requestHash) {
        require(_requestExists[requestHash], "Request does not exist");
        _;
    }

    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IAgentIdentity(_identityRegistry);
    }

    function requestValidation(
        uint256 agentId,
        string calldata workURI,
        address validator
    ) external agentExists(agentId) returns (bytes32 requestHash) {
        require(validator != address(0), "Invalid validator address");
        require(bytes(workURI).length > 0, "Empty work URI");

        // --- SECURITY: Prevent self-validation ---
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(validator != agentOwner, "Self-validation not allowed");
        require(validator != msg.sender, "Self-validation not allowed");
        // ---

        requestHash = keccak256(abi.encode(agentId, workURI, validator, msg.sender, block.chainid));

        // --- SECURITY: Prevent request hash overwrites ---
        require(!_requestExists[requestHash], "Request hash already exists");
        _requestExists[requestHash] = true;
        // ---

        _validationRequests[requestHash] = ValidationRequest({
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

        _agentValidations[agentId].push(requestHash);

        emit ValidationRequested(requestHash, agentId, msg.sender, validator, workURI, block.timestamp);
    }

    function submitValidation(bytes32 requestHash, bool isValid, string calldata proofURI)
        external
        requestExists(requestHash)
    {
        ValidationRequest storage request = _validationRequests[requestHash];

        require(msg.sender == request.validator, "Not the assigned validator");
        require(request.status == ValidationStatus.Pending, "Request not pending");
        require(block.timestamp <= request.requestedAt + VALIDATION_EXPIRY, "Validation expired");

        request.status = ValidationStatus.Completed;
        request.isValid = isValid;
        request.proofURI = proofURI;
        request.completedAt = block.timestamp;

        emit ValidationSubmitted(
            requestHash, request.agentId, msg.sender, isValid, proofURI, block.timestamp
        );
    }

    function expireValidation(bytes32 requestHash) external requestExists(requestHash) {
        ValidationRequest storage request = _validationRequests[requestHash];

        require(request.status == ValidationStatus.Pending, "Request not pending");
        require(block.timestamp > request.requestedAt + VALIDATION_EXPIRY, "Validation not yet expired");

        request.status = ValidationStatus.Expired;

        emit ValidationExpired(requestHash, block.timestamp);
    }

    function getValidationRequest(bytes32 requestHash)
        external
        view
        requestExists(requestHash)
        returns (uint256, address, address, string memory, ValidationStatus, bool, string memory, uint256, uint256)
    {
        ValidationRequest storage request = _validationRequests[requestHash];
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

    function getValidationStatus(bytes32 requestHash)
        external
        view
        requestExists(requestHash)
        returns (ValidationStatus, bool)
    {
        ValidationRequest storage request = _validationRequests[requestHash];
        return (request.status, request.isValid);
    }

    function getAgentValidations(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (bytes32[] memory)
    {
        return _agentValidations[agentId];
    }

    function getValidationStats(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256 totalValidations, uint256 passedValidations, uint256 failedValidations, uint256 pendingValidations)
    {
        bytes32[] memory validationHashes = _agentValidations[agentId];
        totalValidations = validationHashes.length;

        for (uint256 i = 0; i < totalValidations; i++) {
            ValidationRequest storage request = _validationRequests[validationHashes[i]];

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

    function isExpired(bytes32 requestHash) external view requestExists(requestHash) returns (bool) {
        ValidationRequest storage request = _validationRequests[requestHash];
        return request.status == ValidationStatus.Pending
            && block.timestamp > request.requestedAt + VALIDATION_EXPIRY;
    }
}