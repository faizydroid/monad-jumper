/**
 * SES Lockdown Fix for Firefox
 * 
 * This script specifically targets the Firefox SES lockdown issues
 * that are causing problems with the vendor.js file
 */

// Firefox compatibility script - runs before any other script
// It detects and neutralizes SES lockdown attempts
(function() {
    // Immediately define the b_ object globally
    if (!window.b_) {
        window.b_ = {};
        console.log("🔧 Created window.b_ object");
    }
    
    if (typeof globalThis !== 'undefined' && !globalThis.b_) {
        globalThis.b_ = window.b_;
        console.log("🔧 Created globalThis.b_ object");
    }

    // Create and protect the b_ object with a Proxy
    try {
        // Create a proxy for deep access without errors
        window.b_ = new Proxy(window.b_ || {}, {
            get: function(target, prop) {
                // Create empty objects for any missing property
                if (!(prop in target)) {
                    console.log(`🛠️ Creating missing b_.${prop} property`);
                    target[prop] = {};
                }
                return target[prop];
            },
            set: function(target, prop, value) {
                // Always allow setting properties
                target[prop] = value;
                return true;
            }
        });
        
        // Also assign to globalThis for complete protection
        if (typeof globalThis !== 'undefined') {
            globalThis.b_ = window.b_;
        }
    } catch (error) {
        console.error("❌ Error creating b_ proxy:", error);
        // Fallback: just make sure b_ exists
        window.b_ = window.b_ || {};
        if (typeof globalThis !== 'undefined') {
            globalThis.b_ = globalThis.b_ || {};
        }
    }

    // Detect browser
    const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
    window.__IS_FIREFOX = isFirefox;
    
    if (isFirefox) {
        console.log("🦊 Firefox detected - applying aggressive compatibility fixes");
        
        // Override Object.defineProperty to prevent lockdown of b_
        try {
            const originalDefineProperty = Object.defineProperty;
            Object.defineProperty = function(obj, prop, descriptor) {
                try {
                    // Make b_ property always configurable in Firefox
                    if (prop === 'b_' && (obj === window || obj === globalThis)) {
                        console.log("🛡️ Intercepted attempt to define b_ property");
                        if (descriptor && descriptor.configurable === false) {
                            descriptor.configurable = true;
                            console.log("🔓 Made b_ property configurable");
                        }
                        
                        // Ensure b_ exists
                        window.b_ = window.b_ || {};
                        if (typeof globalThis !== 'undefined') {
                            globalThis.b_ = globalThis.b_ || {};
                        }
                    }
                    
                    return originalDefineProperty.call(Object, obj, prop, descriptor);
                } catch (error) {
                    console.warn("⚠️ Error in defineProperty:", error);
                    // Make sure nothing breaks
                    return obj;
                }
            };
            console.log("🔧 Object.defineProperty overridden for compatibility");
        } catch (error) {
            console.error("❌ Failed to override Object.defineProperty:", error);
        }
        
        // Prevent lockdown function from working
        try {
            window.lockdown = function() {
                console.log("🛑 SES lockdown intercepted and disabled");
                return false;
            };
            
            // Also try to neutralize any existing lockdown
            if (typeof globalThis !== 'undefined' && globalThis.lockdown) {
                globalThis.lockdown = window.lockdown;
            }
            console.log("🔧 Lockdown function neutralized");
        } catch (error) {
            console.error("❌ Failed to neutralize lockdown function:", error);
        }
        
        // Aggressively handle errors related to lockdown or b_
        window.addEventListener('error', function(event) {
            if (event.message && (
                event.message.includes('lockdown') || 
                event.message.includes('SES') || 
                event.message.includes('harden') ||
                event.message.includes('b_ is undefined') ||
                event.message.includes('b_ is') ||
                event.message.includes('Compartment')
            )) {
                console.warn("🚫 Intercepted SES/lockdown error:", event.message);
                event.preventDefault();
                event.stopPropagation();
                
                // Ensure b_ exists when errors happen
                window.b_ = window.b_ || {};
                if (typeof globalThis !== 'undefined') {
                    globalThis.b_ = globalThis.b_ || {};
                }
                
                return true; // Prevent error from propagating
            }
        }, true);
        
        // Set up MutationObserver to watch for script additions (especially vendor.js)
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.tagName === 'SCRIPT') {
                            // Check if it's a SES or vendor script
                            if (node.src && (
                                node.src.includes('vendor') || 
                                node.src.includes('lockdown') ||
                                node.src.includes('ses')
                            )) {
                                console.log("🔍 Detected SES/vendor script:", node.src);
                                
                                // Define b_ before script loads
                                window.b_ = window.b_ || {};
                                if (typeof globalThis !== 'undefined') {
                                    globalThis.b_ = globalThis.b_ || {};
                                }
                                
                                // Add a listener for when this script loads
                                node.addEventListener('load', function() {
                                    console.log("📜 Script loaded:", node.src);
                                    // Ensure b_ exists after script loads
                                    window.b_ = window.b_ || {};
                                    if (typeof globalThis !== 'undefined') {
                                        globalThis.b_ = globalThis.b_ || {};
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the document for script additions
        observer.observe(document, { childList: true, subtree: true });
        console.log("👁️ Document observer activated for script monitoring");
    }
    
    // Set Firefox compatibility mode in localStorage
    if (isFirefox) {
        localStorage.setItem('firefox_compatibility_mode', 'true');
        console.log("🦊 Firefox compatibility mode enabled in localStorage");
    }
})(); 