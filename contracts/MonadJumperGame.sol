// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MonadJumperGame is Ownable {
    // Mapping to track jumps per player
    mapping(address => uint256) public playerJumps;
    
    // Events
    event JumpsRecorded(address indexed player, uint256 jumps);
    
    constructor() Ownable(msg.sender) {
        // No need for explicit transfer as owner is set in parent constructor
    }
    
    /**
     * @dev Records jumps for a player
     * @param _jumps Number of jumps to record
     */
    function recordJumps(uint256 _jumps) external {
        require(_jumps > 0, "Must record at least one jump");
        
        playerJumps[msg.sender] += _jumps;
        
        emit JumpsRecorded(msg.sender, _jumps);
    }
    
    /**
     * @dev Gets total jumps for a player
     * @param _player Address of the player
     */
    function getPlayerJumps(address _player) external view returns (uint256) {
        return playerJumps[_player];
    }
    
    /**
     * @dev Gets total jumps for the caller
     */
    function getMyJumps() external view returns (uint256) {
        return playerJumps[msg.sender];
    }
    
    /**
     * @dev Admin function to reset a player's jumps
     */
    function resetPlayerJumps(address _player) external onlyOwner {
        playerJumps[_player] = 0;
    }
} 