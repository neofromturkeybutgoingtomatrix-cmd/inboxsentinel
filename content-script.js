/**
 * InboxSentinel v0.1.1 — Simple & works
 * Scans inbox, suggests newsletters, redirects to unsubscribe page.
 */

(function() {
  'use strict';

  // ─── Scan ──────────────────────────────────────────────────

  function scanInbox() {
    const rows = document.querySelectorAll('tr.zA');
    const results = [];
    rows.forEach(row => {
      try {
        const senderEl = row.querySelector('span.yP, span.zF');
        const emailAttr = row.querySelector('[email]');
        const subjectEl = row.querySelector('span.y6');
        const dateEl = row.querySelector('span.xW');
        
        let sender = '', email = '';
        if (emailAttr) {
          email = emailAttr.getAttribute('email') || '';
          sender = emailAttr.getAttribute('name') || email.split('@')[0];
        }
        if (!sender && senderEl) sender = senderEl.textContent.trim();
        const subject = subjectEl ? subjectEl.textContent.trim() : '';
        const dateText = dateEl ? (dateEl.getAttribute('title') || dateEl.textContent.trim()) : '';

        if (sender) results.push({ sender, email, subject: subject.substring(0, 80), date: dateText,
          domain: email.split('@')[1] || '' });
      } catch(e) {}
    });
    return results;
  }

  function aggregateSenders(emails) {
    const map = {};
    emails.forEach(e => {
      const key = e.email || e.domain || e.sender;
      if (!map[key]) map[key] = { sender: e.sender, email: e.email, domain: e.domain, count: 0, lastSeen: e.date };
      map[key].count++;
      map[key].lastSeen = e.date;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }

  function getCurrentTab() {
    const tabs = document.querySelectorAll('div.aKh, div[role="tab"]');
    for (const tab of tabs) {
      if (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('nZ'))
        return tab.textContent.trim();
    }
    return 'Primary';
  }

  // ─── Unsubscribe: click email → find link → open in new tab ─

  async function findAndOpenUnsub(senderName) {
    // Find first email from this sender
    const rows = document.querySelectorAll('tr.zA');
    for (const row of rows) {
      const senderEl = row.querySelector('span.yP, span.zF');
      const emailEl = row.querySelector('[email]');
      const name = senderEl ? senderEl.textContent.trim() : '';
      const emailName = emailEl ? (emailEl.getAttribute('name') || '') : '';
      if (name === senderName || name.includes(senderName) || emailName === senderName) {
        row.click();
        await sleep(2000);

        // Find unsubscribe link in opened email
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const href = (link.href || '').toLowerCase();
          const text = link.textContent.toLowerCase().trim();
          // Skip Google account links
          if (href.includes('myaccount.google.com') || href.includes('accounts.google.com')) continue;
          // Match unsubscribe links
          if (text === 'unsubscribe' || text === 'unsubscribe from this sender' ||
              href.includes('/unsubscribe') || href.includes('list-unsubscribe') ||
              href.includes('optout') || href.includes('opt-out') ||
              (href.includes('manage') && text.includes('pref')) ||
              (href.includes('email-preference'))) {
            window.open(link.href, '_blank');
            return { success: true, method: 'found_link' };
          }
        }
        // Nothing found
        return { success: false, error: 'No unsubscribe link in this email' };
      }
    }
    return { success: false, error: 'Sender not found in current view' };
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── Message Handler ───────────────────────────────────────

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scan') {
      const emails = scanInbox();
      sendResponse({ emails, senders: aggregateSenders(emails), tab: getCurrentTab(), total: emails.length });
    } else if (request.action === 'unsub') {
      findAndOpenUnsub(request.senderName).then(sendResponse);
      return true;
    }
    return true;
  });

  // ─── Auto-Scan ─────────────────────────────────────────────

  let lastHash = '';
  setInterval(() => {
    const emails = scanInbox();
    const hash = emails.map(e => e.sender).join('|');
    if (hash !== lastHash) {
      lastHash = hash;
      chrome.storage.local.set({ inboxsentinel_last_scan: {
        emails, senders: aggregateSenders(emails), tab: getCurrentTab(), total: emails.length, timestamp: Date.now()
      }});
    }
  }, 2000);

  setTimeout(() => {
    const emails = scanInbox();
    chrome.storage.local.set({ inboxsentinel_last_scan: {
      emails, senders: aggregateSenders(emails), tab: getCurrentTab(), total: emails.length, timestamp: Date.now()
    }});
  }, 3000);
})();
