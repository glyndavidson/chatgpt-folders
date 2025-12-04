## 📚 Overview
A Chrome extension to organise your ChatGPT conversations into folders and bring order to sprawling threads — all from inside the ChatGPT sidebar.  
[Screenshot to follow]
<br><br>

## ✨ Features
- 🧲 Drag-and-drop conversations anywhere in the sidebar for total ordering control.
- 🗂️ Create folders with unlimited nesting (folders within folders) and inline rename.
- 🎨 Change folder appearance and colour using the built-in picker.
- 📌 Keep folders pinned at the top, or allow fully custom sorting.
- 🔄 Sync folder structure automatically across Chrome sessions.
- 🔐 Full respect for user privacy and conversation history (details below).
<br><br>

## 📦 Installation
Install the extension from the Chrome Web Store:  
Link to follow.
<br><br>

## 🔒 Privacy & Data Handling
Privacy is a core principle. The extension never reads, analyses, stores, or transmits the contents of your ChatGPT conversations.

### What the extension _does_ store
`chrome.storage.sync` keeps your folder structure synchronised safely across devices logged into the same Google account.

Only the following data is stored:
- Unique IDs of your ChatGPT conversations (not the titles).
- Folder names, colours, and hierarchy created through the extension.
- Which conversation IDs belong to which folders.

### What the extension does **not** store
The extension never touches:
- 🚫 Conversation titles  
- 🚫 Conversation content or chat messages  
- 🚫 Anything you type into ChatGPT  
- 🚫 Personal data or OpenAI account info  
- 🚫 Cookies, authentication tokens, or browser history

It cannot read message bodies — it only interacts with the sidebar list and the URL.

### What the extension sends or shares
- ❌ No external servers
- ❌ No analytics
- ❌ No telemetry
- ❌ No network requests of any kind

All storage stays inside Chrome’s sync storage, controlled by your Google account. Clear it anytime via `chrome://settings/syncSetup/advanced` or by uninstalling the extension.

### Why storage.sync?
`storage.sync` keeps your folders available wherever you log in — laptop, desktop, office, home — without exports, cloud accounts, or manual backups.
<br><br>

## 🛡️ Security
- The extension does **not** modify network requests.  
- It does **not** inject scripts outside of the ChatGPT domain.  
- It runs only in the ChatGPT UI tab.  
- It never requests extra permissions beyond what is required to display the folder tree.  
- Your data stays local, minimal, and fully under your control — just how privacy should be.  
**It cannot access or modify any of your chat history in any way.**
<br><br>

## 👤 Author
Glyn Davidson (and his buddy Max, the friendly Talkie Toaster).  
Developer, climber, and chronic tinkerer of occasionally useful tools.
<br><br>

## ☕ Buy me a Coffee
If you find this extension useful, please consider [buying me a coffee](https://buymeacoffee.com/glyndavidson) to support my work.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%F0%9F%8D%BA-yellow)](https://buymeacoffee.com/glyndavidson)
<br><br>

## 📄 License
MIT License — see [LICENSE](https://github.com/glyndavidson/chatgpt-folders/blob/main/LICENSE) for details. Feel free to modify, fork, or build upon the project.
