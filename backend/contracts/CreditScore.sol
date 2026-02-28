// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CreditScore
 * @dev Stores and manages decentralized credit scores for protocol users.
 */
contract CreditScore is AccessControl {
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");

    mapping(address => uint256) private _scores;

    uint256 public constant MIN_SCORE = 300;
    uint256 public constant DEFAULT_SCORE = 500;
    uint256 public constant MAX_SCORE = 1000;

    event ScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore);

    constructor(address initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(SCORER_ROLE, initialOwner);
    }

    function updateScore(address user, uint256 newScore) external onlyRole(SCORER_ROLE) {
        require(newScore >= MIN_SCORE && newScore <= MAX_SCORE, "Score out of bounds");
        uint256 oldScore = _scores[user] == 0 ? DEFAULT_SCORE : _scores[user];
        _scores[user] = newScore;
        emit ScoreUpdated(user, oldScore, newScore);
    }

    function getScore(address user) external view returns (uint256) {
        return _scores[user] == 0 ? DEFAULT_SCORE : _scores[user];
    }
}
