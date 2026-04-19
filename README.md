# 🌱 Tab Garden

**Your tabs and bookmarks growing in one place.**

Tab Garden replaces your Chrome new tab page with a clean, unified dashboard showing everything you have open — grouped by domain — alongside all your bookmarks organized by folder.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

### Tabs View (Default)
- **See all open tabs at a glance** grouped by domain on a card grid
- **Homepages group** pulls Gmail, X, LinkedIn, YouTube, GitHub homepages into one card
- **Close tabs with style** — satisfying swoosh sound + confetti burst
- **Duplicate detection** — flags when you have the same page open twice
- **Click any tab title to jump to it** — even across different Chrome windows
- **Save for later** — bookmark individual tabs to a checklist before closing them

### Bookmarks View
- **Browse all bookmarks** organized by folder in a card grid
- **Sidebar navigation** with hierarchical folder tree, expand/collapse, and search
- **Open all bookmarks** in a folder with one click
- **Delete bookmarks** directly from the dashboard
- **Search** across all bookmark titles, URLs, and folder names

### Shared
- **View switcher** — toggle between Tabs and Bookmarks with badge counts
- **Auto theme** — follows Chrome's light/dark mode via `prefers-color-scheme`
- **Squared grid pattern** background adapts to both themes
- **Toolbar badge** — color-coded tab count (green ≤10, amber ≤20, red 21+)
- **100% local** — no server, no accounts, no data sent anywhere

---

## 🚀 Install

### From Source (Developer Mode)

1. **Clone the repo**
   ```bash
   git clone https://github.com/pvjagtap/Tab-Garden.git
   cd Tab-Garden
   ```

2. **Load in Chrome**
   - Open `chrome://extensions`
   - Toggle **Developer mode** (top-right)
   - Click **Load unpacked**
   - Select the repo folder (the one containing `manifest.json`)

3. **Open a new tab** — you'll see Tab Garden!

---

## 📁 Project Structure

```
Tab-Garden/
├── manifest.json      # Chrome Extension manifest (MV3)
├── index.html         # Dashboard HTML — view switcher, sidebar, cards
├── style.css          # Adaptive CSS — light/dark themes, grid pattern
├── app.js             # Core logic — tabs + bookmarks + saved-for-later
├── background.js      # Service worker — toolbar badge updater
├── icons/             # Extension icons (16, 48, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md          # This file
└── AGENTS.md          # Setup guide for coding agents
```

---

## 🎨 Themes

Tab Garden automatically matches your Chrome/system theme:

| Setting | Light | Dark |
|---------|-------|------|
| Background | Warm paper `#f8f5f0` | Deep charcoal `#1a1a1e` |
| Cards | Soft white `#fffdf9` | Dark surface `#2a2a30` |
| Grid pattern | Subtle dark lines | Subtle light lines |
| Accent | Amber `#c8713a` | Amber `#c8713a` |

No manual toggle needed — it reads `prefers-color-scheme` from your OS/Chrome settings.

---

## ⚙️ Customization

### Custom Landing Page Patterns

Create a `config.local.js` file in the extension folder to add your own landing page patterns:

```js
// config.local.js — personal overrides (gitignored)
const LOCAL_LANDING_PAGE_PATTERNS = [
  { hostname: 'app.example.com', pathExact: ['/dashboard'] },
];

const LOCAL_CUSTOM_GROUPS = [
  { hostname: 'docs.google.com', groupKey: 'google-docs', groupLabel: 'Google Docs' },
];
```

---

## 🔒 Privacy

- **Zero network requests** — everything runs locally in your browser
- **No analytics, no tracking, no telemetry**
- **Saved tabs** stored in `chrome.storage.local` (persists across sessions, never leaves your machine)
- **No external dependencies** — pure vanilla JS, no npm, no build step

---

## 🔄 Updating

```bash
cd Tab-Garden
git pull
```

Then go to `chrome://extensions` and click the reload ↻ button on Tab Garden.

---

## � Credits

Built on top of [Tab Out](https://github.com/zarazhangrui/tab-out) by [Zara](https://x.com/zarazhangrui).

---

## �📄 License

MIT
