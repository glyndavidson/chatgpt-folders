(function () {
    const ns = window.GlynGPT || {};
    const StorageService = ns.StorageService;
    const GlobalSettings = ns.GlobalSettings;

    const foldersTopEl = document.getElementById("setting-folders-top");
    const iconStyleEls = Array.from(document.querySelectorAll("input[name='icon-style']"));
    const createFolderBtn = document.getElementById("create-folder-btn");
    const expandAllBtn = document.getElementById("expand-all-btn");
    const collapseAllBtn = document.getElementById("collapse-all-btn");
    const statusEl = document.getElementById("status");

    if (!StorageService || !GlobalSettings) {
        statusEl.textContent = "Storage unavailable.";
        disableControls(true);
        return;
    }

    const storage = new StorageService({ area: "sync", storageKey: "glynGptState" });
    const settings = new GlobalSettings(storage);
    let loading = true;

    init();

    function disableControls(disabled) {
        if (foldersTopEl) foldersTopEl.disabled = disabled;
        iconStyleEls.forEach(el => { el.disabled = disabled; });
        if (createFolderBtn) createFolderBtn.disabled = disabled;
        setBulkButtonsDisabled(disabled);
    }

    function setBulkButtonsDisabled(disabled) {
        if (expandAllBtn) expandAllBtn.disabled = disabled;
        if (collapseAllBtn) collapseAllBtn.disabled = disabled;
    }

    async function init() {
        try {
            const values = await settings.load();
            applyUI(values);
            attachHandlers();
        } catch (err) {
            console.warn("[GlynGPT] Failed to load settings", err);
            statusEl.textContent = "Unable to load settings.";
            disableControls(true);
        } finally {
            loading = false;
        }
    }

    function applyUI(values) {
        if (!values) return;
        if (foldersTopEl) {
            foldersTopEl.checked = !!values.forceFoldersTop;
        }
        const style = values.folderIconStyle === "fill" ? "fill" : "outline";
        iconStyleEls.forEach(el => {
            el.checked = el.value === style;
        });
    }

    function attachHandlers() {
        if (foldersTopEl) {
            foldersTopEl.addEventListener("change", () => {
                if (loading) return;
                handleSettingChange({ forceFoldersTop: foldersTopEl.checked });
            });
        }
        iconStyleEls.forEach(el => {
            el.addEventListener("change", () => {
                if (loading || !el.checked) return;
                handleSettingChange({ folderIconStyle: el.value });
            });
        });
        if (createFolderBtn) {
            createFolderBtn.addEventListener("click", () => {
                createFolderBtn.disabled = true;
                requestNewFolder()
                    .finally(() => {
                        createFolderBtn.disabled = false;
                    });
            });
        }
        if (expandAllBtn) {
            expandAllBtn.addEventListener("click", () => {
                handleFolderBulkAction("expandAllFolders", "Expanding folders...", "All folders expanded.");
            });
        }
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener("click", () => {
                handleFolderBulkAction("collapseAllFolders", "Collapsing folders...", "All folders collapsed.");
            });
        }
    }

    async function handleSettingChange(partial) {
        try {
            disableControls(true);
            await settings.setValues(partial);
            await notifyActiveTab({
                glynCommand: "settingsChanged",
                payload: settings.getValues()
            });
            statusEl.textContent = "Settings saved.";
        } catch (err) {
            console.warn("[GlynGPT] Failed to save settings", err);
            statusEl.textContent = "Could not save settings.";
        } finally {
            disableControls(false);
            applyUI(settings.getValues());
        }
    }

    async function requestNewFolder() {
        statusEl.textContent = "Requesting new folder...";
        const response = await notifyActiveTab({ glynCommand: "createFolder" });
        if (response && response.ok) {
            statusEl.textContent = "Folder created.";
        } else if (response && response.error) {
            statusEl.textContent = `Unable to create folder (${response.error}).`;
        } else {
            statusEl.textContent = "Open chat.openai.com and try again.";
        }
    }

    function notifyActiveTab(message) {
        return new Promise((resolve) => {
            if (!chrome.tabs || !chrome.tabs.query) {
                resolve(null);
                return;
            }
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || !tabs.length) {
                    resolve(null);
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ ok: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    resolve(response || null);
                });
            });
        });
    }

    async function handleFolderBulkAction(command, workingMessage, successMessage) {
        if (!command) return;
        setBulkButtonsDisabled(true);
        statusEl.textContent = workingMessage || "Updating folders...";
        try {
            const response = await notifyActiveTab({ glynCommand: command });
            if (response && response.ok) {
                statusEl.textContent = successMessage || "Done.";
            } else if (response && response.error) {
                statusEl.textContent = `Unable to update folders (${response.error}).`;
            } else {
                statusEl.textContent = "Open chat.openai.com and try again.";
            }
        } catch (err) {
            console.warn("[GlynGPT] Failed to update folders", err);
            statusEl.textContent = "Could not update folders.";
        } finally {
            setBulkButtonsDisabled(false);
        }
    }
})();
