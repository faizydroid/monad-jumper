// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GameScore {
    struct Score {
        address player;
        uint256 score;
        uint256 timestamp;
    }
    
    // Mapping from player address to their score records
    mapping(address => Score[]) public playerScores;
    
    // Array of all scores for leaderboard
    Score[] public allScores;
    
    // Events
    event ScoreAdded(address indexed player, uint256 score, uint256 timestamp);
    event PowerUpPurchased(address indexed player, string powerUpType);
    event ContinueGamePurchased(address indexed player);
    
    // Save a new score
    function saveScore(uint256 _score) external {
        Score memory newScore = Score({
            player: msg.sender,
            score: _score,
            timestamp: block.timestamp
        });
        
        playerScores[msg.sender].push(newScore);
        allScores.push(newScore);
        
        emit ScoreAdded(msg.sender, _score, block.timestamp);
    }
    
    // Save score incrementally (for generating more transactions)
    function saveScoreIncrement(uint256 _increment) external {
        Score memory newScore = Score({
            player: msg.sender,
            score: _increment,
            timestamp: block.timestamp
        });
        
        playerScores[msg.sender].push(newScore);
        allScores.push(newScore);
        
        emit ScoreAdded(msg.sender, _increment, block.timestamp);
    }
    
    // Purchase a power-up (costs MON)
    function purchasePowerUp(string calldata _type) external payable {
        require(msg.value >= 0.0001 ether, "Insufficient payment for power-up");
        
        emit PowerUpPurchased(msg.sender, _type);
    }
    
    // Continue game after dying (costs MON)
    function continueGame() external payable {
        require(msg.value >= 0.0002 ether, "Insufficient payment to continue");
        
        emit ContinueGamePurchased(msg.sender);
    }
    
    // Get the highest score for a player
    function getHighScore(address _player) external view returns (uint256) {
        if (playerScores[_player].length == 0) {
            return 0;
        }
        
        uint256 highScore = 0;
        for (uint256 i = 0; i < playerScores[_player].length; i++) {
            if (playerScores[_player][i].score > highScore) {
                highScore = playerScores[_player][i].score;
            }
        }
        
        return highScore;
    }
    
    // Get top 10 scores for leaderboard
    function getTopScores() external view returns (Score[] memory) {
        uint256 resultCount = allScores.length > 10 ? 10 : allScores.length;
        Score[] memory topScores = new Score[](resultCount);
        
        // Simple selection sort for demo purposes (not efficient for large arrays)
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 maxIndex = 0;
            uint256 maxScore = 0;
            
            for (uint256 j = 0; j < allScores.length; j++) {
                bool alreadySelected = false;
                for (uint256 k = 0; k < i; k++) {
                    if (allScores[j].player == topScores[k].player && 
                        allScores[j].timestamp == topScores[k].timestamp) {
                        alreadySelected = true;
                        break;
                    }
                }
                
                if (!alreadySelected && allScores[j].score > maxScore) {
                    maxScore = allScores[j].score;
                    maxIndex = j;
                }
            }
            
            topScores[i] = allScores[maxIndex];
        }
        
        return topScores;
    }
} 