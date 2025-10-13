// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IAgentReputation
 * @notice Interface for ERC-8004 Agent Reputation Registry
 * @dev Manages feedback and reputation scoring for agents
 */
interface IAgentReputation {
    /// @notice Emitted when feedback is given to an agent
    event FeedbackGiven(
        uint256 indexed feedbackId,
        uint256 indexed agentId,
        address indexed from,
        uint8 score,
        string[] tags,
        string fileURI,
        uint256 timestamp
    );

    /// @notice Emitted when feedback is revoked
    event FeedbackRevoked(
        uint256 indexed feedbackId,
        uint256 indexed agentId,
        address indexed from,
        uint256 timestamp
    );

    /// @notice Emitted when agent responds to feedback
    event FeedbackResponseAppended(
        uint256 indexed feedbackId,
        uint256 indexed agentId,
        string response,
        uint256 timestamp
    );

    /**
     * @notice Give feedback to an agent
     * @param agentId Agent identifier
     * @param score Score between 0-100
     * @param tags Array of tags for categorizing feedback
     * @param fileURI Optional IPFS URI for detailed feedback
     * @return feedbackId Unique feedback identifier
     */
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        string[] calldata tags,
        string calldata fileURI
    ) external returns (uint256 feedbackId);

    /**
     * @notice Revoke previously given feedback
     * @param feedbackId Feedback identifier
     */
    function revokeFeedback(uint256 feedbackId) external;

    /**
     * @notice Append response to feedback (only agent owner can respond)
     * @param feedbackId Feedback identifier
     * @param response Response message
     */
    function appendResponse(uint256 feedbackId, string calldata response) external;

    /**
     * @notice Get feedback details
     * @param feedbackId Feedback identifier
     * @return agentId Agent identifier
     * @return from Feedback provider address
     * @return score Score (0-100)
     * @return tags Array of tags
     * @return fileURI Detailed feedback URI
     * @return timestamp Submission timestamp
     * @return revoked Whether feedback is revoked
     * @return response Agent's response
     */
    function getFeedback(uint256 feedbackId)
        external
        view
        returns (
            uint256 agentId,
            address from,
            uint8 score,
            string[] memory tags,
            string memory fileURI,
            uint256 timestamp,
            bool revoked,
            string memory response
        );

    /**
     * @notice Get agent's reputation statistics
     * @param agentId Agent identifier
     * @return avgScore Average score
     * @return totalFeedbacks Total number of feedbacks
     * @return activeFeedbacks Number of non-revoked feedbacks
     */
    function getReputation(uint256 agentId)
        external
        view
        returns (uint256 avgScore, uint256 totalFeedbacks, uint256 activeFeedbacks);

    /**
     * @notice Get all feedback IDs for an agent
     * @param agentId Agent identifier
     * @return Array of feedback IDs
     */
    function getAgentFeedbacks(uint256 agentId) external view returns (uint256[] memory);

    /**
     * @notice Get feedback count for an agent
     * @param agentId Agent identifier
     * @return count Total feedback count
     */
    function getFeedbackCount(uint256 agentId) external view returns (uint256 count);
}
