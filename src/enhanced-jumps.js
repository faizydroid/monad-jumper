// Enhanced recordJumpsServerOnly function with retry logic and deduplication
const recordJumpsServerOnly = async (jumps, sessionId, address) => {
  if (!jumps || jumps <= 0 || !address) return false;
  
  // Create a unique tracking key for this request
  const trackingKey = `server_jumps_${sessionId}_${address}_${jumps}`;
  
  // Check for duplicates within the last minute
  if (!window.__SERVER_JUMP_REQUESTS) {
    window.__SERVER_JUMP_REQUESTS = new Map();
  }
  
  const existingRequest = window.__SERVER_JUMP_REQUESTS.get(trackingKey);
  if (existingRequest && Date.now() - existingRequest.timestamp < 60000) {
    console.log(`🌐 SERVER ONLY: Skipping duplicate request (${jumps} jumps, session: ${sessionId})`);
    return existingRequest.result;
  }
  
  // Track this request
  window.__SERVER_JUMP_REQUESTS.set(trackingKey, {
    timestamp: Date.now(),
    status: 'pending'
  });
  
  // Implementation with retry logic
  const MAX_RETRIES = 2;
  let currentRetry = 0;
  
  while (currentRetry <= MAX_RETRIES) {
    try {
      const retryText = currentRetry > 0 ? ` (retry ${currentRetry}/${MAX_RETRIES})` : '';
      console.log(`🌐 SERVER ONLY: Recording ${jumps} jumps for ${address.slice(0, 8)}...${retryText} (session: ${sessionId})`);
      
      // Create a GameTransactions instance just for server communication
      const serverJumpService = new (await import('./services/gameTransactions')).GameTransactions(
        null, null, address
      );
      
      // Call the recordJumps method which will use the server API directly
      const result = await serverJumpService.recordJumps(jumps, Date.now());
      console.log(`🌐 SERVER ONLY: Jump recording result:`, result);
      
      // Update tracking with success
      window.__SERVER_JUMP_REQUESTS.set(trackingKey, {
        timestamp: Date.now(),
        status: 'success',
        result: true
      });
      
      return true;
    } catch (error) {
      console.error(`🌐 SERVER ONLY: Failed to record jumps${currentRetry > 0 ? ` (retry ${currentRetry}/${MAX_RETRIES})` : ''}:`, error);
      
      // Increment retry counter
      currentRetry++;
      
      // If we have retries left, wait before trying again
      if (currentRetry <= MAX_RETRIES) {
        const delayMs = 1000 * currentRetry; // Increasing delay with each retry
        console.log(`🌐 SERVER ONLY: Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries failed
  console.error(`🌐 SERVER ONLY: All ${MAX_RETRIES} retries failed for recording ${jumps} jumps`);
  
  // Update tracking with failure
  window.__SERVER_JUMP_REQUESTS.set(trackingKey, {
    timestamp: Date.now(),
    status: 'failed',
    result: false
  });
  
  return false;
}; 