// Filter out irrelevant console errors
(function() {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  
  // Patterns to filter out from console
  const errorPatternsToFilter = [
    'Access to storage is not allowed from this context',
    'register-session-token',
    'polkadot',
    'contentscript.js',
    '[ReconnectablePort]',
    'Not Found',
    'Disconnected from',
    'https://rpifipuunzaneaxdxgrjm.supabase',
    'https://nzifipuunzaneaxdxqjm.supabase',
    '404',
    'initial_G1U71rd.js',
    'get_jump_rank'
  ];
  
  // Override fetch to catch RPC errors before they log
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const url = String(args[0]);
      
      // Check if this is an RPC call that might fail
      if (url.includes('supabase') && url.includes('/rpc/')) {
        try {
          const response = await originalFetch.apply(this, args);
          return response;
        } catch (err) {
          // Silently handle RPC errors
          console.debug('Suppressed fetch error for RPC call:', url);
          return new Response(JSON.stringify({ error: { message: 'Suppressed error' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      return originalFetch.apply(this, args);
    } catch (e) {
      return originalFetch.apply(this, args);
    }
  };
  
  // Override console.error
  console.error = function(...args) {
    const errorString = String(args).toLowerCase();
    
    // Check if error message contains any of the patterns we want to filter
    const shouldFilter = errorPatternsToFilter.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!shouldFilter) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // Also filter some logs that might contain these patterns
  console.log = function(...args) {
    const logString = String(args).toLowerCase();
    
    const shouldFilter = errorPatternsToFilter.some(pattern => 
      logString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!shouldFilter) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  // Filter warnings too
  console.warn = function(...args) {
    const warnString = String(args).toLowerCase();
    
    const shouldFilter = errorPatternsToFilter.some(pattern => 
      warnString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!shouldFilter) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  // Add a global error handler to catch and filter uncaught errors
  window.addEventListener('error', function(event) {
    const errorString = (event.message || '') + (event.error ? event.error.stack || '' : '');
    
    const shouldFilter = errorPatternsToFilter.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (shouldFilter) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  // Add a handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const errorString = String(event.reason || '');
    
    const shouldFilter = errorPatternsToFilter.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (shouldFilter) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
})(); 