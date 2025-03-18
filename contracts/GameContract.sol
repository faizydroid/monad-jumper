// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MonadJumper {
    struct PlayerData {
        uint256 highScore;
        uint256 totalJumps;
        uint256 powerUpsUsed;
        uint256 coinsCollected;
        bool hasPlayedToday;
        uint256 lastPlayTimestamp;
    }
    
    mapping(address => PlayerData) public players;
    mapping(address => uint256) public playerScores;
    address[] public topPlayers;
    
    uint256 public constant JUMP_COST = 0.0001 ether;
    uint256 public constant POWER_UP_COST = 0.0005 ether;
    
    event JumpRecorded(address player, uint256 height);
    event ScoreUpdated(address player, uint256 score);
    event PowerUpUsed(address player, uint256 powerUpType);
    event CoinCollected(address player, uint256 amount);
    
    function jump() external payable {
        require(msg.value >= JUMP_COST, "Insufficient payment for jump");
        players[msg.sender].totalJumps++;
        emit JumpRecorded(msg.sender, block.number);
    }
    
    function updateScore(uint256 _score) external {
        require(_score > playerScores[msg.sender], "New score must be higher");
        playerScores[msg.sender] = _score;
        players[msg.sender].highScore = _score;
        _updateTopPlayers(msg.sender, _score);
        emit ScoreUpdated(msg.sender, _score);
    }
    
    function usePowerUp(uint256 _type) external payable {
        require(msg.value >= POWER_UP_COST, "Insufficient payment for power-up");
        players[msg.sender].powerUpsUsed++;
        emit PowerUpUsed(msg.sender, _type);
    }
    
    function collectCoin(uint256 _amount) external {
        players[msg.sender].coinsCollected += _amount;
        emit CoinCollected(msg.sender, _amount);
    }
    
    function _updateTopPlayers(address _player, uint256 _score) internal {
        // Update top players logic
    }
    
    // View functions
    function getPlayerData(address _player) external view returns (PlayerData memory) {
        return players[_player];
    }
    
    function getTopPlayers() external view returns (address[] memory) {
        return topPlayers;
    }
} 