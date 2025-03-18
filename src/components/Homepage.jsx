import React, { useEffect, useState } from 'react';
import { useWeb3Context } from '../contexts/Web3Context';

const Homepage = () => {
  const { isCheckingNFT, hasNFT } = useWeb3Context();

  return (
    <div className="homepage">
      {isCheckingNFT ? (
        <div className="nft-check-status">Checking NFT status...</div>
      ) : hasNFT ? (
        <div className="nft-status">✅ NFT Verified</div>
      ) : (
        <div className="nft-status">❌ No NFT Found</div>
      )}
      
      {/* Rest of your homepage content */}
    </div>
  );
};

export default Homepage; 