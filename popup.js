/**
 * InboxSentinel v0.2 — Redesigned popup logic
 * Clean cards, visual engagement bars, smart sender categorization.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadLastScan();
  document.getElementById('scan-btn').addEventListener('click', scanInbox);
  document.getElementById('unsub-all-btn').addEventListener('click', unsubAll);
});

const AVATAR_COLORS = ['av-green', 'av-blue', 'av-purple', 'av-orange', 'av-red', 'av-gray'];
const TRANSACTIONAL_DOMAINS = [
  'gmail.com', 'google.com', 'googlepayments.com', 'accounts.google.com',
  'github.com', 'surge.sh', 'ionos.com', 'ionos.', 'coinbase.com',
  'slack.com', 'superhuman.com', 'resend.com', 'resend.dev'
];

function getAvatarClass(sender, index) {
  const d = (sender.domain || '').toLowerCase();
  const e = (sender.email || '').split('@')[1] || '';
  const isTx = TRANSACTIONAL_DOMAINS.some(t => d.includes(t) || e.includes(t));
  if (isTx) return 'av-gray';
  return AVATAR_COLORS[index % (AVATAR_COLORS.length - 1)];
}

function getBarLevel(count) {
  if (count <= 2) return 'bar-low';
  if (count <= 5) return 'bar-med';
  return 'bar-high';
}

function getBarWidth(count, maxCount) {
  return Math.max(5, (count / Math.max(maxCount, 1)) * 100);
}

async function loadLastScan() {
  const { inboxsentinel_last_scan } = await chrome.storage.local.get('inboxsentinel_last_scan');
  if (inboxsentinel_last_scan?.senders?.length > 0) {
    render(inboxsentinel_last_scan);
  }
}

async function scanInbox() {
  setStatus('Scanning...');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('mail.google.com')) {
    setStatus('Open Gmail first');
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'scan' });
    if (result?.senders) {
      await chrome.storage.local.set({ inboxsentinel_last_scan: { ...result, timestamp: Date.now() } });
      render({ ...result, timestamp: Date.now() });
      setStatus(`${result.senders.length} senders · ${result.total} emails · ${result.tab} tab`);
    } else {
      setStatus('No emails found — scroll to load more');
    }
  } catch (err) {
    setStatus('Refresh Gmail page and try again');
  }
}

function render(data) {
  const senders = data.senders || [];
  const maxCount = Math.max(...senders.map(s => s.count), 1);

  document.getElementById('total-senders').textContent = senders.length;
  document.getElementById('total-emails').textContent = data.total || 0;

  // Suggested: 3+ emails, non-transactional
  const suggested = senders.filter(s => {
    const d = (s.domain || '').toLowerCase();
    const e = (s.email || '').split('@')[1] || '';
    return s.count >= 3 && !TRANSACTIONAL_DOMAINS.some(t => d.includes(t) || e.includes(t));
  });
  document.getElementById('to-unsub').textContent = suggested.length;
  document.getElementById('unsub-all-btn').style.display = suggested.length > 0 ? '' : 'none';

  const list = document.getElementById('sender-list');
  if (senders.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><p>No senders found</p></div>`;
    return;
  }

  list.innerHTML = senders.map((s, i) => {
    const initials = (s.sender || '?').substring(0, 2).toUpperCase();
    const avClass = getAvatarClass(s, i);
    const barClass = getBarLevel(s.count);
    const barWidth = getBarWidth(s.count, maxCount);
    const domain = s.domain || s.email?.split('@')[1] || '';
    const isSuggested = suggested.includes(s);
    const d = domain.toLowerCase();
    const e = (s.email || '').split('@')[1] || '';
    const isTx = TRANSACTIONAL_DOMAINS.some(t => d.includes(t) || e.includes(t));
    const favicon = `https://www.google.com/s2/favicons?domain=${esc(domain)}&sz=64`;

    return `
      <div class="card" data-sender="${esc(s.sender)}">
        <div class="avatar ${avClass}" style="background-image:url('${favicon}')">${initials}</div>
        <div class="info">
          <div class="name">${esc(s.sender || domain)}</div>
          <div class="domain">${esc(domain)}</div>
          <div class="bar-wrap"><div class="bar-fill ${barClass}" style="width:${barWidth}%"></div></div>
        </div>
        <div class="meta">
          <div class="count">${s.count}</div>
          ${isTx 
            ? `<div class="tag tag-service">service</div>`
            : isSuggested
              ? `<div class="tag tag-unsub" data-sender="${esc(s.sender)}">Unsub</div>`
              : ''}
        </div>
      </div>`;
  }).join('');

  // Favicon fallback: if image fails, show initials
  list.querySelectorAll('.avatar').forEach(av => {
    const img = new Image();
    img.onerror = () => { av.style.backgroundImage = 'none'; };
    img.src = av.style.backgroundImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1');
  });
  list.querySelectorAll('.tag-unsub').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      unsubSender(tag.dataset.sender);
    });
  });
}

async function unsubSender(senderName) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  setStatus(`Unsubscribing from ${senderName.substring(0, 25)}...`);
  const result = await chrome.tabs.sendMessage(tab.id, { action: 'unsub', senderName });
  if (result?.success) setStatus('Unsubscribe page opened — confirm there');
  else setStatus(result?.error || 'Failed');
}

async function unsubAll() {
  const tags = document.querySelectorAll('.tag-unsub');
  if (tags.length === 0) return;
  setStatus(`Processing ${tags.length} senders...`);
  for (const tag of tags) {
    tag.click();
    await new Promise(r => setTimeout(r, 1000));
  }
  setStatus(`Done — check opened tabs`);
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}
