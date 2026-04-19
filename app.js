/* ================================================================
   Tab Garden — Dashboard App (Tabs + Bookmarks)

   Merges Tab Out (tab manager) and Bookmark Out (bookmark viewer)
   into a single dashboard with a view switcher.
   ================================================================ */

'use strict';

/* ================================================================
   SHARED HELPERS
   ================================================================ */

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5)  return 'Hey, night owl';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hey, night owl';
}

function getDateDisplay() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastText').textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function getFaviconUrl(url) {
  const domain = getDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr);
  const now  = new Date();
  const diffMins  = Math.floor((now - then) / 60000);
  const diffHours = Math.floor((now - then) / 3600000);
  const diffDays  = Math.floor((now - then) / 86400000);
  if (diffMins < 1)   return 'just now';
  if (diffMins < 60)  return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hr' + (diffHours !== 1 ? 's' : '') + ' ago';
  if (diffDays === 1) return 'yesterday';
  return diffDays + ' days ago';
}

/* Accent color cycling */
const ACCENT_CLASSES = ['accent-amber', 'accent-sage', 'accent-blue', 'accent-rose'];
const ICON_CLASSES   = ['amber', 'sage', 'blue', 'rose'];

/* SVG Icons */
const ICONS = {
  tabs:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18" /></svg>`,
  close:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
  focus:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>`,
  folder:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>`,
  delete:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`,
};


/* ================================================================
   CURRENT VIEW STATE
   ================================================================ */

let currentView = 'tabs'; // 'tabs' or 'bookmarks'


/* ================================================================
   CHROME TABS API — Direct Access
   ================================================================ */

let openTabs = [];

async function fetchOpenTabs() {
  try {
    const extensionId = chrome.runtime.id;
    const newtabUrl = `chrome-extension://${extensionId}/index.html`;
    const tabs = await chrome.tabs.query({});
    openTabs = tabs.map(t => ({
      id: t.id, url: t.url, title: t.title,
      windowId: t.windowId, active: t.active,
      isTabGarden: t.url === newtabUrl || t.url === 'chrome://newtab/',
    }));
  } catch { openTabs = []; }
}

async function closeTabsByUrls(urls) {
  if (!urls || urls.length === 0) return;
  const targetHostnames = [];
  const exactUrls = new Set();
  for (const u of urls) {
    if (u.startsWith('file://')) { exactUrls.add(u); }
    else { try { targetHostnames.push(new URL(u).hostname); } catch {} }
  }
  const allTabs = await chrome.tabs.query({});
  const toClose = allTabs.filter(tab => {
    const tabUrl = tab.url || '';
    if (tabUrl.startsWith('file://') && exactUrls.has(tabUrl)) return true;
    try { const h = new URL(tabUrl).hostname; return h && targetHostnames.includes(h); }
    catch { return false; }
  }).map(tab => tab.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function closeTabsExact(urls) {
  if (!urls || urls.length === 0) return;
  const urlSet = new Set(urls);
  const allTabs = await chrome.tabs.query({});
  const toClose = allTabs.filter(t => urlSet.has(t.url)).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function focusTab(url) {
  if (!url) return;
  const allTabs = await chrome.tabs.query({});
  const currentWindow = await chrome.windows.getCurrent();
  let matches = allTabs.filter(t => t.url === url);
  if (matches.length === 0) {
    try {
      const targetHost = new URL(url).hostname;
      matches = allTabs.filter(t => { try { return new URL(t.url).hostname === targetHost; } catch { return false; } });
    } catch {}
  }
  if (matches.length === 0) return;
  const match = matches.find(t => t.windowId !== currentWindow.id) || matches[0];
  await chrome.tabs.update(match.id, { active: true });
  await chrome.windows.update(match.windowId, { focused: true });
}

async function closeDuplicateTabs(urls, keepOne = true) {
  const allTabs = await chrome.tabs.query({});
  const toClose = [];
  for (const url of urls) {
    const matching = allTabs.filter(t => t.url === url);
    if (keepOne) {
      const keep = matching.find(t => t.active) || matching[0];
      for (const tab of matching) { if (tab.id !== keep.id) toClose.push(tab.id); }
    } else {
      for (const tab of matching) toClose.push(tab.id);
    }
  }
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

async function closeTabOutDupes() {
  const extensionId = chrome.runtime.id;
  const newtabUrl = `chrome-extension://${extensionId}/index.html`;
  const allTabs = await chrome.tabs.query({});
  const currentWindow = await chrome.windows.getCurrent();
  const gardenTabs = allTabs.filter(t => t.url === newtabUrl || t.url === 'chrome://newtab/');
  if (gardenTabs.length <= 1) return;
  const keep = gardenTabs.find(t => t.active && t.windowId === currentWindow.id) || gardenTabs.find(t => t.active) || gardenTabs[0];
  const toClose = gardenTabs.filter(t => t.id !== keep.id).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}


/* ================================================================
   SAVED FOR LATER — chrome.storage.local
   ================================================================ */

async function saveTabForLater(tab) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  deferred.push({
    id: Date.now().toString(), url: tab.url, title: tab.title,
    savedAt: new Date().toISOString(), completed: false, dismissed: false,
  });
  await chrome.storage.local.set({ deferred });
}

async function getSavedTabs() {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const visible = deferred.filter(t => !t.dismissed);
  return { active: visible.filter(t => !t.completed), archived: visible.filter(t => t.completed) };
}

async function checkOffSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) { tab.completed = true; tab.completedAt = new Date().toISOString(); await chrome.storage.local.set({ deferred }); }
}

async function dismissSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) { tab.dismissed = true; await chrome.storage.local.set({ deferred }); }
}


/* ================================================================
   UI EFFECTS — Sound + Confetti
   ================================================================ */

function playCloseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const duration = 0.25;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length;
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function shootConfetti(x, y) {
  const colors = ['#c8713a', '#e8a070', '#5a7a62', '#8aaa92', '#5a6b7a', '#8a9baa', '#d4b896', '#b35a5a'];
  for (let i = 0; i < 17; i++) {
    const el = document.createElement('div');
    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};border-radius:${isCircle ? '50%' : '2px'};pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:1;`;
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 80;
    const gravity = 200;
    const startTime = performance.now();
    const dur = 700 + Math.random() * 200;
    function frame(now) {
      const elapsed = (now - startTime) / 1000;
      const progress = elapsed / (dur / 1000);
      if (progress >= 1) { el.remove(); return; }
      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const rotate = elapsed * 200 * (isCircle ? 0 : 1);
      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rotate}deg)`;
      el.style.opacity = opacity;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}

function animateCardOut(card) {
  if (!card) return;
  const rect = card.getBoundingClientRect();
  shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  card.classList.add('closing');
  setTimeout(() => { card.remove(); checkAndShowEmptyState(); }, 300);
}

function checkAndShowEmptyState() {
  const grid = document.getElementById('tabsGrid');
  if (!grid) return;
  const remaining = grid.querySelectorAll('.card:not(.closing)').length;
  if (remaining > 0) return;
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div class="empty-title">Inbox zero, but for tabs.</div>
      <div class="empty-subtitle">You're free.</div>
    </div>`;
}


/* ================================================================
   DOMAIN & TITLE CLEANUP
   ================================================================ */

const FRIENDLY_DOMAINS = {
  'github.com': 'GitHub', 'www.github.com': 'GitHub', 'gist.github.com': 'GitHub Gist',
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube', 'music.youtube.com': 'YouTube Music',
  'x.com': 'X', 'www.x.com': 'X', 'twitter.com': 'X', 'www.twitter.com': 'X',
  'reddit.com': 'Reddit', 'www.reddit.com': 'Reddit', 'old.reddit.com': 'Reddit',
  'substack.com': 'Substack', 'www.substack.com': 'Substack',
  'medium.com': 'Medium', 'www.medium.com': 'Medium',
  'linkedin.com': 'LinkedIn', 'www.linkedin.com': 'LinkedIn',
  'stackoverflow.com': 'Stack Overflow', 'www.stackoverflow.com': 'Stack Overflow',
  'news.ycombinator.com': 'Hacker News',
  'google.com': 'Google', 'www.google.com': 'Google',
  'mail.google.com': 'Gmail', 'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive', 'calendar.google.com': 'Google Calendar',
  'meet.google.com': 'Google Meet', 'gemini.google.com': 'Gemini',
  'chatgpt.com': 'ChatGPT', 'www.chatgpt.com': 'ChatGPT', 'chat.openai.com': 'ChatGPT',
  'claude.ai': 'Claude', 'www.claude.ai': 'Claude', 'code.claude.com': 'Claude Code',
  'notion.so': 'Notion', 'www.notion.so': 'Notion',
  'figma.com': 'Figma', 'www.figma.com': 'Figma',
  'slack.com': 'Slack', 'app.slack.com': 'Slack',
  'discord.com': 'Discord', 'www.discord.com': 'Discord',
  'wikipedia.org': 'Wikipedia', 'en.wikipedia.org': 'Wikipedia',
  'amazon.com': 'Amazon', 'www.amazon.com': 'Amazon',
  'netflix.com': 'Netflix', 'www.netflix.com': 'Netflix',
  'spotify.com': 'Spotify', 'open.spotify.com': 'Spotify',
  'vercel.com': 'Vercel', 'www.vercel.com': 'Vercel',
  'npmjs.com': 'npm', 'www.npmjs.com': 'npm',
  'developer.mozilla.org': 'MDN', 'arxiv.org': 'arXiv', 'www.arxiv.org': 'arXiv',
  'huggingface.co': 'Hugging Face', 'www.huggingface.co': 'Hugging Face',
  'producthunt.com': 'Product Hunt', 'www.producthunt.com': 'Product Hunt',
  'xiaohongshu.com': 'RedNote', 'www.xiaohongshu.com': 'RedNote',
  'local-files': 'Local Files',
};

function friendlyDomain(hostname) {
  if (!hostname) return '';
  if (FRIENDLY_DOMAINS[hostname]) return FRIENDLY_DOMAINS[hostname];
  if (hostname.endsWith('.substack.com') && hostname !== 'substack.com') return capitalize(hostname.replace('.substack.com', '')) + "'s Substack";
  if (hostname.endsWith('.github.io')) return capitalize(hostname.replace('.github.io', '')) + ' (GitHub Pages)';
  let clean = hostname.replace(/^www\./, '').replace(/\.(com|org|net|io|co|ai|dev|app|so|me|xyz|info|us|uk|co\.uk|co\.jp)$/, '');
  return clean.split('.').map(part => capitalize(part)).join(' ');
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function stripTitleNoise(title) {
  if (!title) return '';
  title = title.replace(/^\(\d+\+?\)\s*/, '');
  title = title.replace(/\s*\([\d,]+\+?\)\s*/g, ' ');
  title = title.replace(/\s*[\-\u2010-\u2015]\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/\s+on X:\s*/, ': ');
  title = title.replace(/\s*\/\s*X\s*$/, '');
  return title.trim();
}

function cleanTitle(title, hostname) {
  if (!title || !hostname) return title || '';
  const friendly = friendlyDomain(hostname);
  const domain = hostname.replace(/^www\./, '');
  const seps = [' - ', ' | ', ' — ', ' · ', ' – '];
  for (const sep of seps) {
    const idx = title.lastIndexOf(sep);
    if (idx === -1) continue;
    const suffix = title.slice(idx + sep.length).trim().toLowerCase();
    if (suffix === domain.toLowerCase() || suffix === friendly.toLowerCase() || suffix === domain.replace(/\.\w+$/, '').toLowerCase() || domain.toLowerCase().includes(suffix) || friendly.toLowerCase().includes(suffix)) {
      const cleaned = title.slice(0, idx).trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return title;
}

function smartTitle(title, url) {
  if (!url) return title || '';
  let pathname = '', hostname = '';
  try { const u = new URL(url); pathname = u.pathname; hostname = u.hostname; }
  catch { return title || ''; }
  const titleIsUrl = !title || title === url || title.startsWith(hostname) || title.startsWith('http');
  if ((hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'www.x.com') && pathname.includes('/status/')) {
    const username = pathname.split('/')[1];
    if (username) return titleIsUrl ? `Post by @${username}` : title;
  }
  if (hostname === 'github.com' || hostname === 'www.github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo, ...rest] = parts;
      if (rest[0] === 'issues' && rest[1]) return `${owner}/${repo} Issue #${rest[1]}`;
      if (rest[0] === 'pull' && rest[1]) return `${owner}/${repo} PR #${rest[1]}`;
      if (rest[0] === 'blob' || rest[0] === 'tree') return `${owner}/${repo} — ${rest.slice(2).join('/')}`;
      if (titleIsUrl) return `${owner}/${repo}`;
    }
  }
  if ((hostname === 'www.youtube.com' || hostname === 'youtube.com') && pathname === '/watch') {
    if (titleIsUrl) return 'YouTube Video';
  }
  if ((hostname === 'www.reddit.com' || hostname === 'reddit.com' || hostname === 'old.reddit.com') && pathname.includes('/comments/')) {
    const parts = pathname.split('/').filter(Boolean);
    const subIdx = parts.indexOf('r');
    if (subIdx !== -1 && parts[subIdx + 1] && titleIsUrl) return `r/${parts[subIdx + 1]} post`;
  }
  return title || url;
}


/* ================================================================
   TAB VIEW — Domain Grouping & Rendering
   ================================================================ */

let domainGroups = [];

function getRealTabs() {
  return openTabs.filter(t => {
    const url = t.url || '';
    return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('about:') && !url.startsWith('edge://') && !url.startsWith('brave://');
  });
}

function checkTabOutDupes() {
  const tabGardenTabs = openTabs.filter(t => t.isTabGarden);
  const banner = document.getElementById('tabOutDupeBanner');
  const countEl = document.getElementById('tabOutDupeCount');
  if (!banner) return;
  if (tabGardenTabs.length > 1) {
    if (countEl) countEl.textContent = tabGardenTabs.length;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function renderTabRow(tab, urlCounts, groupDomain) {
  let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), groupDomain);
  try {
    const parsed = new URL(tab.url);
    if (parsed.hostname === 'localhost' && parsed.port) label = `${parsed.port} ${label}`;
  } catch {}
  const count = urlCounts[tab.url] || 1;
  const dupeTag = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
  const safeUrl = (tab.url || '').replace(/"/g, '&quot;');
  const safeTitle = label.replace(/"/g, '&quot;');
  let domain = '';
  try { domain = new URL(tab.url).hostname; } catch {}
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';

  return `<div class="item-row" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
    ${faviconUrl ? `<img class="item-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
    <span class="item-title">${label}</span>${dupeTag}
    <div class="item-actions">
      <button class="item-action save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="Save for later">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
      </button>
      <button class="item-action close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="Close this tab">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  </div>`;
}

function renderDomainCard(group, index) {
  const tabs = group.tabs || [];
  const tabCount = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');
  const accentClass = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
  const iconClass = ICON_CLASSES[index % ICON_CLASSES.length];

  const urlCounts = {};
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes = dupeUrls.length > 0;
  const totalExtras = dupeUrls.reduce((s, [, c]) => s + c - 1, 0);

  // Deduplicate for display
  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) { if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); } }

  const tabRows = uniqueTabs.map(tab => renderTabRow(tab, urlCounts, group.domain)).join('');

  const dupeBadge = hasDupes ? `<span class="card-badge" style="color:var(--accent);background:var(--accent-light)">${totalExtras} dupe${totalExtras !== 1 ? 's' : ''}</span>` : '';

  let actionsHtml = `<button class="card-btn close-tabs" data-action="close-domain-tabs" data-domain-id="${stableId}">${ICONS.close} Close all ${tabCount}</button>`;
  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    actionsHtml += `<button class="card-btn" data-action="dedup-keep-one" data-dupe-urls="${dupeUrlsEncoded}">Close ${totalExtras} dupe${totalExtras !== 1 ? 's' : ''}</button>`;
  }

  return `
    <div class="card ${accentClass} ${hasDupes ? '' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="card-top">
        <div class="card-icon ${iconClass}">${ICONS.tabs}</div>
        <span class="card-name">${isLanding ? 'Homepages' : (group.label || friendlyDomain(group.domain))}</span>
        <span class="card-badge">${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>
        ${dupeBadge}
      </div>
      <div class="item-list">${tabRows}</div>
      <div class="card-actions">${actionsHtml}</div>
    </div>`;
}


/* ================================================================
   BOOKMARK VIEW — Tree Reader & Rendering
   ================================================================ */

let allBookmarkFolders = [];
let allBookmarksFlat = [];
let selectedFolderId = '__all__';

async function getBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  let totalBookmarks = 0;

  function walk(nodes, path, depth, parentId) {
    for (const node of nodes) {
      if (node.url) continue;
      const folderName = node.title || 'Bookmarks';
      const folderPath = path ? `${path} / ${folderName}` : folderName;
      const bookmarks = (node.children || []).filter(c => c.url).map(c => ({
        id: c.id, title: c.title || c.url, url: c.url,
      }));
      const childFolderIds = (node.children || []).filter(c => !c.url).map(c => c.id);
      if (bookmarks.length > 0 || childFolderIds.length > 0) {
        folders.push({ id: node.id, name: folderName, path: folderPath, bookmarks, depth, parentId, childFolderIds });
        totalBookmarks += bookmarks.length;
      }
      if (node.children) walk(node.children, folderPath, depth + 1, node.id);
    }
  }

  walk(tree, '', 0, null);
  return { folders, totalBookmarks };
}

function buildFlatIndex(folders) {
  allBookmarksFlat = [];
  for (const folder of folders) {
    for (const bm of folder.bookmarks) {
      allBookmarksFlat.push({ ...bm, folderName: folder.name });
    }
  }
}

function renderBookmarkRow(bm) {
  const favicon = getFaviconUrl(bm.url);
  const domain = getDomain(bm.url);
  const safeUrl = (bm.url || '').replace(/"/g, '&quot;');
  const safeTitle = (bm.title || '').replace(/"/g, '&quot;');
  return `
    <a class="item-row" href="${safeUrl}" title="${safeTitle}" data-bookmark-id="${bm.id}">
      ${favicon ? `<img class="item-favicon" src="${favicon}" alt="" onerror="this.style.display='none'">` : ''}
      <span class="item-title">${bm.title || bm.url}</span>
      <span class="item-domain">${domain}</span>
      <div class="item-actions">
        <button class="item-action delete" data-action="delete-bookmark" data-bookmark-id="${bm.id}" title="Remove bookmark">${ICONS.delete}</button>
      </div>
    </a>`;
}

function renderBookmarkFolderCard(folder, index) {
  const accentClass = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
  const iconClass = ICON_CLASSES[index % ICON_CLASSES.length];
  const count = folder.bookmarks.length;
  const rows = folder.bookmarks.map(bm => renderBookmarkRow(bm)).join('');
  const allUrls = folder.bookmarks.map(bm => encodeURIComponent(bm.url)).join(',');

  return `
    <div class="card ${accentClass}" data-folder-id="${folder.id}">
      <div class="card-top">
        <div class="card-icon ${iconClass}">${ICONS.folder}</div>
        <span class="card-name">${folder.name}</span>
        <span class="card-badge">${count}</span>
      </div>
      <div class="item-list">${rows}</div>
      <div class="card-actions">
        <button class="card-btn open-all" data-action="open-all-in-folder" data-urls="${allUrls}">${ICONS.focus} Open all ${count}</button>
      </div>
    </div>`;
}


/* ================================================================
   SIDEBAR (Bookmarks view only)
   ================================================================ */

function renderSidebar(folders, totalBookmarks) {
  const sidebarFolders = document.getElementById('sidebarFolders');
  const sidebarAllCount = document.getElementById('sidebarAllCount');
  const sidebarFooterText = document.getElementById('sidebarFooterText');
  if (sidebarAllCount) sidebarAllCount.textContent = totalBookmarks;
  if (sidebarFooterText) sidebarFooterText.textContent = `${folders.length} folders`;
  if (!sidebarFolders) return;

  const folderMap = new Map();
  for (const f of folders) folderMap.set(f.id, f);

  function getTotalCount(folder) {
    let count = folder.bookmarks.length;
    for (const childId of (folder.childFolderIds || [])) {
      const child = folderMap.get(childId);
      if (child) count += getTotalCount(child);
    }
    return count;
  }

  function renderSidebarFolder(folder) {
    const isActive = selectedFolderId === folder.id;
    const hasChildren = (folder.childFolderIds || []).some(id => folderMap.has(id));
    const totalCount = getTotalCount(folder);
    const depth = Math.min(folder.depth, 4);

    const toggleHtml = hasChildren
      ? `<span class="sidebar-folder-toggle expanded" data-toggle-folder="${folder.id}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></span>`
      : '';

    let html = `<div class="sidebar-folder${isActive ? ' active' : ''}" data-sidebar-folder-id="${folder.id}" data-depth="${depth}" title="${folder.path || folder.name}">
      ${toggleHtml}
      ${ICONS.folder}
      <span class="sidebar-folder-name">${folder.name}</span>
      <span class="sidebar-folder-count">${totalCount}</span>
    </div>`;

    if (hasChildren) {
      html += `<div class="sidebar-children" data-parent-folder="${folder.id}">`;
      for (const childId of folder.childFolderIds) {
        const child = folderMap.get(childId);
        if (child) html += renderSidebarFolder(child);
      }
      html += `</div>`;
    }
    return html;
  }

  const topLevel = folders.filter(f => !f.parentId || !folderMap.has(f.parentId));
  sidebarFolders.innerHTML = topLevel.map(f => renderSidebarFolder(f)).join('');
}

function selectFolder(folderId) {
  selectedFolderId = folderId;
  document.querySelectorAll('.sidebar-item, .sidebar-folder').forEach(el => el.classList.remove('active'));
  if (folderId === '__all__') {
    const allBtn = document.getElementById('sidebarAllBtn');
    if (allBtn) allBtn.classList.add('active');
  } else {
    const el = document.querySelector(`[data-sidebar-folder-id="${folderId}"]`);
    if (el) el.classList.add('active');
  }

  // Clear search
  const searchInput = document.getElementById('searchInput');
  if (searchInput && currentView === 'bookmarks') searchInput.value = '';

  renderBookmarkCards(allBookmarkFolders);
}

function renderBookmarkCards(folders) {
  const grid = document.getElementById('bookmarksGrid');
  const header = document.getElementById('bookmarksHeader');
  const count = document.getElementById('bookmarksCount');
  const banner = document.getElementById('activeFolderBanner');
  const label = document.getElementById('activeFolderLabel');

  let filtered;
  if (selectedFolderId === '__all__') {
    filtered = folders.filter(f => f.bookmarks.length > 0);
  } else {
    const folderMap = new Map();
    for (const f of folders) folderMap.set(f.id, f);
    const matchIds = new Set();
    function collectChildren(id) {
      matchIds.add(id);
      const f = folderMap.get(id);
      if (f && f.childFolderIds) { for (const childId of f.childFolderIds) collectChildren(childId); }
    }
    collectChildren(selectedFolderId);
    filtered = folders.filter(f => matchIds.has(f.id) && f.bookmarks.length > 0);
  }

  if (selectedFolderId !== '__all__' && banner) {
    const activeFolder = folders.find(f => f.id === selectedFolderId);
    if (label) label.textContent = `Viewing: ${activeFolder ? activeFolder.name : 'Folder'}`;
    banner.style.display = '';
  } else if (banner) {
    banner.style.display = 'none';
  }

  if (filtered.length > 0) {
    header.style.display = '';
    const totalBm = filtered.reduce((s, f) => s + f.bookmarks.length, 0);
    count.textContent = selectedFolderId === '__all__'
      ? `${filtered.length} folder${filtered.length !== 1 ? 's' : ''}`
      : `${totalBm} bookmark${totalBm !== 1 ? 's' : ''}`;
    grid.innerHTML = filtered.map((f, i) => renderBookmarkFolderCard(f, i)).join('');
  } else {
    header.style.display = 'none';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        </div>
        <div class="empty-title">No bookmarks yet.</div>
        <div class="empty-subtitle">Save some pages and they'll show up here.</div>
      </div>`;
  }
}


/* ================================================================
   SAVED FOR LATER — Render Column
   ================================================================ */

function renderDeferredItem(item) {
  let domain = '';
  try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  const ago = timeAgo(item.savedAt);
  return `
    <div class="deferred-item" data-deferred-id="${item.id}">
      <input type="checkbox" class="deferred-checkbox" data-action="check-deferred" data-deferred-id="${item.id}">
      <div class="deferred-info">
        <a href="${item.url}" target="_blank" rel="noopener" class="deferred-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
          <img src="${faviconUrl}" alt="" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px" onerror="this.style.display='none'">${item.title || item.url}
        </a>
        <div class="deferred-meta"><span>${domain}</span><span>${ago}</span></div>
      </div>
      <button class="deferred-dismiss" data-action="dismiss-deferred" data-deferred-id="${item.id}" title="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

function renderArchiveItem(item) {
  const ago = item.completedAt ? timeAgo(item.completedAt) : timeAgo(item.savedAt);
  return `<div class="archive-item"><a href="${item.url}" target="_blank" rel="noopener" class="archive-item-title" title="${(item.title || '').replace(/"/g, '&quot;')}">${item.title || item.url}</a><span class="archive-item-date">${ago}</span></div>`;
}

async function renderDeferredColumn() {
  const column = document.getElementById('deferredColumn');
  const list = document.getElementById('deferredList');
  const empty = document.getElementById('deferredEmpty');
  const countEl = document.getElementById('deferredCount');
  const archiveEl = document.getElementById('deferredArchive');
  const archiveCountEl = document.getElementById('archiveCount');
  const archiveList = document.getElementById('archiveList');
  if (!column) return;

  try {
    const { active, archived } = await getSavedTabs();
    if (active.length === 0 && archived.length === 0) { column.style.display = 'none'; return; }
    column.style.display = 'block';

    if (active.length > 0) {
      countEl.textContent = `${active.length} item${active.length !== 1 ? 's' : ''}`;
      list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
      list.style.display = 'block'; empty.style.display = 'none';
    } else {
      list.style.display = 'none'; countEl.textContent = ''; empty.style.display = 'block';
    }

    if (archived.length > 0) {
      archiveCountEl.textContent = `(${archived.length})`;
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      archiveEl.style.display = 'block';
    } else { archiveEl.style.display = 'none'; }
  } catch {
    column.style.display = 'none';
  }
}


/* ================================================================
   VIEW SWITCHER
   ================================================================ */

function switchView(view) {
  currentView = view;
  const sidebar = document.getElementById('sidebar');
  const container = document.getElementById('mainContainer');
  const tabsPanel = document.getElementById('tabsPanel');
  const bookmarksPanel = document.getElementById('bookmarksPanel');
  const deferredColumn = document.getElementById('deferredColumn');
  const searchInput = document.getElementById('searchInput');
  const tabOutDupeBanner = document.getElementById('tabOutDupeBanner');
  const activeFolderBanner = document.getElementById('activeFolderBanner');

  // Update view switcher buttons
  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'tabs') {
    sidebar.classList.add('hidden');
    container.style.marginLeft = '';
    container.style.width = '';
    tabsPanel.classList.add('active');
    bookmarksPanel.classList.remove('active');
    if (deferredColumn) deferredColumn.style.display !== 'none' && (deferredColumn.style.display = '');
    if (searchInput) searchInput.placeholder = 'Search tabs...';
    if (tabOutDupeBanner) checkTabOutDupes();
    if (activeFolderBanner) activeFolderBanner.style.display = 'none';
  } else {
    sidebar.classList.remove('hidden');
    container.style.marginLeft = '240px';
    container.style.width = 'calc(100vw - 240px)';
    tabsPanel.classList.remove('active');
    bookmarksPanel.classList.add('active');
    if (deferredColumn) deferredColumn.style.display = 'none';
    if (searchInput) searchInput.placeholder = 'Search bookmarks...';
    if (tabOutDupeBanner) tabOutDupeBanner.style.display = 'none';
  }
}


/* ================================================================
   SEARCH
   ================================================================ */

function handleSearch(query) {
  const q = (query || '').trim().toLowerCase();

  if (currentView === 'tabs') {
    searchTabs(q);
  } else {
    searchBookmarks(q);
  }
}

function searchTabs(q) {
  const grid = document.getElementById('tabsGrid');
  const header = document.getElementById('tabsHeader');
  if (!q || q.length < 2) {
    // Re-render all
    renderTabCards();
    return;
  }
  const realTabs = getRealTabs();
  const matches = realTabs.filter(t =>
    (t.title || '').toLowerCase().includes(q) ||
    (t.url || '').toLowerCase().includes(q)
  );

  header.style.display = '';
  document.getElementById('tabsCount').textContent = `${matches.length} result${matches.length !== 1 ? 's' : ''}`;

  if (matches.length === 0) {
    grid.innerHTML = `<div class="no-results">No tabs found for "${q}"</div>`;
    return;
  }

  // Group matches by domain
  const groupMap = {};
  for (const tab of matches) {
    let hostname;
    try { hostname = tab.url.startsWith('file://') ? 'local-files' : new URL(tab.url).hostname; }
    catch { continue; }
    if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
    groupMap[hostname].tabs.push(tab);
  }
  const groups = Object.values(groupMap).sort((a, b) => b.tabs.length - a.tabs.length);
  grid.innerHTML = groups.map((g, i) => renderDomainCard(g, i)).join('');
}

function searchBookmarks(q) {
  const grid = document.getElementById('bookmarksGrid');
  const header = document.getElementById('bookmarksHeader');
  const resultsEl = document.getElementById('bookmarkSearchResults');

  if (!q || q.length < 2) {
    resultsEl.style.display = 'none';
    grid.style.display = '';
    header.style.display = '';
    renderBookmarkCards(allBookmarkFolders);
    return;
  }

  const matches = allBookmarksFlat.filter(bm =>
    (bm.title || '').toLowerCase().includes(q) ||
    (bm.url || '').toLowerCase().includes(q) ||
    (bm.folderName || '').toLowerCase().includes(q)
  );

  grid.style.display = 'none';
  header.style.display = 'none';
  resultsEl.style.display = 'block';

  if (matches.length === 0) {
    resultsEl.innerHTML = `<div class="no-results">No bookmarks found for "${q}"</div>`;
    return;
  }

  resultsEl.innerHTML = `
    <div class="section-header">
      <h2>Search results</h2>
      <div class="section-line"></div>
      <div class="section-count">${matches.length} match${matches.length !== 1 ? 'es' : ''}</div>
    </div>
    <div class="cards-grid">
      <div class="card accent-amber">
        <div class="item-list">${matches.map(bm => renderBookmarkRow(bm)).join('')}</div>
      </div>
    </div>`;
}


/* ================================================================
   MAIN RENDER
   ================================================================ */

function renderTabCards() {
  const realTabs = getRealTabs();

  const LANDING_PAGE_PATTERNS = [
    { hostname: 'mail.google.com', test: (p, h) => !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/') },
    { hostname: 'x.com', pathExact: ['/home'] },
    { hostname: 'www.linkedin.com', pathExact: ['/'] },
    { hostname: 'github.com', pathExact: ['/'] },
    { hostname: 'www.youtube.com', pathExact: ['/'] },
    ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
  ];

  function isLandingPage(url) {
    try {
      const parsed = new URL(url);
      return LANDING_PAGE_PATTERNS.some(p => {
        const hostnameMatch = p.hostname ? parsed.hostname === p.hostname : p.hostnameEndsWith ? parsed.hostname.endsWith(p.hostnameEndsWith) : false;
        if (!hostnameMatch) return false;
        if (p.test) return p.test(parsed.pathname, url);
        if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
        if (p.pathExact) return p.pathExact.includes(parsed.pathname);
        return parsed.pathname === '/';
      });
    } catch { return false; }
  }

  domainGroups = [];
  const groupMap = {};
  const landingTabs = [];
  const customGroups = typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];

  function matchCustomGroup(url) {
    try {
      const parsed = new URL(url);
      return customGroups.find(r => {
        const hostMatch = r.hostname ? parsed.hostname === r.hostname : r.hostnameEndsWith ? parsed.hostname.endsWith(r.hostnameEndsWith) : false;
        if (!hostMatch) return false;
        if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
        return true;
      }) || null;
    } catch { return null; }
  }

  for (const tab of realTabs) {
    try {
      if (isLandingPage(tab.url)) { landingTabs.push(tab); continue; }
      const customRule = matchCustomGroup(tab.url);
      if (customRule) {
        const key = customRule.groupKey;
        if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
        groupMap[key].tabs.push(tab); continue;
      }
      let hostname = tab.url.startsWith('file://') ? 'local-files' : new URL(tab.url).hostname;
      if (!hostname) continue;
      if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
      groupMap[hostname].tabs.push(tab);
    } catch {}
  }

  if (landingTabs.length > 0) groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };

  const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname).filter(Boolean));
  const landingSuffixes = LANDING_PAGE_PATTERNS.map(p => p.hostnameEndsWith).filter(Boolean);
  function isLandingDomain(domain) {
    if (landingHostnames.has(domain)) return true;
    return landingSuffixes.some(s => domain.endsWith(s));
  }

  domainGroups = Object.values(groupMap).sort((a, b) => {
    const aL = a.domain === '__landing-pages__', bL = b.domain === '__landing-pages__';
    if (aL !== bL) return aL ? -1 : 1;
    const aP = isLandingDomain(a.domain), bP = isLandingDomain(b.domain);
    if (aP !== bP) return aP ? -1 : 1;
    return b.tabs.length - a.tabs.length;
  });

  const grid = document.getElementById('tabsGrid');
  const header = document.getElementById('tabsHeader');
  const count = document.getElementById('tabsCount');

  if (domainGroups.length > 0) {
    header.style.display = '';
    count.textContent = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''}`;
    grid.innerHTML = domainGroups.map((g, i) => renderDomainCard(g, i)).join('');
  } else {
    header.style.display = 'none';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div class="empty-title">Inbox zero, but for tabs.</div>
        <div class="empty-subtitle">You're free.</div>
      </div>`;
  }
}

async function renderDashboard() {
  // Header
  const greetingEl = document.getElementById('greeting');
  const dateEl = document.getElementById('dateDisplay');
  if (greetingEl) greetingEl.textContent = getGreeting();
  if (dateEl) dateEl.textContent = getDateDisplay();

  // Tabs
  await fetchOpenTabs();
  const realTabs = getRealTabs();

  // Stats
  const statsRow = document.getElementById('statsRow');
  statsRow.innerHTML = `
    <div class="stat-chip"><span class="num">${realTabs.length}</span> open tabs</div>
  `;

  // Update badge counts in switcher
  document.getElementById('viewTabsBadge').textContent = realTabs.length;

  // Render tabs view
  renderTabCards();
  checkTabOutDupes();

  // Bookmarks
  const { folders, totalBookmarks } = await getBookmarkFolders();
  allBookmarkFolders = folders;
  buildFlatIndex(folders);
  renderSidebar(folders, totalBookmarks);
  renderBookmarkCards(folders);

  document.getElementById('viewBookmarksBadge').textContent = totalBookmarks;

  // Footer
  document.getElementById('footerStat').textContent = realTabs.length;
  document.getElementById('footerStatLabel').textContent = 'Open tabs';

  // Saved for later
  await renderDeferredColumn();
}


/* ================================================================
   EVENT HANDLERS
   ================================================================ */

// Search input
document.getElementById('searchInput').addEventListener('input', (e) => {
  handleSearch(e.target.value);
});

// View switcher
document.getElementById('viewTabsBtn').addEventListener('click', () => switchView('tabs'));
document.getElementById('viewBookmarksBtn').addEventListener('click', () => switchView('bookmarks'));

// Sidebar: All bookmarks
document.getElementById('sidebarAllBtn').addEventListener('click', () => selectFolder('__all__'));

// Sidebar: folder clicks
document.getElementById('sidebarFolders').addEventListener('click', (e) => {
  const toggleEl = e.target.closest('.sidebar-folder-toggle');
  if (toggleEl) {
    e.stopPropagation();
    const folderId = toggleEl.dataset.toggleFolder;
    const children = document.querySelector(`.sidebar-children[data-parent-folder="${folderId}"]`);
    if (children) { children.classList.toggle('collapsed'); toggleEl.classList.toggle('expanded'); }
    return;
  }
  const folderEl = e.target.closest('.sidebar-folder');
  if (!folderEl) return;
  const folderId = folderEl.dataset.sidebarFolderId;
  if (folderId) selectFolder(folderId);
});

// Sidebar: filter
document.getElementById('sidebarSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.sidebar-folder').forEach(el => {
    const name = (el.querySelector('.sidebar-folder-name')?.textContent || '').toLowerCase();
    el.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-children').forEach(el => { if (q) el.classList.remove('collapsed'); });
});

// Active folder banner: "Show all"
document.getElementById('activeFolderClear').addEventListener('click', () => selectFolder('__all__'));

// Click delegation for all actions
document.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  // Close Tab Out dupes
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) { banner.style.transition = 'opacity 0.4s'; banner.style.opacity = '0'; setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400); }
    showToast('Closed extra Tab Garden tabs');
    return;
  }

  // Focus tab
  if (action === 'focus-tab') {
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // Close single tab
  if (action === 'close-single-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;
    const allTabs = await chrome.tabs.query({});
    const match = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();
    playCloseSound();
    const row = actionEl.closest('.item-row');
    if (row) {
      const rect = row.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      row.style.transition = 'opacity 0.2s, transform 0.2s';
      row.style.opacity = '0'; row.style.transform = 'translateX(20px)';
      setTimeout(() => {
        row.remove();
        const card = row.closest ? actionEl.closest('.card') : null;
        if (card && card.querySelectorAll('.item-row').length === 0) animateCardOut(card);
      }, 200);
    }
    document.getElementById('viewTabsBadge').textContent = getRealTabs().length;
    showToast('Tab closed');
    return;
  }

  // Save tab for later
  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;
    try { await saveTabForLater({ url: tabUrl, title: tabTitle }); } catch { showToast('Failed to save tab'); return; }
    const allTabs = await chrome.tabs.query({});
    const match = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();
    const row = actionEl.closest('.item-row');
    if (row) { row.style.transition = 'opacity 0.2s, transform 0.2s'; row.style.opacity = '0'; row.style.transform = 'scale(0.8)'; setTimeout(() => row.remove(), 200); }
    showToast('Saved for later');
    await renderDeferredColumn();
    return;
  }

  // Check off saved tab
  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;
    await checkOffSavedTab(id);
    const item = actionEl.closest('.deferred-item');
    if (item) { item.style.opacity = '0.5'; setTimeout(() => { item.style.transition = 'opacity 0.3s, transform 0.3s'; item.style.opacity = '0'; item.style.transform = 'translateX(20px)'; setTimeout(() => { item.remove(); renderDeferredColumn(); }, 300); }, 600); }
    return;
  }

  // Dismiss saved tab
  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;
    await dismissSavedTab(id);
    const item = actionEl.closest('.deferred-item');
    if (item) { item.style.transition = 'opacity 0.3s, transform 0.3s'; item.style.opacity = '0'; item.style.transform = 'translateX(20px)'; setTimeout(() => { item.remove(); renderDeferredColumn(); }, 300); }
    return;
  }

  // Close domain tabs
  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group = domainGroups.find(g => 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId);
    if (!group) return;
    const urls = group.tabs.map(t => t.url);
    const useExact = group.domain === '__landing-pages__' || !!group.label;
    if (useExact) await closeTabsExact(urls); else await closeTabsByUrls(urls);
    const card = actionEl.closest('.card');
    if (card) { playCloseSound(); animateCardOut(card); }
    const idx = domainGroups.indexOf(group);
    if (idx !== -1) domainGroups.splice(idx, 1);
    const groupLabel = group.domain === '__landing-pages__' ? 'Homepages' : (group.label || friendlyDomain(group.domain));
    showToast(`Closed ${urls.length} tab${urls.length !== 1 ? 's' : ''} from ${groupLabel}`);
    document.getElementById('viewTabsBadge').textContent = getRealTabs().length;
    return;
  }

  // Dedup keep one
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;
    await closeDuplicateTabs(urls, true);
    playCloseSound();
    actionEl.style.transition = 'opacity 0.2s'; actionEl.style.opacity = '0';
    setTimeout(() => actionEl.remove(), 200);
    const card = actionEl.closest('.card');
    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => { b.style.transition = 'opacity 0.2s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 200); });
      card.classList.add('has-neutral-bar');
    }
    showToast('Closed duplicates, kept one copy each');
    return;
  }

  // Open all bookmarks in folder
  if (action === 'open-all-in-folder') {
    e.preventDefault();
    const urlsEncoded = actionEl.dataset.urls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    for (const url of urls) chrome.tabs.create({ url, active: false });
    showToast(`Opened ${urls.length} bookmark${urls.length !== 1 ? 's' : ''}`);
    return;
  }

  // Delete bookmark
  if (action === 'delete-bookmark') {
    e.preventDefault(); e.stopPropagation();
    const bmId = actionEl.dataset.bookmarkId;
    if (!bmId) return;
    try {
      await chrome.bookmarks.remove(bmId);
      const row = actionEl.closest('.item-row');
      if (row) {
        row.style.transition = 'opacity 0.2s, transform 0.2s';
        row.style.opacity = '0'; row.style.transform = 'translateX(20px)';
        setTimeout(() => {
          row.remove();
          const card = document.querySelector('.card:not(:has(.item-row))');
          if (card) { card.style.transition = 'opacity 0.3s, transform 0.3s'; card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; setTimeout(() => card.remove(), 300); }
        }, 200);
      }
      showToast('Bookmark removed');
    } catch { showToast('Failed to remove bookmark'); }
    return;
  }

  // Expand overflow
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement?.querySelector('.page-chips-overflow');
    if (overflowContainer) { overflowContainer.style.display = 'contents'; actionEl.remove(); }
    return;
  }
});

// Prevent bookmark link clicks on action buttons
document.addEventListener('click', (e) => {
  if (e.target.closest('.item-action')) e.preventDefault();
});

// Archive toggle
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;
  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
});

// Archive search
document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;
  const q = e.target.value.trim().toLowerCase();
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;
  try {
    const { archived } = await getSavedTabs();
    if (q.length < 2) { archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join(''); return; }
    const results = archived.filter(item => (item.title || '').toLowerCase().includes(q) || (item.url || '').toLowerCase().includes(q));
    archiveList.innerHTML = results.map(item => renderArchiveItem(item)).join('') || '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No results</div>';
  } catch {}
});


/* ================================================================
   INITIALIZE
   ================================================================ */

renderDashboard();
