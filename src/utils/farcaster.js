import sdk from '@farcaster/frame-sdk';

// Initialize Farcaster SDK
export const initFarcasterSDK = async () => {
  try {
    // Get frame context data
    const context = await sdk.context;
    
    // Call ready function to hide loading screen
    sdk.actions.ready();
    
    return {
      success: true,
      context
    };
  } catch (error) {
    console.error('Error initializing Farcaster SDK:', error);
    return {
      success: false,
      error
    };
  }
};

// Check if app is running inside Farcaster frame
export const isInFarcasterFrame = () => {
  // Simple check to detect if we're in a Farcaster frame
  return typeof window !== 'undefined' && 
    (window.location.href.includes('warpcast.com') || 
     window.location.href.includes('farcaster.xyz') ||
     !!window.__FARCASTER_APP__);
};

// Get user data from Farcaster context
export const getFarcasterUser = async () => {
  try {
    const context = await sdk.context;
    return context?.user || null;
  } catch (error) {
    console.error('Error getting Farcaster user:', error);
    return null;
  }
}; 