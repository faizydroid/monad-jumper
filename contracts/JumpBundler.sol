// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract JumpBundler {
    // Cost per jump in wei
    uint256 public constant JUMP_COST = 0.0001 ether;
    
    // Event emitted for each bundle of jumps
    event JumpsBundled(address player, uint256 jumpCount, uint256 timestamp);
    
    // Player stats
    mapping(address => uint256) public totalJumps;
    mapping(address => uint256) public totalGames;
    mapping(address => uint256) public highScore;
    
    /**
     * @dev Bundle multiple jumps into a single transaction
     * @param jumpCount Number of jumps to record
     */
    function bundleJumps(uint256 jumpCount) external payable {
        // Require payment based on jump count
        require(jumpCount > 0, "Must bundle at least 1 jump");
        require(msg.value >= JUMP_COST * jumpCount, "Insufficient payment for jumps");
        
        // Update player stats
        totalJumps[msg.sender] += jumpCount;
        totalGames[msg.sender]++;
        
        // Emit event with all details
        emit JumpsBundled(msg.sender, jumpCount, block.timestamp);
    }
    
    /**
     * @dev Update player's high score if it's higher than current
     * @param score The new score to check against high score
     */
    function updateHighScore(uint256 score) external {
        if (score > highScore[msg.sender]) {
            highScore[msg.sender] = score;
        }
    }
    
    /**
     * @dev Bundle jumps and update high score in one transaction
     * @param jumpCount Number of jumps to record
     * @param score The new score to check against high score
     */
    function bundleJumpsAndUpdateScore(uint256 jumpCount, uint256 score) external payable {
        // First bundle the jumps
        require(jumpCount > 0, "Must bundle at least 1 jump");
        require(msg.value >= JUMP_COST * jumpCount, "Insufficient payment for jumps");
        
        // Update player stats
        totalJumps[msg.sender] += jumpCount;
        totalGames[msg.sender]++;
        
        // Update high score if needed
        if (score > highScore[msg.sender]) {
            highScore[msg.sender] = score;
        }
        
        // Emit event with all details
        emit JumpsBundled(msg.sender, jumpCount, block.timestamp);
    }
    
    /**
     * @dev Get player stats
     * @param player The address of the player
     * @return Total jumps, total games, and high score
     */
    function getPlayerStats(address player) external view returns (uint256, uint256, uint256) {
        return (totalJumps[player], totalGames[player], highScore[player]);
    }
} 