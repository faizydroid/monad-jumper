import React, { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import SimpleModal from './SimpleModal';

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;

const NFTMintModal = ({ isOpen, onClose }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const handleMint = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsMinting(true);
    setError(null);
    
    try {
      console.log("Sending mint transaction with 1 MON...");
      
      const hash = await walletClient.writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [{name:"mint", type:"function", stateMutability:"payable", inputs:[], outputs:[]}],
        functionName: "mint",
        value: parseEther("1.0")
      });
      
      console.log("Mint transaction sent:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("NFT minted successfully!");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Mint error:", err);
      if (err.message?.includes("insufficient funds")) {
        setError("You need 1 MON to mint this NFT");
      } else if (err.message?.includes("Already minted")) {
        setError("You've already minted an NFT with this wallet");
      } else {
        setError(err.message || "Failed to mint. Please try again.");
      }
    } finally {
      setIsMinting(false);
    }
  };
  
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Mint Character NFT">
      <div className="mint-modal-content">
        <p>Mint your unique Monad Jumper character NFT to play the game!</p>
        <p>Cost: <strong>1 MON</strong></p>
        
        {error && (
          <div className="error-message" style={{color:'#FF5252',margin:'15px 0',padding:'10px',background:'rgba(255,82,82,0.1)',borderRadius:'4px'}}>
            {error}
          </div>
        )}
        
        <div className="mint-actions" style={{marginTop:'20px',display:'flex',gap:'10px'}}>
          <button onClick={handleMint} disabled={isMinting} className="mint-now-btn">
            {isMinting ? 'Minting...' : 'Mint Now (1 MON)'}
          </button>
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

export default NFTMintModal; 