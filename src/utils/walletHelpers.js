// Add this utility file to help with mobile browser detection

export const isMobileBrowser = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getWalletConnectionInfo = () => {
  const browserInfo = {
    isMetaMaskAvailable: typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask,
    isCoinbaseWalletAvailable: typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet,
    isMobileBrowser: isMobileBrowser(),
    isMobileDevice: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    browserName: getBrowserName(),
  };
  
  return browserInfo;
};

export const getBrowserName = () => {
  const userAgent = navigator.userAgent;
  let browserName;
  
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "Opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "Edge";
  } else {
    browserName = "Unknown";
  }
  
  return browserName;
};

export const getMobileWalletDeeplink = (walletName) => {
  // Map of wallet names to their deep links
  const deepLinks = {
    metamask: 'https://metamask.app.link',
    trust: 'https://link.trustwallet.com',
    rainbow: 'https://rnbwapp.com',
    coinbase: 'https://go.cb-w.com',
  };
  
  return deepLinks[walletName.toLowerCase()] || null;
}; 