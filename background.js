// CoReeder background service worker.
// Owns the context menu and the Azure request so content scripts never make cross-origin calls.

const AZURE_API_KEY = '';
const AZURE_RESOURCE_NAME = '';
const AZURE_DEPLOYMENT_NAME = 'gpt-4o-mini';
const AZURE_API_VERSION = '2024-08-01-preview';

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
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXPLAIN_SELECTION',
      selectionText: info.selectionText || '',
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'COREEDER_EXPLAIN') {
    return undefined;
  }

  explainHighlight(message.prompt)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

function getAzureApiUrl() {
  if (!AZURE_API_KEY || !AZURE_RESOURCE_NAME || !AZURE_DEPLOYMENT_NAME) {
    return null;
  }

  return `https://${AZURE_RESOURCE_NAME}.openai.azure.com/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_API_VERSION}`;
}

async function explainHighlight(prompt) {
  const apiUrl = getAzureApiUrl();

  if (!apiUrl) {
    throw new Error(
      'Azure OpenAI is not configured. Add local Azure settings in background.js before testing this extension.'
    );
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Azure OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text =
    data?.choices?.[0]?.message?.content ||
    'No explanation was generated. Please try again.';

  return text.trim();
}
