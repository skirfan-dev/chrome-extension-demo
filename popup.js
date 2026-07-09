let statsInterval = null;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isMatiks(url) {
  return url && (url.includes('matiks.in') || url.includes('matiks.org'));
}

async function sendToContent(msg) {
  const tab = await getCurrentTab();
  if (!tab || !isMatiks(tab.url)) return null;
  return chrome.tabs.sendMessage(tab.id, msg).catch(() => null);
}

function updateUI(active, count, lastQ) {
  const dot = document.getElementById('dot');
  const statusText = document.getElementById('status-text');
  const countEl = document.getElementById('count');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const lastQEl = document.getElementById('last-q');
  if (dot) dot.className = 'dot' + (active ? ' active' : '');
  if (statusText) statusText.textContent = active ? 'BOT ACTIVE 🟢' : 'Inactive';
  if (countEl) countEl.textContent = count || 0;
  if (startBtn) startBtn.disabled = active;
  if (stopBtn) stopBtn.disabled = !active;
  if (lastQEl && lastQ) lastQEl.textContent = '📝 ' + lastQ;
}

async function init() {
  const tab = await getCurrentTab();
  if (!isMatiks(tab?.url)) {
    document.getElementById('main-ui').style.display = 'none';
    document.getElementById('not-matiks').style.display = 'block';
    return;
  }

  const status = await sendToContent({ type: 'STATUS' });
  if (status) updateUI(status.active, status.count);

  // Restore auto-rematch state
  const autoRematchEl = document.getElementById('autoRematch');
  chrome.storage.local.get('autoRematch', (data) => {
    autoRematchEl.checked = !!data.autoRematch;
    sendToContent({ type: 'SET_AUTO_REMATCH', value: !!data.autoRematch });
  });

  autoRematchEl.addEventListener('change', () => {
    const val = autoRematchEl.checked;
    chrome.storage.local.set({ autoRematch: val });
    sendToContent({ type: 'SET_AUTO_REMATCH', value: val });
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
    await sendToContent({ type: 'START' });
    updateUI(true, 0);
    startPolling();
  });

  document.getElementById('stopBtn').addEventListener('click', async () => {
    await sendToContent({ type: 'STOP' });
    updateUI(false, 0);
    stopPolling();
  });

  if (status?.active) startPolling();
}

function startPolling() {
  stopPolling();
  statsInterval = setInterval(async () => {
    const status = await sendToContent({ type: 'STATUS' });
    if (status) updateUI(status.active, status.count);
  }, 500);
}

function stopPolling() {
  if (statsInterval) clearInterval(statsInterval);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATS') updateUI(true, msg.count, msg.last);
});

init();
