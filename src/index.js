// Import and initialize the logger right at the top
import logger, { overrideConsole } from './utils/logger';

// Immediately override console for the entire application
overrideConsole();

// Filter out irrelevant console errors
(function() {
  // Check if we're in production environment
  const isProduction = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('127.0.0.1') &&
                      !window.location.hostname.includes('192.168.');
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  if (isProduction) {
    // In production, disable all console outputs except critical errors
    console.log = function() {};
    console.info = function() {};
    console.debug = function() {};
    
    // Only show critical errors in production
    console.error = function(...args) {
      const errorString = String(args);
      
      // Check if it's a critical error worth logging
      const isCritical = errorString.toLowerCase().includes('critical') ||
                         errorString.toLowerCase().includes('fatal') ||
                         errorString.toLowerCase().includes('uncaught');
      
      if (isCritical) {
        originalConsole.error.apply(console, args);
      }
    };
    
    // Only show critical warnings in production
    console.warn = function(...args) {
      const warnString = String(args);
      
      // Check if it's a critical warning worth logging
      const isCritical = warnString.toLowerCase().includes('critical') ||
                         warnString.toLowerCase().includes('fatal');
      
      if (isCritical) {
        originalConsole.warn.apply(console, args);
      }
    };
    
    // Silence unhandled exceptions in production
    window.addEventListener('error', function(event) {
      event.preventDefault();
      return true;
    }, true);
    
    // Silence unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      event.preventDefault();
      return true;
    }, true);
    
    console.log = function() {}; // Double override for safety
  } else {
    // In development, still filter irrelevant errors
    const errorPatternsToFilter = [
      'Access to storage is not allowed from this context',
      'register-session-token',
      'polkadot',
      'contentscript.js',
      '[ReconnectablePort]',
      'Not Found',
      'Disconnected from',
      'https://rpifipuunzaneaxdxgrjm.supabase',
      '404',
      'initial_G1U71rd.js'
    ];
    
    // Override console.error for development
    console.error = function(...args) {
      const errorString = String(args).toLowerCase();
      
      // Check if error message contains any of the patterns we want to filter
      const shouldFilter = errorPatternsToFilter.some(pattern => 
        errorString.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!shouldFilter) {
        originalConsole.error.apply(console, args);
      }
    };
    
    // Also filter some logs that might contain these patterns
    console.log = function(...args) {
      const logString = String(args).toLowerCase();
      
      const shouldFilter = errorPatternsToFilter.some(pattern => 
        logString.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!shouldFilter) {
        originalConsole.log.apply(console, args);
      }
    };
    
    // Filter warnings too
    console.warn = function(...args) {
      const warnString = String(args).toLowerCase();
      
      const shouldFilter = errorPatternsToFilter.some(pattern => 
        warnString.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!shouldFilter) {
        originalConsole.warn.apply(console, args);
      }
    };
  }
  
  // Add global error handlers regardless of environment
  window.addEventListener('error', function(event) {
    const errorString = (event.message || '') + (event.error ? event.error.stack || '' : '');
    
    // In production, suppress all errors
    if (isProduction) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // In development, only filter certain patterns
    const shouldFilter = [
      'polkadot', 
      'contentscript', 
      'chrome.runtime', 
      'extension',
      'Access to storage'
    ].some(pattern => 
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
    // In production, suppress all unhandled rejections
    if (isProduction) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // In development, only filter certain patterns
    const errorString = String(event.reason || '');
    
    const shouldFilter = [
      'polkadot', 
      'contentscript', 
      'chrome.runtime', 
      'extension',
      'Access to storage'
    ].some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (shouldFilter) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
})(); 