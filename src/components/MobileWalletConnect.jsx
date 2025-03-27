import React, { useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const MobileWalletConnect = () => {
  // Force mobile detection on component mount
  useEffect(() => {
    // Set mobile detection attributes
    document.documentElement.setAttribute('data-rk-platform', 'mobile');
    
    // Force mobile CSS
    const mobileStyle = document.createElement('style');
    mobileStyle.id = 'rk-mobile-styles';
    mobileStyle.innerHTML = `
      [data-rk] .ju367v9c {
        max-height: 70vh !important;
        padding-bottom: env(safe-area-inset-bottom) !important;
      }
      [data-rk] .ju367v84 {
        padding-bottom: 24px !important;
      }
    `;
    document.head.appendChild(mobileStyle);
    
    return () => {
      document.documentElement.removeAttribute('data-rk-platform');
      const styleElement = document.getElementById('rk-mobile-styles');
      if (styleElement) styleElement.remove();
    };
  }, []);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain;
        
        return (
          <div className="mobile-connect-wrapper">
            {!connected ? (
              <button
                className="mobile-connect-button"
                type="button"
                onClick={openConnectModal}
                data-rk-mobile="true"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="mobile-connected-info">
                <button
                  onClick={openAccountModal}
                  className="mobile-account-button"
                  type="button"
                >
                  {account.displayName}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default MobileWalletConnect; 