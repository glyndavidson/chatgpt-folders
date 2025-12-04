# Privacy Policy — ChatGPT Folders
Last updated: December 4th 2025

## 1. Introduction
ChatGPT Folders (“the Extension”) is a Chrome browser extension that allows users to organise their ChatGPT conversations into folders.  
This Privacy Policy explains what data the Extension stores, how it is used, and what it does not collect.

The Extension is designed with privacy as a core principle.
<br><br>

## 2. Information the Extension Stores

The Extension stores only the minimal data required to provide folder organisation.  
All stored data is kept inside `chrome.storage.sync`, allowing your folder structure to sync across devices logged into your Google account.

### 2.1 Global Settings

These are simple UI preference values such as:

- folder icon style
- whether folders appear at the top

Example:
`{
  "globalSettings": {
    "folderIconStyle": "fill",
    "forceFoldersTop": false
  }
}
`

These settings contain no personal information.

### 2.2 Folder Layout & Chat Associations

The Extension saves the folder structure you create, including:

- folder names
- folder colours
- expanded/collapsed states
- nested folder hierarchy
- ChatGPT conversation IDs - see below:

Conversation IDs (e.g., `/c/xxxxxxxx`) do not reveal chat content and are used solely to associate chats with folders.

Example:

`{  
  "layout": {  
    "items": [  
      {  
        "id": "folder-1",  
        "name": "Parent",  
        "type": "folder",
        "expanded": true,
        "color": "#009dff",
        "children": [
          { "id": "/c/xxxxxx", "type": "chat" },
          {
            "id": "folder-2",
            "name": "Child 1",
            "type": "folder",
            "children": [
              { "id": "/c/yyyyyy", "type": "chat" }
            ]
          }
        ]
      }
    ]
  }
}`

The Extension does not access, download, analyse, or store conversation text or titles.
<br><br>

## 3. Information the Extension Does Not Collect
The Extension does not collect, store, transmit, or analyse:
- Any ChatGPT message content
- Anything typed into ChatGPT
- Conversation titles
- Personal information or account details
- Cookies or authentication tokens
- Browser history
- IP addresses
- Analytics or tracking data
<br><br>

## 4. Data Transmission
The Extension does not transmit any data externally.  
No external servers  
No analytics  
No telemetry  
No third-party data sharing  
No advertising  
All stored data remains within Chrome’s sync storage.
<br><br>

## 5. Permissions
The Extension uses the following Chrome permissions:  
`storage`  
(Required to save folder structure and user settings).

Host permissions (ChatGPT domain)  
Used exclusively to insert the folder UI into the ChatGPT page.  
The Extension does not access message content or modify network requests.  
<br><br>

## 6. Data Export
The Extension provides a feature allowing users to download and review all of their stored data.
<br><br>


## 7. Data Deletion
Users may remove all stored data at any time by:
- uninstalling the extension
- clearing Chrome sync data
- manually deleting the extension’s storage via Chrome settings

No data remains after removal.
<br><br>

## 8. Changes to This Policy
If the Extension’s behaviour changes in a way that affects stored data, this Privacy Policy will be updated.
The revision date at the top will reflect the most recent version.
<br><br>

## 9. Contact
For questions, feature suggestions, or privacy concerns, please submit an issue via:
https://github.com/glyndavidson/chatgpt-folders/issues