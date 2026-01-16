// background.js
console.log('[AVA Bridge] Background worker active');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AVA_COMMAND') {
    console.log('[AVA Bridge] Relaying command:', request.payload.action);

    // Find all tabs
    chrome.tabs.query({}, (allTabs) => {
      // Filter out the sender's tab
      const targetTabs = allTabs.filter(t => t.id !== sender.tab?.id);
      
      if (targetTabs.length > 0) {
        let sentCount = 0;
        targetTabs.forEach(tab => {
          // We send to all tabs, and the content script will decide if it can act
          chrome.tabs.sendMessage(tab.id, request.payload, (response) => {
             if (chrome.runtime.lastError) {
                // Ignore
             } else {
                sentCount++;
             }
          });
        });
        console.log(`[AVA Bridge] Command broadcasted to ${targetTabs.length} tabs`);
        sendResponse({ status: 'broadcasted', count: targetTabs.length });
      } else {
        console.warn('[AVA Bridge] No target tabs found');
        sendResponse({ status: 'no_target' });
      }
    });
    return true;
  }
});
