// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EncryptedGameStorage
 * @dev Contract for storing encrypted game data on-chain
 * Only the owner of the data can update it
 */
contract EncryptedGameStorage {
    // Structure to store game data with metadata
    struct EncryptedData {
        string encryptedData;     // Encrypted data payload
        uint256 timestamp;        // When this was last updated
        uint256 version;          // Version counter for tracking updates
        string metadata;          // Optional plaintext metadata
    }

    // Mapping from player address to their encrypted data
    mapping(address => EncryptedData) public playerData;
    
    // Track all addresses that have stored data
    address[] public players;
    mapping(address => bool) private hasData;

    // Events
    event DataUpdated(address indexed player, uint256 version, uint256 timestamp);
    event DataDeleted(address indexed player, uint256 timestamp);

    /**
     * @dev Store or update encrypted data for the caller
     * @param _encryptedData The encrypted data string
     * @param _metadata Optional plaintext metadata (leaderboard info, etc.)
     */
    function storeData(string calldata _encryptedData, string calldata _metadata) external {
        require(bytes(_encryptedData).length > 0, "Empty data not allowed");
        
        // Update the player's data
        EncryptedData storage data = playerData[msg.sender];
        
        // If this is the first time storing data, add to players array
        if (!hasData[msg.sender]) {
            players.push(msg.sender);
            hasData[msg.sender] = true;
        }
        
        // Update the data
        data.encryptedData = _encryptedData;
        data.timestamp = block.timestamp;
        data.version += 1;
        data.metadata = _metadata;
        
        // Emit event
        emit DataUpdated(msg.sender, data.version, block.timestamp);
    }

    /**
     * @dev Retrieve encrypted data for a player
     * @param _player The address of the player
     * @return The full encrypted data structure
     */
    function getPlayerData(address _player) external view returns (EncryptedData memory) {
        return playerData[_player];
    }

    /**
     * @dev Retrieve your own encrypted data
     * @return The full encrypted data structure
     */
    function getMyData() external view returns (EncryptedData memory) {
        return playerData[msg.sender];
    }

    /**
     * @dev Delete your own data
     */
    function deleteMyData() external {
        require(hasData[msg.sender], "No data to delete");
        
        // Delete the data
        delete playerData[msg.sender];
        
        // Keep the player in the array but mark as not having data
        hasData[msg.sender] = false;
        
        // Emit event
        emit DataDeleted(msg.sender, block.timestamp);
    }

    /**
     * @dev Get the number of players with stored data
     * @return The number of unique players
     */
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    /**
     * @dev Get all players with data
     * @return Array of player addresses
     */
    function getAllPlayers() external view returns (address[] memory) {
        return players;
    }

    /**
     * @dev Get active players with data (excluding deleted data)
     * @param _offset Starting index
     * @param _limit Maximum number of addresses to return
     * @return Array of active player addresses
     */
    function getActivePlayers(uint256 _offset, uint256 _limit) external view returns (address[] memory) {
        // Count active players
        uint256 activeCount = 0;
        for (uint256 i = 0; i < players.length; i++) {
            if (hasData[players[i]]) {
                activeCount++;
            }
        }
        
        // Create array of correct size
        uint256 resultSize = _limit;
        if (_offset >= activeCount) {
            return new address[](0);
        }
        if (_offset + _limit > activeCount) {
            resultSize = activeCount - _offset;
        }
        
        // Fill the array
        address[] memory result = new address[](resultSize);
        uint256 resultIndex = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 0; i < players.length && resultIndex < resultSize; i++) {
            if (hasData[players[i]]) {
                if (skipped >= _offset) {
                    result[resultIndex] = players[i];
                    resultIndex++;
                } else {
                    skipped++;
                }
            }
        }
        
        return result;
    }

    /**
     * @dev Check if a player has stored data
     * @param _player The address to check
     * @return Boolean indicating if the player has stored data
     */
    function playerHasData(address _player) external view returns (bool) {
        return hasData[_player];
    }

    /**
     * @dev Store batch metadata for multiple players (admin function)
     * Only updates metadata, not the encrypted data itself
     * @param _players Array of player addresses
     * @param _metadata Array of metadata strings
     */
    function batchUpdateMetadata(address[] calldata _players, string[] calldata _metadata) external {
        require(_players.length == _metadata.length, "Arrays must be same length");
        
        for (uint256 i = 0; i < _players.length; i++) {
            // Only update if player has data
            if (hasData[_players[i]]) {
                playerData[_players[i]].metadata = _metadata[i];
                // Don't increment version as actual data didn't change
                playerData[_players[i]].timestamp = block.timestamp;
                
                emit DataUpdated(_players[i], playerData[_players[i]].version, block.timestamp);
            }
        }
    }
} 