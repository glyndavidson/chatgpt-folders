(function () {
    // @meta LayoutState serializes folders/chats to storage and restores them on load.
    const ns = (window.GlynGPT = window.GlynGPT || {});

    class LayoutState {
        constructor(storageService, folderManager, historyManager) {
            this.storage = storageService;
            this.folderManager = folderManager;
            this.historyManager = historyManager;
            this.storageKey = "layout";
            this.data = this._defaultState();
            this.isRestoring = false;
            this._saveTimer = null;
        }

        _defaultState() {
            return { items: [] };
        }

        _sanitizeState(raw) {
            if (!raw || typeof raw !== "object") {
                return this._defaultState();
            }

            if (Array.isArray(raw.items)) {
                return {
                    items: raw.items
                        .map(entry => this._sanitizeItem(entry))
                        .filter(Boolean)
                };
            }

            return this._convertLegacyState(raw);
        }

        _convertLegacyState(raw) {
            const folders = new Map();
            if (Array.isArray(raw.folders)) {
                raw.folders.forEach((folder) => {
                    if (!folder || typeof folder !== "object") return;
                    const id = typeof folder.id === "string" ? folder.id : null;
                    if (!id) return;
                    folders.set(id, {
                        type: "folder",
                        id,
                        name: typeof folder.name === "string" ? folder.name : "Folder",
                        color: typeof folder.color === "string" ? folder.color : null,
                        expanded: folder.expanded !== false,
                        children: Array.isArray(folder.children)
                            ? folder.children
                                .filter(href => typeof href === "string" && href.length)
                                .map(href => ({ type: "chat", id: href }))
                            : []
                    });
                });
            }

            let topLevel = [];
            if (Array.isArray(raw.topLevelItems)) {
                topLevel = raw.topLevelItems
                    .map(item => this._normalizeLegacyItem(item))
                    .filter(Boolean);
            } else if (Array.isArray(raw.rootOrder)) {
                topLevel = raw.rootOrder
                    .filter(href => typeof href === "string" && href.length)
                    .map(href => ({ type: "chat", id: href }));
            }

            const items = [];
            topLevel.forEach((entry) => {
                if (entry.type === "chat") {
                    items.push(entry);
                    return;
                }
                if (entry.type === "folder") {
                    const folder = folders.get(entry.id);
                    if (folder) {
                        items.push(folder);
                    }
                }
            });

            return { items };
        }

        _sanitizeItem(entry) {
            if (!entry) return null;
            if (typeof entry === "string") {
                return { type: "chat", id: entry };
            }
            if (typeof entry !== "object") return null;
            const id = typeof entry.id === "string" ? entry.id : null;
            if (!id) return null;
            if (entry.type === "chat") {
                return { type: "chat", id };
            }
            if (entry.type !== "folder") return null;
            return {
                type: "folder",
                id,
                name: typeof entry.name === "string" ? entry.name : "Folder",
                color: typeof entry.color === "string" ? entry.color : null,
                expanded: entry.expanded !== false,
                children: Array.isArray(entry.children)
                    ? entry.children.map(child => this._sanitizeItem(child)).filter(Boolean)
                    : []
            };
        }

        _normalizeLegacyItem(item) {
            if (!item) return null;
            if (typeof item === "string") {
                return { type: "chat", id: item };
            }
            if (typeof item !== "object") return null;
            const id = typeof item.id === "string" ? item.id : null;
            if (!id) return null;
            if (item.type === "folder") {
                return { type: "folder", id };
            }
            if (item.type === "chat") {
                return { type: "chat", id };
            }
            return null;
        }

        async restore() {
            if (!this.storage) {
                this.data = this._defaultState();
                return false;
            }
            const stored = await this.storage.load({});
            const state = stored && stored[this.storageKey]
                ? this._sanitizeState(stored[this.storageKey])
                : this._defaultState();

            this.data = state;
            const hasData = Array.isArray(state.items) && state.items.length > 0;
            if (hasData) {
                await this.applyState(state);
            }
            return hasData;
        }

        async applyState(state) {
            if (!this.folderManager || !this.historyManager || !this.folderManager.historyDiv) {
                return false;
            }

            this.isRestoring = true;
            this.folderManager.suspendNotifications();
            this.historyManager.suspendNotifications();

            this.folderManager.clearAllFolders();

            const chatMap = this._collectChatMap();
            this._applyItemsToContainer(
                Array.isArray(state.items) ? state.items : [],
                this.folderManager.historyDiv,
                chatMap,
                null
            );

            const rootLinks = this.folderManager.getRootChatLinks();
            this.historyManager.resetFromLinks(rootLinks);

            this.historyManager.resumeNotifications();
            this.folderManager.resumeNotifications();
            this.isRestoring = false;
            return true;
        }

        _collectChatMap() {
            const scope = this.folderManager && this.folderManager.historyDiv
                ? this.folderManager.historyDiv
                : document;
            const links = Array.from(scope.querySelectorAll("a.__menu-item"));
            const map = new Map();
            links.forEach((link) => {
                const href = link.getAttribute("href") || "";
                if (href && !map.has(href)) {
                    map.set(href, link);
                }
            });
            return map;
        }

        _applyItemsToContainer(items, containerEl, chatMap, parentFolder) {
            if (!Array.isArray(items) || !containerEl) return;

            items.forEach((entry) => {
                if (!entry) return;
                if (entry.type === "chat") {
                    const link = chatMap.get(entry.id);
                    if (!link) return;
                    containerEl.appendChild(link);
                    if (parentFolder && link.__glynChatItem) {
                        parentFolder.addChild(link.__glynChatItem);
                    }
                    return;
                }

                if (entry.type === "folder") {
                    const folder = this.folderManager.createFolder(entry.name || "Folder", {
                        id: entry.id,
                        color: entry.color,
                        expanded: entry.expanded,
                        data: {
                            name: entry.name || "Folder",
                            color: entry.color
                        },
                        parentFolder,
                        insertAtTop: false
                    });
                    if (!folder) return;
                    folder.data.expanded = entry.expanded !== false;
                    folder.isExpanded = folder.data.expanded;
                    if (folder.contentsEl) {
                        folder.contentsEl.style.display = folder.isExpanded ? "" : "none";
                    }
                    folder.refreshChevron();
                    this._applyItemsToContainer(entry.children || [], folder.contentsEl, chatMap, folder);
                }
            });
        }

        async save() {
            if (!this.storage) return false;
            const serialized = this.serialize();
            this.data = serialized;
            const payload = await this.storage.load({});
            const next = Object.assign({}, payload, {
                [this.storageKey]: serialized
            });
            return this.storage.save(next);
        }

        serialize() {
            return {
                items: this._serializeContainer(
                    this.folderManager ? this.folderManager.historyDiv : null
                )
            };
        }

        _serializeContainer(containerEl) {
            if (!containerEl) return [];
            const items = [];
            Array.from(containerEl.children).forEach((node) => {
                if (node.classList && node.classList.contains("glyn-folder-wrapper")) {
                    const folder = node.__glynFolderItem;
                    if (!folder) return;
                    items.push({
                        type: "folder",
                        id: folder.id,
                        name: folder.data && folder.data.name ? folder.data.name : "Folder",
                        color: folder.data && folder.data.color ? folder.data.color : null,
                        expanded: folder.data && typeof folder.data.expanded === "boolean"
                            ? folder.data.expanded
                            : folder.isExpanded,
                        children: this._serializeContainer(folder.contentsEl)
                    });
                    return;
                }

                if (node.matches && node.matches("a.__menu-item")) {
                    const href = node.getAttribute("href") || "";
                    if (href) {
                        items.push({ type: "chat", id: href });
                    }
                }
            });
            return items;
        }

        hasFolders() {
            return !!(this.folderManager && this.folderManager.folders.length);
        }

        markDirty(options) {
            if (this.isRestoring) return;
            const immediate = options && options.immediate;
            clearTimeout(this._saveTimer);
            if (immediate) {
                this.save().catch(err => console.warn("[GlynGPT] Failed to save layout", err));
                return;
            }
            this._saveTimer = setTimeout(() => {
                this.save().catch(err => console.warn("[GlynGPT] Failed to save layout", err));
            }, 250);
        }
    }

    ns.LayoutState = LayoutState;
})();
