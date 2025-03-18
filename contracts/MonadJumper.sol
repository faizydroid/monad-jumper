// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MonadJumper {
    // Events
    event JumpsRecorded(address indexed player, uint256 jumps);
    
    // Mapping to store total jumps per player
    mapping(address => uint256) public playerJumps;
    
    /**
     * @dev Records multiple jumps for a player
     * @param _jumps Number of jumps to record
     */
    function recordJumps(uint256 _jumps) external {
        require(_jumps > 0, "Must record at least 1 jump");
        
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
} 