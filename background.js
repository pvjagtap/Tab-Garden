/**
 * background.js — Service Worker for Tab Garden
 *
 * Badge shows the current open tab count with color coding:
 *   Green  (#3d7a4a) → 1–10 tabs
 *   Amber  (#b8892e) → 11–20 tabs
 *   Red    (#b35a5a) → 21+ tabs
 */

async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    const count = tabs.filter(t => {
      const url = t.url || '';
      return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') &&
             !url.startsWith('about:') && !url.startsWith('edge://') && !url.startsWith('brave://');
    }).length;

    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    if (count === 0) return;

    let color;
    if (count <= 10)      color = '#3d7a4a';
    else if (count <= 20) color = '#b8892e';
    else                  color = '#b35a5a';

    await chrome.action.setBadgeBackgroundColor({ color });
  } catch {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.runtime.onInstalled.addListener(() => updateBadge());
chrome.runtime.onStartup.addListener(() => updateBadge());
chrome.tabs.onCreated.addListener(() => updateBadge());
chrome.tabs.onRemoved.addListener(() => updateBadge());
chrome.tabs.onUpdated.addListener(() => updateBadge());

updateBadge();
