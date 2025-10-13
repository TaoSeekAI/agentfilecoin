// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IAgentReputation.sol";
import "./interfaces/IAgentIdentity.sol";

/**
 * @title AgentReputation
 * @notice ERC-8004 compliant Agent Reputation Registry
 * @dev Manages feedback and reputation scoring for agents
 */
contract AgentReputation is IAgentReputation {
    struct Feedback {
        uint256 agentId;
        address from;
        uint8 score;
        string[] tags;
        string fileURI;
        uint256 timestamp;
        bool revoked;
        string response;
    }

    /// @notice Reference to identity registry
    IAgentIdentity public identityRegistry;

    /// @notice Mapping from feedback ID to feedback data
    mapping(uint256 => Feedback) private _feedbacks;

    /// @notice Mapping from agent ID to feedback IDs
    mapping(uint256 => uint256[]) private _agentFeedbacks;

    /// @notice Current feedback counter
    uint256 private _feedbackCounter;

    /// @notice Minimum time between feedbacks from same address (anti-spam)
    uint256 public constant FEEDBACK_COOLDOWN = 1 hours;

    /// @notice Mapping to track last feedback time per address per agent
    mapping(address => mapping(uint256 => uint256)) private _lastFeedbackTime;

    modifier agentExists(uint256 agentId) {
        (address agentOwner,,,) = identityRegistry.getAgent(agentId);
        require(agentOwner != address(0), "Agent does not exist");
        _;
    }

    modifier feedbackExists(uint256 feedbackId) {
        require(_feedbacks[feedbackId].from != address(0), "Feedback does not exist");
        _;
    }

    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IAgentIdentity(_identityRegistry);
    }

    /// @inheritdoc IAgentReputation
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        string[] calldata tags,
        string calldata fileURI
    ) external agentExists(agentId) returns (uint256 feedbackId) {
        require(score <= 100, "Score must be 0-100");
        require(
            block.timestamp >= _lastFeedbackTime[msg.sender][agentId] + FEEDBACK_COOLDOWN,
            "Feedback cooldown not expired"
        );

        _feedbackCounter++;
        feedbackId = _feedbackCounter;

        // Store tags
        Feedback storage feedback = _feedbacks[feedbackId];
        feedback.agentId = agentId;
        feedback.from = msg.sender;
        feedback.score = score;
        feedback.fileURI = fileURI;
        feedback.timestamp = block.timestamp;
        feedback.revoked = false;

        // Copy tags to storage
        for (uint256 i = 0; i < tags.length; i++) {
            feedback.tags.push(tags[i]);
        }

        _agentFeedbacks[agentId].push(feedbackId);
        _lastFeedbackTime[msg.sender][agentId] = block.timestamp;

        emit FeedbackGiven(feedbackId, agentId, msg.sender, score, tags, fileURI, block.timestamp);
    }

    /// @inheritdoc IAgentReputation
    function revokeFeedback(uint256 feedbackId) external feedbackExists(feedbackId) {
        Feedback storage feedback = _feedbacks[feedbackId];
        require(feedback.from == msg.sender, "Not feedback owner");
        require(!feedback.revoked, "Already revoked");

        feedback.revoked = true;

        emit FeedbackRevoked(feedbackId, feedback.agentId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IAgentReputation
    function appendResponse(uint256 feedbackId, string calldata response)
        external
        feedbackExists(feedbackId)
    {
        Feedback storage feedback = _feedbacks[feedbackId];
        require(!feedback.revoked, "Feedback is revoked");

        // Check if caller is agent owner
        (address agentOwner,,,) = identityRegistry.getAgent(feedback.agentId);
        require(msg.sender == agentOwner, "Not agent owner");

        feedback.response = response;

        emit FeedbackResponseAppended(feedbackId, feedback.agentId, response, block.timestamp);
    }

    /// @inheritdoc IAgentReputation
    function getFeedback(uint256 feedbackId)
        external
        view
        feedbackExists(feedbackId)
        returns (uint256, address, uint8, string[] memory, string memory, uint256, bool, string memory)
    {
        Feedback storage feedback = _feedbacks[feedbackId];
        return (
            feedback.agentId,
            feedback.from,
            feedback.score,
            feedback.tags,
            feedback.fileURI,
            feedback.timestamp,
            feedback.revoked,
            feedback.response
        );
    }

    /// @inheritdoc IAgentReputation
    function getReputation(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256 avgScore, uint256 totalFeedbacks, uint256 activeFeedbacks)
    {
        uint256[] memory feedbackIds = _agentFeedbacks[agentId];
        totalFeedbacks = feedbackIds.length;

        if (totalFeedbacks == 0) {
            return (0, 0, 0);
        }

        uint256 sum = 0;
        activeFeedbacks = 0;

        for (uint256 i = 0; i < totalFeedbacks; i++) {
            Feedback storage feedback = _feedbacks[feedbackIds[i]];
            if (!feedback.revoked) {
                sum += feedback.score;
                activeFeedbacks++;
            }
        }

        avgScore = activeFeedbacks > 0 ? sum / activeFeedbacks : 0;
    }

    /// @inheritdoc IAgentReputation
    function getAgentFeedbacks(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256[] memory)
    {
        return _agentFeedbacks[agentId];
    }

    /// @inheritdoc IAgentReputation
    function getFeedbackCount(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint256)
    {
        return _agentFeedbacks[agentId].length;
    }

    /**
     * @notice Get detailed reputation breakdown
     * @param agentId Agent identifier
     * @return scores Array of all non-revoked scores
     * @return timestamps Array of feedback timestamps
     */
    function getReputationBreakdown(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (uint8[] memory scores, uint256[] memory timestamps)
    {
        uint256[] memory feedbackIds = _agentFeedbacks[agentId];
        uint256 activeCount = 0;

        // Count active feedbacks
        for (uint256 i = 0; i < feedbackIds.length; i++) {
            if (!_feedbacks[feedbackIds[i]].revoked) {
                activeCount++;
            }
        }

        scores = new uint8[](activeCount);
        timestamps = new uint256[](activeCount);

        uint256 index = 0;
        for (uint256 i = 0; i < feedbackIds.length; i++) {
            Feedback storage feedback = _feedbacks[feedbackIds[i]];
            if (!feedback.revoked) {
                scores[index] = feedback.score;
                timestamps[index] = feedback.timestamp;
                index++;
            }
        }
    }
}
