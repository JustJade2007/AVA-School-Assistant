// content_ava.js
console.log('[AVA Bridge] Content script loaded on AVA App');

// Inject a script into the page context to send the handshake
// This breaks out of the content script sandbox
const injectHandshake = () => {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      console.log('[AVA Bridge] Injecting beacon...');
      const sendBeacon = () => {
        window.postMessage({ type: 'AVA_EXTENSION_READY', version: '1.0' }, '*');
      };
      sendBeacon();
      setInterval(sendBeacon, 2000);
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};

injectHandshake();

window.addEventListener('message', (event) => {
  // Only accept messages that have our specific type
  if (event.data && event.data.type === 'AVA_ACTION') {
    console.log('[AVA Bridge] Received action from App:', event.data.action, event.data.payload);
    
    chrome.runtime.sendMessage({
      type: 'AVA_COMMAND',
      payload: event.data
    }, (response) => {
       if (chrome.runtime.lastError) {
         console.error('[AVA Bridge] Error sending to background:', chrome.runtime.lastError);
       } else {
         console.log('[AVA Bridge] Message relayed to background');
       }
    });
  }
});
