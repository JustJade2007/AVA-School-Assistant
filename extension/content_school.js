// content_school.js
console.log('[AVA Bridge] School site content script loaded');

// Listen for commands from the extension background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'EXECUTE_SEQUENCE') {
    const { sequence } = message.payload;
    if (sequence && Array.isArray(sequence)) {
      console.log(`[AVA Bridge] Executing sequence of ${sequence.length} actions`);
      executeSequence(sequence);
    }
  } else if (message.action === 'SELECT_ANSWER') {
    // Fallback for legacy calls
    if (message.payload.text) {
        selectOptionByText(message.payload.text).then(found => {
            if (found) {
                found.click();
                if (message.payload.clickNext) {
                    setTimeout(clickNextButton, 1000);
                }
            }
        });
    }
  }
});

// Listen for relayed clicks from parent frames (handling nested iframes)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AVA_RELAY_CLICK') {
        const { x, y } = event.data;
        console.log(`[AVA Bridge] Received relayed click at local ${x.toFixed(0)}, ${y.toFixed(0)}`);
        performClickAt(x, y);
    }
});

async function executeSequence(sequence) {
  for (const step of sequence) {
    console.log(`[AVA Bridge] Step: ${step.type} - ${step.description || ''}`);
    
    if (step.type === 'wait') {
      await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
    } 
    else if (step.type === 'click') {
      // Coordinate-based click
      // We only execute this if we are the TOP frame, or if we figure out logic later.
      // Actually, standard approach: Top frame handles the coordinate mapping.
      if (window === window.top) {
          const targetX = step.x * window.innerWidth;
          const targetY = step.y * window.innerHeight;
          performClickAt(targetX, targetY);
      }
    }
    else if (step.type === 'text_click') {
      // Fallback text search
      const el = await selectOptionByText(step.text);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 200)); // Wait for scroll
          simulateClick(el);
      }
    }
    else if (step.type === 'next_click') {
      // Fallback next button search
      clickNextButton();
    }
  }
}

function performClickAt(x, y) {
    // 1. Visual Indicator (Debug)
    showDebugDot(x, y);

    // 2. Find element
    const el = document.elementFromPoint(x, y);
    
    if (el) {
        console.log('[AVA Bridge] Element at point:', el.tagName, el.className);
        
        // 3. Check if it's an iframe
        if (el.tagName === 'IFRAME') {
            const rect = el.getBoundingClientRect();
            const relX = x - rect.left;
            const relY = y - rect.top;
            console.log(`[AVA Bridge] Relaying click into IFRAME at ${relX}, ${relY}`);
            el.contentWindow.postMessage({ type: 'AVA_RELAY_CLICK', x: relX, y: relY }, '*');
        } else {
            // 4. Click it!
            simulateClick(el);
        }
    } else {
        console.warn('[AVA Bridge] No element found at', x, y);
    }
}

function simulateClick(el) {
    if (!el) return;
    console.log('[AVA Bridge] Simulating click on', el);
    
    el.focus && el.focus();

    const events = [
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }),
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1 }),
        new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }),
        new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 1 }),
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window, buttons: 1 })
    ];

    events.forEach(event => el.dispatchEvent(event));
    
    // Also try standard click method
    if (typeof el.click === 'function') el.click();
}

function showDebugDot(x, y) {
    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = (x - 10) + 'px';
    dot.style.top = (y - 10) + 'px';
    dot.style.width = '20px';
    dot.style.height = '20px';
    dot.style.backgroundColor = 'red';
    dot.style.border = '2px solid white';
    dot.style.borderRadius = '50%';
    dot.style.zIndex = '2147483647'; // Max Z-Index
    dot.style.pointerEvents = 'none';
    dot.style.transition = 'opacity 0.5s, transform 0.5s';
    dot.style.transform = 'scale(0)';
    
    document.body.appendChild(dot);
    
    // Animate in
    requestAnimationFrame(() => {
        dot.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        dot.style.opacity = '0';
        dot.style.transform = 'scale(2)';
        setTimeout(() => dot.remove(), 500);
    }, 2000); // Lasts 2 seconds
}

// ... Legacy text search functions ...
async function selectOptionByText(text) {
  const normalizedText = text.trim().toLowerCase();
  const elements = document.querySelectorAll('button, label, p, span, div, li, [role="radio"], [role="checkbox"]');
  let bestMatch = null;

  for (const el of elements) {
    if (el.children.length > 5) continue;
    const elText = el.innerText.trim().toLowerCase();
    if (elText === normalizedText) return el;
    if (elText.length > 2 && (normalizedText.includes(elText) || elText.includes(normalizedText))) {
       if (!bestMatch || elText.length > bestMatch.innerText.trim().length) bestMatch = el;
    }
  }
  return bestMatch;
}

function clickNextButton() {
  const nextKeywords = ['next', 'continue', 'submit', 'check', 'confirm', 'arrow_forward', 'forward', 'submit answer', 'save & next'];
  const buttons = document.querySelectorAll('button, [role="button"], a.btn, input[type="button"], input[type="submit"]');
  for (const btn of buttons) {
    const text = (btn.innerText || btn.value || '').trim().toLowerCase();
    if (nextKeywords.some(k => text === k || text.includes(k))) {
       if (text.includes('prev') || text.includes('back')) continue;
       simulateClick(btn);
       return true;
    }
  }
  return false;
}
