export const CONTRACT_ADDRESSES = {
  GAME_CONTRACT: import.meta.env.VITE_REACT_APP_GAME_CONTRACT_ADDRESS as string,
  ENCRYPTED_STORAGE: import.meta.env.VITE_REACT_APP_ENCRYPTED_STORAGE_ADDRESS || "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8" // Will need to be updated after deployment
};

export const CONTRACT_CONFIGS = {
  JUMP_COST: "0.0001",
  POWER_UP_COST: "0.0005"
}; 