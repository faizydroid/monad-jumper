export const encryptedStorageABI = [
  // Data storage functions
  {
    "inputs": [
      {"internalType": "string", "name": "_encryptedData", "type": "string"},
      {"internalType": "string", "name": "_metadata", "type": "string"}
    ],
    "name": "storeData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMyData",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "encryptedData", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "version", "type": "uint256"},
          {"internalType": "string", "name": "metadata", "type": "string"}
        ],
        "internalType": "struct EncryptedGameStorage.EncryptedData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_player", "type": "address"}],
    "name": "getPlayerData",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "encryptedData", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "version", "type": "uint256"},
          {"internalType": "string", "name": "metadata", "type": "string"}
        ],
        "internalType": "struct EncryptedGameStorage.EncryptedData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deleteMyData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Player management functions
  {
    "inputs": [{"internalType": "address", "name": "_player", "type": "address"}],
    "name": "playerHasData",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPlayerCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllPlayers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_offset", "type": "uint256"},
      {"internalType": "uint256", "name": "_limit", "type": "uint256"}
    ],
    "name": "getActivePlayers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Batch operations
  {
    "inputs": [
      {"internalType": "address[]", "name": "_players", "type": "address[]"},
      {"internalType": "string[]", "name": "_metadata", "type": "string[]"}
    ],
    "name": "batchUpdateMetadata",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "version", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "DataUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "DataDeleted",
    "type": "event"
  }
]; 