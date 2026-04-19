# AGENTS.md -- Tab Garden: Setup & Onboarding Guide for Coding Agents

You're installing **Tab Garden** for the user. Your job is not just to set it up — it's to get them excited about using it.

---

## Step 0 — Introduce the product

Before doing anything technical, tell the user what they're about to get:

> **Tab Garden** replaces your new tab page with a unified dashboard of your open tabs and bookmarks.
>
> Here's what makes it great:
> - **Two views in one** — Tabs (default) shows open tabs grouped by domain; Bookmarks shows your saved bookmarks by folder
> - **Homepages group** pulls Gmail, X, LinkedIn, YouTube, GitHub homepages into one card for easy cleanup
> - **Close tabs with style** — satisfying swoosh sound + confetti burst
> - **Duplicate detection** flags when you have the same page open twice
> - **Click any tab title to jump to it** — even across different Chrome windows
> - **Save for later** — bookmark individual tabs to a checklist before closing them
> - **Bookmark sidebar** — hierarchical folder navigation with search
> - **Auto theme** — follows Chrome's light/dark mode automatically
> - **100% local** — no server, no accounts, no data sent anywhere
>
> It's just a Chrome extension. Setup takes about 1 minute.

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/pvjagtap/Tab-Garden.git
cd Tab-Garden
```

---

## Step 2 — Install the Chrome extension

This is the one step that requires manual action from the user. Make it as easy as possible.

**First**, print the full path to the folder:
```bash
echo "Extension folder: $(pwd)"
```

**Then**, copy the folder path to their clipboard:
- macOS: `pwd | pbcopy && echo "Path copied to clipboard"`
- Linux: `pwd | xclip -selection clipboard 2>/dev/null || echo "Path: $(pwd)"`
- Windows: `echo %CD% | clip`

**Then**, open the extensions page:
```bash
open "chrome://extensions"
```

**Then**, walk the user through it step by step:

> I've copied the extension folder path to your clipboard. Now:
>
> 1. You should see Chrome's extensions page. In the **top-right corner**, toggle on **Developer mode** (it's a switch).
> 2. Once Developer mode is on, you'll see a button called **"Load unpacked"** appear in the top-left. Click it.
> 3. A file picker will open. **Press Cmd+Shift+G** (Mac) or **Ctrl+L** (Windows/Linux) to open the "Go to folder" bar, then **paste** the path I copied (Cmd+V / Ctrl+V) and press Enter.
> 4. Click **"Select"** or **"Open"** and the extension will install.
>
> You should see "Tab Garden" appear in your extensions list.

**Also**, open the file browser directly to the extension folder as a fallback:
- macOS: `open .`
- Linux: `xdg-open .`
- Windows: `explorer .`

---

## Step 3 — Show them around

Once the extension is loaded:

> You're all set! Open a **new tab** and you'll see Tab Garden.
>
> Here's how it works:
> 1. **Two views**: Click "Tabs" or "Bookmarks" at the top to switch views.
> 2. **Tabs view** (default): Your open tabs are grouped by domain in a grid layout.
> 3. **Homepages** (Gmail inbox, X home, YouTube, etc.) are in their own group at the top.
> 4. **Click any tab title** to jump directly to that tab.
> 5. **Click the X** next to any tab to close just that one (with swoosh + confetti).
> 6. **Click "Close all N"** on a group to close the whole thing.
> 7. **Duplicate tabs** are flagged with a badge. Click "Close dupes" to keep one copy.
> 8. **Save a tab for later** by clicking the bookmark icon before closing it. Saved tabs appear in the sidebar.
> 9. **Bookmarks view**: Browse all your bookmarks by folder. Use the sidebar to navigate folders.
> 10. **Theme auto-matches** Chrome's light/dark setting — no toggle needed.
>
> That's it! No server to run, no config files. Everything works right away.

---

## Key Facts

- Tab Garden is a pure Chrome extension. No server, no Node.js, no npm.
- Manifest V3, service worker background script.
- Saved tabs are stored in `chrome.storage.local` (persists across sessions).
- Bookmarks are read via `chrome.bookmarks.getTree()`.
- Theme follows `prefers-color-scheme` (system/Chrome dark mode).
- 100% local. No data is sent to any external service.
- To update: `cd Tab-Garden && git pull`, then reload the extension in `chrome://extensions`.

---

## Architecture

```
Tab-Garden/
├── manifest.json      # MV3 manifest — permissions: tabs, bookmarks, storage
├── index.html         # Dashboard HTML — view switcher, sidebar, card grids
├── style.css          # Adaptive CSS — light + dark via prefers-color-scheme
├── app.js             # Core JS — tab management + bookmark viewer + saved-for-later
├── background.js      # Service worker — toolbar badge with color-coded tab count
└── icons/             # Extension icons (16, 48, 128px)
```

### Views
- **Tabs** (default): Groups open tabs by domain, landing pages detection, duplicate flagging
- **Bookmarks**: Reads chrome.bookmarks tree, sidebar with folder hierarchy, folder filtering

### Theme System
- Light theme = default CSS variables
- Dark theme = `@media (prefers-color-scheme: dark)` override
- No manual toggle — follows Chrome/OS setting automatically
