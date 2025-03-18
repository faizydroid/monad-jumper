export const gameContractABI = [
  {
    "inputs": [],
    "name": "JUMP_COST",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POWER_UP_COST",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_amount", "type": "uint256"}],
    "name": "collectCoin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_player", "type": "address"}],
    "name": "getPlayerData",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "highScore", "type": "uint256"},
          {"internalType": "uint256", "name": "totalJumps", "type": "uint256"},
          {"internalType": "uint256", "name": "powerUpsUsed", "type": "uint256"},
          {"internalType": "uint256", "name": "coinsCollected", "type": "uint256"},
          {"internalType": "bool", "name": "hasPlayedToday", "type": "bool"},
          {"internalType": "uint256", "name": "lastPlayTimestamp", "type": "uint256"}
        ],
        "internalType": "struct MonadJumper.PlayerData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTopPlayers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "jump",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "players",
    "outputs": [
      {"internalType": "uint256", "name": "highScore", "type": "uint256"},
      {"internalType": "uint256", "name": "totalJumps", "type": "uint256"},
      {"internalType": "uint256", "name": "powerUpsUsed", "type": "uint256"},
      {"internalType": "uint256", "name": "coinsCollected", "type": "uint256"},
      {"internalType": "bool", "name": "hasPlayedToday", "type": "bool"},
      {"internalType": "uint256", "name": "lastPlayTimestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_score", "type": "uint256"}],
    "name": "updateScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_type", "type": "uint256"}],
    "name": "usePowerUp",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_finalScore", "type": "uint256"},
      {"internalType": "uint256", "name": "_jumps", "type": "uint256"}
    ],
    "name": "finalizeGame",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "CoinCollected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "height", "type": "uint256"}
    ],
    "name": "JumpRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "powerUpType", "type": "uint256"}
    ],
    "name": "PowerUpUsed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "score", "type": "uint256"}
    ],
    "name": "ScoreUpdated",
    "type": "event"
  }
]; 