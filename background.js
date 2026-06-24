// CoReeder background service worker.
// Owns the context menu and delegates the API request to our secure backend server.

// Development backend:
// const BACKEND_API_URL = 'http://localhost:3000/api/explain';
// Production backend:
const BACKEND_BASE_URL = 'https://cooread.brimble.app';
const EXPLAIN_API_URL = `${BACKEND_BASE_URL}/api/explain`;
const SAVE_API_URL = `${BACKEND_BASE_URL}/api/articles/save`;
const CONTENT_SCRIPT_FILES = [
  'src/contentExtractor.js',
  'src/scrollTracker.js',
  'src/highlightMapper.js',
  'src/promptBuilder.js',
  'src/aiService.js',
  'src/tooltip.js',
  'src/content.js',
];
const CONTENT_STYLE_FILES = ['src/tooltip.css'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'coreeder-explain',
      title: 'Explain with CoReeder',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'coreeder-explain' && tab?.id) {
    requestExplanation(tab.id, info.selectionText || '');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && canInjectIntoUrl(tab.url)) {
    ensureContentScripts(tabId).catch((error) => {
      console.debug('[CoReeder] Content script was not injected automatically:', error.message);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COREEDER_EXPLAIN') {
    explainHighlight(message.prompt)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'COREEDER_SAVE_ARTICLE') {
    saveArticle(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function explainHighlight(prompt) {
  let email = 'anonymous';
  try {
    const userInfo = await new Promise((resolve) => {
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, resolve);
    });
    if (userInfo && userInfo.email) {
      email = userInfo.email;
    }
  } catch (err) {
    console.warn('Could not fetch user email', err);
  }

  // Use the test email if identity doesn't work locally without a domain
  email = 'simidusodiqt@gmail.com'; // Hardcoded for testing since we don't have a domain yet
  
  const response = await fetch(EXPLAIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, email }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const errMsg = errData?.error || await response.text();
    throw new Error(`Backend API error (${response.status}): ${errMsg}`);
  }

  const data = await response.json();
  const text = data?.text || 'No explanation was generated. Please try again.';

  return text.trim();
}

async function requestExplanation(tabId, selectionText) {
  try {
    await ensureContentScripts(tabId);

    await chrome.tabs.sendMessage(tabId, {
      type: 'EXPLAIN_SELECTION',
      selectionText,
    });
  } catch (error) {
    console.error('[CoReeder] Could not start explanation:', error);
  }
}

async function ensureContentScripts(tabId) {
  const [{ result: alreadyInjected } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Boolean(window.__coreederReady),
  });

  if (alreadyInjected) return;

  for (const cssFile of CONTENT_STYLE_FILES) {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: [cssFile],
    });
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_FILES,
  });
}

function canInjectIntoUrl(url = '') {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function saveArticle(payload) {
  let email = 'simidusodiqt@gmail.com'; // Hardcoded for testing without a domain
  
  const response = await fetch(SAVE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, email }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const errMsg = errData?.error || await response.text();
    throw new Error(`Backend API error (${response.status}): ${errMsg}`);
  }

  return response.json();
}
