// @meta main.js bootstraps the content script, wiring managers, drag logic, and storage sync.
const FORCE_FOLDERS_AT_TOP = false; // set true later if you want "folders at top" mode
// 

(function () {
    const ns = (window.GlynGPT = window.GlynGPT || {});
    const DraggableElement = ns.DraggableElement;
    const ChatItem = ns.ChatItem;
    const HistoryManager = ns.HistoryManager;
    const FolderManager = ns.FolderManager;
    const FolderMenu = ns.FolderMenu;
    const DragController = ns.DragController;
    const StorageService = ns.StorageService;
    const GlobalSettings = ns.GlobalSettings;
    const LayoutState = ns.LayoutState;
    const SIDEBAR_MIN_WIDTH = 220;
    const SIDEBAR_MAX_WIDTH = 520;
    const SIDEBAR_WIDTH_VAR = "--sidebar-width";
    const ENABLE_SIDEBAR_RESIZER = true;

    let historyDiv = null;
    let historyManager = null;
    let folderManager = null;
    let folderMenu = null;
    let dragController = null;
    let storageService = null;
    let globalSettings = null;
    let layoutState = null;

    let dropMarker = null;
    let highlightedFolderRow = null;
    window.FOLDER_ICON_STYLE = window.FOLDER_ICON_STYLE || "outline";
    let messageListenerBound = false;
    let historyObserver = null;
    let containerMonitorTimer = null;
    let reinitPending = false;
    let sidebarContainer = null;
    let sidebarResizerEl = null;
    let sidebarResizeSession = null;

    function scheduleSave(opts) {
        if (layoutState) {
            layoutState.markDirty(opts || {});
        }
    }

    function findSidebarContainer() {
        if (!historyDiv) return null;
        const nav = historyDiv.closest('nav[aria-label="Chat history"]');
        if (!nav) return null;
        return (
            nav.closest('[data-testid="left-sidebar"]') ||
            nav.closest('[data-testid="left-panel"]') ||
            nav.closest("aside") ||
            nav.parentElement ||
            nav
        );
    }

    function applySidebarWidth(width) {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        if (!sidebarContainer) return;
        const root = document.documentElement;
        if (!root) return;
        const removeInline = () => {
            sidebarContainer.style.removeProperty("width");
            sidebarContainer.style.removeProperty("minWidth");
            sidebarContainer.style.removeProperty("maxWidth");
            sidebarContainer.style.removeProperty("flex");
        };
        if (typeof width !== "number" || Number.isNaN(width)) {
            removeInline();
            root.style.removeProperty(SIDEBAR_WIDTH_VAR);
            return;
        }
        const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
        removeInline();
        root.style.setProperty(SIDEBAR_WIDTH_VAR, `${clamped}px`);
    }

    function teardownSidebarResizer() {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        if (sidebarResizerEl && sidebarResizerEl.parentNode) {
            sidebarResizerEl.parentNode.removeChild(sidebarResizerEl);
        }
        sidebarResizerEl = null;
        if (sidebarContainer) {
            sidebarContainer.classList.remove("glyn-sidebar-resizable");
            if (sidebarContainer.dataset && sidebarContainer.dataset.glynSidebarPrevPos === "applied") {
                sidebarContainer.style.position = "";
                delete sidebarContainer.dataset.glynSidebarPrevPos;
            }
        }
        sidebarContainer = null;
    }

    function setupSidebarResizer() {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        const container = findSidebarContainer();
        if (!container) {
            teardownSidebarResizer();
            return;
        }
        if (sidebarContainer && sidebarContainer !== container) {
            teardownSidebarResizer();
        }
        sidebarContainer = container;
        const style = window.getComputedStyle(container);
        if (style.position === "static") {
            container.dataset.glynSidebarPrevPos = "applied";
            container.style.position = "relative";
        }
        container.classList.add("glyn-sidebar-resizable");
        if (!sidebarResizerEl) {
            const handle = document.createElement("div");
            handle.id = "glyn-sidebar-resizer";
            handle.title = "Drag to resize";
            handle.addEventListener("mousedown", onSidebarResizeStart);
            container.appendChild(handle);
            sidebarResizerEl = handle;
        }
        const storedWidth = layoutState ? layoutState.getSidebarWidth() : null;
        if (typeof storedWidth === "number") {
            applySidebarWidth(storedWidth);
        }
    }

    function onSidebarResizeStart(event) {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        if (event.button !== 0 || !sidebarContainer) return;
        event.preventDefault();
        const rect = sidebarContainer.getBoundingClientRect();
        sidebarResizeSession = {
            startX: event.clientX,
            startWidth: rect.width
        };
        document.addEventListener("mousemove", onSidebarResizeMove, true);
        document.addEventListener("mouseup", onSidebarResizeEnd, true);
        document.body.classList.add("glyn-resizing-sidebar");
    }

    function onSidebarResizeMove(event) {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        if (!sidebarResizeSession || !sidebarContainer) return;
        const delta = event.clientX - sidebarResizeSession.startX;
        const width = sidebarResizeSession.startWidth + delta;
        applySidebarWidth(width);
    }

    function onSidebarResizeEnd() {
        if (!ENABLE_SIDEBAR_RESIZER) return;
        if (!sidebarResizeSession) return;
        document.removeEventListener("mousemove", onSidebarResizeMove, true);
        document.removeEventListener("mouseup", onSidebarResizeEnd, true);
        document.body.classList.remove("glyn-resizing-sidebar");
        const finalWidth = sidebarContainer
            ? sidebarContainer.getBoundingClientRect().width
            : null;
        sidebarResizeSession = null;
        if (layoutState && typeof finalWidth === "number") {
            layoutState.setSidebarWidth(finalWidth);
        }
    }

    function enforceFoldersTopOrder() {
        if (!globalSettings || !globalSettings.getForceFoldersTop()) return;
        if (!folderManager || !historyDiv) return;
        const wrappers = folderManager.folders
            .map(rec => rec && rec.wrapperEl)
            .filter(el => el && el.parentNode === historyDiv);
        if (!wrappers.length) return;
        const fragment = document.createDocumentFragment();
        wrappers.forEach(wrapper => fragment.appendChild(wrapper));
        const children = Array.from(historyDiv.children);
        const beforeNode = children.find(node =>
            node &&
            !(node.classList && node.classList.contains("glyn-folder-wrapper"))
        ) || null;
        if (beforeNode) {
            historyDiv.insertBefore(fragment, beforeNode);
        } else {
            historyDiv.appendChild(fragment);
        }
    }

    function applyGlobalSettings(options) {
        const forceTop = globalSettings
            ? globalSettings.getForceFoldersTop()
            : FORCE_FOLDERS_AT_TOP;
        if (dragController && typeof dragController.setForceFoldersTop === "function") {
            dragController.setForceFoldersTop(forceTop);
        }
        if (forceTop) {
            enforceFoldersTopOrder();
        }
        const style = globalSettings ? globalSettings.getFolderIconStyle() : "outline";
        window.FOLDER_ICON_STYLE = style;
        if (folderManager && typeof folderManager.refreshAllFolderIcons === "function") {
            folderManager.refreshAllFolderIcons();
        }
        if (options && options.persist) {
            scheduleSave({ immediate: true });
        }
    }

    function findHistoryContainer() {
        const selectors = [
            "#history",
            '[data-testid="conversation-sidebar-list"]',
            '[data-testid="conversation-list"]',
            'nav[aria-label="Chat history"] ol',
            'nav[aria-label="Chat history"] div[data-testid="conversation-list"]',
            'nav[aria-label="Chat history"] div[role="presentation"]'
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                return el;
            }
        }
        const nav = document.querySelector('nav[aria-label="Chat history"]');
        if (nav) {
            const scroll = Array.from(nav.querySelectorAll("div")).find(div =>
                div.scrollHeight > div.clientHeight && div.querySelector("a.__menu-item")
            );
            if (scroll) {
                return scroll;
            }
        }
        return null;
    }

    function ensureMessageListener() {
        if (messageListenerBound || !chrome || !chrome.runtime || !chrome.runtime.onMessage) return;
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (!message || !message.glynCommand) return;
            if (message.glynCommand === "createFolder") {
                if (folderManager) {
                    const folder = folderManager.createFolder("New Folder");
                    if (folder && typeof folder.inlineRename === "function") {
                        folder.inlineRename();
                    }
                    if (folder) {
                        scheduleSave({ immediate: true });
                        if (sendResponse) sendResponse({ ok: true });
                    } else if (sendResponse) {
                        sendResponse({ ok: false, error: "folder-not-created" });
                    }
                } else if (sendResponse) {
                    sendResponse({ ok: false, error: "not-ready" });
                }
                return true;
            }
            if (message.glynCommand === "settingsChanged") {
                if (!globalSettings) {
                    if (sendResponse) sendResponse({ ok: false, error: "not-ready" });
                    return true;
                }
                const payload = message.payload || {};
                const updates = {};
                if (Object.prototype.hasOwnProperty.call(payload, "forceFoldersTop")) {
                    updates.forceFoldersTop = !!payload.forceFoldersTop;
                }
                if (Object.prototype.hasOwnProperty.call(payload, "folderIconStyle")) {
                    updates.folderIconStyle = payload.folderIconStyle === "fill" ? "fill" : "outline";
                }
                if (!Object.keys(updates).length) {
                    if (sendResponse) sendResponse({ ok: true });
                    return true;
                }
                globalSettings.setValues(updates)
                    .then(() => {
                        applyGlobalSettings({ persist: true });
                        if (sendResponse) sendResponse({ ok: true });
                    })
                    .catch(err => {
                        console.warn("[GlynGPT] Failed to apply settings", err);
                        if (sendResponse) sendResponse({ ok: false, error: "apply-failed" });
                    });
                return true;
            }
            if (message.glynCommand === "expandAllFolders" || message.glynCommand === "collapseAllFolders") {
                try {
                    if (!folderManager || typeof folderManager.setAllFoldersExpanded !== "function") {
                        if (sendResponse) sendResponse({ ok: false, error: "not-ready" });
                        return true;
                    }
                    const expand = message.glynCommand === "expandAllFolders";
                    const changed = folderManager.setAllFoldersExpanded(expand);
                    if (changed) {
                        scheduleSave({ immediate: true });
                    }
                    if (sendResponse) {
                        sendResponse({ ok: true, changed });
                    }
                } catch (err) {
                    console.warn("[GlynGPT] Failed to update folders", err);
                    if (sendResponse) {
                        sendResponse({ ok: false, error: "update-failed" });
                    }
                }
                return true;
            }
            if (message.glynCommand === "getStatus") {
                if (sendResponse) {
                    sendResponse({
                        ok: true,
                        settings: globalSettings ? globalSettings.getValues() : null,
                        ready: !!folderManager
                    });
                }
                return true;
            }
        });
        messageListenerBound = true;
    }

    // ---- drop marker + highlight helpers ----

    function ensureDropMarker() {
        if (dropMarker) return;
        dropMarker = document.createElement("div");
        dropMarker.id = "glyn-drop-marker";
        dropMarker.style.height = "12px";
        dropMarker.style.margin = "2px 0";
        dropMarker.style.borderTop = "2px solid #999";
        dropMarker.style.borderRadius = "0";
        dropMarker.style.boxSizing = "border-box";
        dropMarker.addEventListener("dragover", onDropMarkerDragOver);
        dropMarker.addEventListener("drop", onDropMarkerDrop);
    }

    function onDropMarkerDragOver(evt) {
        if (!DraggableElement || !DraggableElement.currentDrag) return;
        evt.preventDefault();
        if (evt.dataTransfer) {
            evt.dataTransfer.dropEffect = "move";
        }
    }

    function onDropMarkerDrop(evt) {
        if (!DraggableElement ||
            !DraggableElement.currentDrag ||
            !DraggableElement.dropHandler) {
            return;
        }
        evt.preventDefault();

        const source = DraggableElement.currentDrag;
        const container = dropMarker ? dropMarker.parentNode : null;
        if (!container) return;

        const nextEl = dropMarker.nextElementSibling;
        let target = null;
        let beforeElementTarget = null;
        const isRootContainer = container === historyDiv;
        if (nextEl) {
            if (nextEl.__glynChatItem) {
                target = nextEl.__glynChatItem;
            } else if (nextEl.__glynFolderItem) {
                beforeElementTarget = {
                    type: "before-element",
                    element: nextEl
                };
            } else if (isRootContainer) {
                beforeElementTarget = {
                    type: "before-element",
                    element: nextEl
                };
            }
        } else {
            beforeElementTarget = beforeElementTarget || {
                type: "before-element",
                element: null
            };
        }

        const finalTarget = target || beforeElementTarget;

        DraggableElement.dropHandler(source, finalTarget, container, evt);

        if (DraggableElement.hideDropMarker) {
            DraggableElement.hideDropMarker();
        }
        if (finalTarget && finalTarget.type === "folder" && DraggableElement.unhighlightDropTarget) {
            DraggableElement.unhighlightDropTarget(finalTarget.el);
        }
    }

    function showDropMarker(beforeEl, explicitContainer) {
        let container = explicitContainer || (beforeEl ? beforeEl.parentNode : null);
        if (!container) return;

        if (beforeEl && beforeEl.parentNode &&
            beforeEl.parentNode.classList &&
            beforeEl.parentNode.classList.contains("glyn-folder-wrapper")) {
            beforeEl = beforeEl.parentNode;
            container = beforeEl.parentNode;
        }

        if (!container) return;
        ensureDropMarker();

        const samePosition =
            dropMarker.parentNode === container &&
            (beforeEl ? dropMarker.nextSibling === beforeEl : !dropMarker.nextSibling);

        if (samePosition) {
            return;
        }

        hideDropMarker();
        if (beforeEl) {
            container.insertBefore(dropMarker, beforeEl);
        } else {
            container.appendChild(dropMarker);
        }
    }

    function hideDropMarker() {
        if (dropMarker && dropMarker.parentNode) {
            dropMarker.parentNode.removeChild(dropMarker);
        }
    }

    function highlightFolderRow(rowEl) {
        if (highlightedFolderRow === rowEl) return;

        if (highlightedFolderRow) {
            unhighlightFolderRow(highlightedFolderRow);
        }

        highlightedFolderRow = rowEl;

        if (!rowEl.dataset.glynPrevBg) {
            rowEl.dataset.glynPrevBg = rowEl.style.backgroundColor || "";
        }
        rowEl.style.backgroundColor = "#444";
    }

    function unhighlightFolderRow(rowEl) {
        if (!rowEl) return;
        if (rowEl.dataset && typeof rowEl.dataset.glynPrevBg !== "undefined") {
            rowEl.style.backgroundColor = rowEl.dataset.glynPrevBg;
            delete rowEl.dataset.glynPrevBg;
        }
        if (highlightedFolderRow === rowEl) {
            highlightedFolderRow = null;
        }
    }

    // ---- root chat helpers ----

    function getRootChatLinks() {
        if (!historyDiv) return [];
        return Array.from(historyDiv.children).filter(el =>
            el.matches("a.__menu-item")
        );
    }

    function makeRootLinksDraggable() {
        if (!historyDiv || !historyManager) return;

        const links = getRootChatLinks();
        historyManager.ensureChatOrderFromLinks(links);

        links.forEach(link => {
            if (link.__glynChatItem) return;
            const href = link.getAttribute("href") || "";
            if (!href) return;
            const title = link.innerText.trim();
            const item = new ChatItem(link, href, title);
            link.__glynChatItem = item;
            item.enableDrag();
        });
    }

    function observeHistory() {
        makeRootLinksDraggable();

        if (historyObserver) {
            historyObserver.disconnect();
        }

        historyObserver = new MutationObserver(() => {
            makeRootLinksDraggable();
        });

        historyObserver.observe(historyDiv, {
            childList: true,
            subtree: false
        });
    }

    function stopHistoryObserver() {
        if (historyObserver) {
            historyObserver.disconnect();
            historyObserver = null;
        }
    }

    function startContainerMonitor() {
        stopContainerMonitor();
        containerMonitorTimer = setInterval(() => {
            if (!historyDiv || !document.contains(historyDiv)) {
                scheduleReinit("container-detached");
            }
        }, 1000);
    }

    function stopContainerMonitor() {
        if (containerMonitorTimer) {
            clearInterval(containerMonitorTimer);
            containerMonitorTimer = null;
        }
    }

    function scheduleReinit(reason) {
        if (reinitPending) return;
        reinitPending = true;
        console.warn("[GlynGPT] Reinitialising folders:", reason);
        stopHistoryObserver();
        stopContainerMonitor();
        hideDropMarker();
        if (ENABLE_SIDEBAR_RESIZER) {
            teardownSidebarResizer();
        }
        historyManager = null;
        folderManager = null;
        folderMenu = null;
        dragController = null;
        layoutState = null;
        storageService = null;
        globalSettings = null;
        setTimeout(() => {
            reinitPending = false;
            historyDiv = null;
            init();
        }, 300);
    }

    function initOnceHistoryFound() {
        historyManager = new HistoryManager();
        folderMenu = new FolderMenu();
        folderManager = new FolderManager(historyDiv, historyManager, folderMenu);
        dragController = new DragController(
            historyDiv,
            historyManager,
            folderManager,
            FORCE_FOLDERS_AT_TOP
        );

        storageService = new StorageService({
            area: "sync",
            storageKey: "glynGptState"
        });
        globalSettings = new GlobalSettings(storageService);
        layoutState = new LayoutState(storageService, folderManager, historyManager);
        if (ENABLE_SIDEBAR_RESIZER) {
            setupSidebarResizer();
        }
        ensureMessageListener();
        globalSettings.load()
            .then(() => applyGlobalSettings())
            .catch(() => applyGlobalSettings());

        // Wire draggable behaviour
        DraggableElement.showDropMarker = showDropMarker;
        DraggableElement.hideDropMarker = hideDropMarker;
        DraggableElement.highlightDropTarget = highlightFolderRow;
        DraggableElement.unhighlightDropTarget = unhighlightFolderRow;
        DraggableElement.setDropHandler((source, target, containerEl, evt) => {
            dragController.handleDrop(source, target, containerEl, evt);
        });

        // Folder menu callbacks
        folderMenu.onNew = (folderItem) => {
            const newFolder = folderManager.createFolder("New Folder", {
                parentFolder: folderItem,
                insertAtTop: true
            });
            if (newFolder) {
                if (typeof folderItem.setExpanded === "function") {
                    folderItem.setExpanded(true);
                }
                if (typeof newFolder.inlineRename === "function") {
                    newFolder.inlineRename();
                }
            }
            scheduleSave({ immediate: true });
        };
        folderMenu.onRename = (folderItem) => {
            folderItem.inlineRename();
        };
        folderMenu.onChangeColor = (folderItem, color) => {
            console.log("[GlynGPT] folderMenu.onChangeColor", {
                folder: folderItem && folderItem.data,
                color,
            });
            if (folderItem && typeof folderItem.setColor === "function") {
                folderItem.setColor(color);
            }
            // Persistence handled via layout state change handlers
        };
        folderMenu.onDelete = (folderItem) => {
            folderManager.deleteFolder(folderItem);
        };

        makeRootLinksDraggable();

        const bindChangeHandlers = () => {
            const onStructureChange = () => {
                scheduleSave();
                if (globalSettings && globalSettings.getForceFoldersTop()) {
                    enforceFoldersTopOrder();
                }
            };
            folderManager.setChangeHandler(onStructureChange);
            historyManager.setChangeHandler(onStructureChange);
        };

        layoutState.restore()
            .then(() => {
                if (!folderManager.folders.length) {
                    folderManager.createInitialFolder("New Folder");
                }
            })
            .catch(() => {
                if (!folderManager.folders.length) {
                    folderManager.createInitialFolder("New Folder");
                }
            })
            .finally(() => {
                if (ENABLE_SIDEBAR_RESIZER) {
                    const savedWidth = layoutState ? layoutState.getSidebarWidth() : null;
                    if (typeof savedWidth === "number") {
                        applySidebarWidth(savedWidth);
                    }
                }
                bindChangeHandlers();
                observeHistory();
                startContainerMonitor();
            });
    }

    function init(maxAttempts = 20, delayMs = 250) {
        let attempts = 0;

        function check() {
            historyDiv = findHistoryContainer();

            if (historyDiv) {
                initOnceHistoryFound();
                return;
            }

            attempts += 1;
            if (attempts < maxAttempts) {
                setTimeout(check, delayMs);
            } else {
                console.warn("[GlynGPT] Could not find #history after retries.");
            }
        }

        check();
    }

    init();
})();
