(function () {
    // @meta popup.js drives the extension popup UI, syncing settings and issuing sidebar commands.
    const ns = window.GlynGPT || {};
    const StorageService = ns.StorageService;
    const GlobalSettings = ns.GlobalSettings;

    const foldersTopEl = document.getElementById("setting-folders-top");
    const iconStyleEls = Array.from(document.querySelectorAll("input[name='icon-style']"));
    const createFolderBtn = document.getElementById("create-folder-btn");
    const expandAllBtn = document.getElementById("expand-all-btn");
    const collapseAllBtn = document.getElementById("collapse-all-btn");
    const statusEl = document.getElementById("status");
    const exportDataBtn = document.getElementById("export-data-btn");
    const importDataBtn = document.getElementById("import-data-btn");
    const importFileInput = document.getElementById("import-file-input");


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
        if (exportDataBtn) {
            exportDataBtn.addEventListener("click", () => {
                exportDataBtn.disabled = true;
                exportDataSnapshot().finally(() => {
                    exportDataBtn.disabled = false;
                });
            });
        }
        if (importDataBtn && importFileInput) {
            importDataBtn.addEventListener("click", () => {
                if (importDataBtn.disabled) return;
                importFileInput.value = "";
                importFileInput.click();
            });
            importFileInput.addEventListener("change", () => {
                if (!importFileInput.files || !importFileInput.files.length) return;
                importJsonFile(importFileInput.files[0]);
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
        handleActionResponse(response, "Folder created.", "Unable to create folder");
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
                const tab = tabs[0];
                if (!isChatGptTab(tab)) {
                    resolve({ ok: false, error: "not-chatgpt-tab", isConnectionError: true });
                    return;
                }
                chrome.tabs.sendMessage(tab.id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ ok: false, error: chrome.runtime.lastError.message, isConnectionError: true });
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
            handleActionResponse(response, successMessage || "Done.", "Unable to update folders");
        } catch (err) {
            console.warn("[GlynGPT] Failed to update folders", err);
            statusEl.textContent = "Could not update folders.";
        } finally {
            setBulkButtonsDisabled(false);
        }
    }

    function handleActionResponse(response, successMessage, failurePrefix) {
        if (response && response.ok) {
            statusEl.textContent = successMessage;
            return;
        }
        if (response && response.error) {
            if (response.isConnectionError) {
                statusEl.textContent = "Please open chatgpt.com and try again.";
            } else {
                statusEl.textContent = `${failurePrefix} (${response.error}).`;
            }
            return;
        }
        statusEl.textContent = "Please open chatgpt.com and try again.";
    }

    async function exportDataSnapshot() {
        try {
            statusEl.textContent = "Preparing download...";
            const data = await storage.load({});
            const serialized = JSON.stringify(data || {}, null, 2);
            const blob = new Blob([serialized], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "chatgpt-folders-data.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            statusEl.textContent = "Data downloaded.";
        } catch (err) {
            console.warn("[GlynGPT] Failed to export data", err);
            statusEl.textContent = "Could not export data.";
        }
    }

    function importJsonFile(file) {
        if (!file) return;
        importDataBtn.disabled = true;
        statusEl.textContent = `Importing ${file.name}...`;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!parsed || typeof parsed !== "object") {
                    throw new Error("invalid-json");
                }
                await storage.save(parsed);
                statusEl.textContent = "Import complete. Reload chatgpt.com to apply.";
            } catch (err) {
                console.warn("[GlynGPT] Failed to import data", err);
                statusEl.textContent = "Could not import data. Please select a valid JSON export.";
            } finally {
                importDataBtn.disabled = false;
            }
        };
        reader.onerror = () => {
            console.warn("[GlynGPT] Failed to read file", reader.error);
            statusEl.textContent = "Could not read the selected file.";
            importDataBtn.disabled = false;
        };
        reader.readAsText(file);
    }

    function isChatGptTab(tab) {
        if (!tab || !tab.url) return false;
        try {
            const url = new URL(tab.url);
            const host = (url.hostname || "").toLowerCase();
            return host === "chatgpt.com";
        } catch (_err) {
            return false;
        }
    }
})();
