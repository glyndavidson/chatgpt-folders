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
    const downloadDataLink = document.getElementById("download-data-link");
    const importDemoDataBtn = document.getElementById("import-demo-data-btn");

    const DEMO_DATA = {
        globalSettings: {
            folderIconStyle: "fill",
            forceFoldersTop: false
        },
        layout: {
            items: [
                { id: "/c/6932f071-7c20-832f-8395-a9b3d2041ad7", type: "chat" },
                {
                    id: "folder-4",
                    type: "folder",
                    name: "Fatigue",
                    color: "#598ab1",
                    expanded: false,
                    children: [
                        { id: "/c/692ed171-a164-8330-b114-24a89a32e3b7", type: "chat" },
                        { id: "/c/692b5336-52dc-8333-bd18-a3ad65458002", type: "chat" },
                        { id: "/c/69285637-5d3c-832a-9e3e-13e77bf9a513", type: "chat" },
                        { id: "/c/692ef86e-c854-832b-8c5f-211977ff42f3", type: "chat" }
                    ]
                },
                {
                    id: "folder-5",
                    type: "folder",
                    name: "Introspection",
                    color: "#c800ff",
                    expanded: false,
                    children: [
                        { id: "/c/692794c3-bd10-8325-b12e-77e530c86a7f", type: "chat" },
                        { id: "/c/6929b48e-52fc-832d-a951-1454a1938e69", type: "chat" }
                    ]
                },
                {
                    id: "folder-6",
                    type: "folder",
                    name: "Crypto",
                    color: "#ffae00",
                    expanded: false,
                    children: [
                        { id: "/c/68c5e2bc-5ef8-832f-a138-0a96bc440eb5", type: "chat" }
                    ]
                },
                {
                    id: "folder-7",
                    type: "folder",
                    name: "Climb Wales",
                    color: "#007bff",
                    expanded: false,
                    children: [
                        { id: "/c/691f6686-edd0-8327-98e0-283ca45b430f", type: "chat" }
                    ]
                },
                {
                    id: "folder-8",
                    type: "folder",
                    name: "Job Applications",
                    color: "#e1ff00",
                    expanded: true,
                    children: [
                        {
                            id: "folder-9",
                            type: "folder",
                            name: "Canonical",
                            color: "#ff8800",
                            expanded: true,
                            children: [
                                {
                                    id: "folder-12",
                                    type: "folder",
                                    name: "Practical",
                                    color: null,
                                    expanded: true,
                                    children: []
                                },
                                {
                                    id: "folder-10",
                                    type: "folder",
                                    name: "Psychometric Test",
                                    color: "#00d5ff",
                                    expanded: false,
                                    children: [
                                        { id: "/c/6930499f-2c2c-832a-bd40-657cc14f61b2", type: "chat" },
                                        { id: "/c/692e0255-e91c-832f-a994-a65d03963a04", type: "chat" },
                                        { id: "/c/692ec40e-5584-8330-9b0c-0f4252540e68", type: "chat" },
                                        { id: "/c/692ec720-fe98-832b-a74e-eda0b0196ecb", type: "chat" },
                                        { id: "/c/692ecb76-9ec8-8333-bc18-69a22f9e8902", type: "chat" },
                                        { id: "/c/692ed04b-b9f8-832e-b381-7030e6902aac", type: "chat" },
                                        { id: "/c/692ecff2-3148-8333-93ef-803e7361fc56", type: "chat" }
                                    ]
                                },
                                { id: "/c/6921fc76-9d90-8330-9dd0-b955af51dc2f", type: "chat" },
                                { id: "/c/6913671f-fa68-832c-862d-6bfe30a4ab10", type: "chat" },
                                { id: "/c/692474e9-a07c-8327-a30e-00fca26222f5", type: "chat" },
                                { id: "/c/692c7723-ecb4-832e-aa57-e027014d5998", type: "chat" }
                            ]
                        }
                    ]
                },
                {
                    id: "folder-11",
                    type: "folder",
                    name: "Plugins",
                    color: "#ff0000",
                    expanded: true,
                    children: [
                        { id: "/c/69300586-8824-832a-8b6a-f0ae36abbed2", type: "chat" },
                        { id: "/c/69306bf4-1a14-832d-b652-599e2d32e0bd", type: "chat" },
                        { id: "/c/692ecc64-51a8-8329-9e52-c37db068c87e", type: "chat" },
                        { id: "/c/6919da23-1608-8328-9144-fb731e08fd91", type: "chat" }
                    ]
                },
                { id: "/c/692d7113-3e78-8326-ad2c-37214c90f44e", type: "chat" },
                { id: "/c/692de0f8-d55c-8326-a807-d7952f50fcff", type: "chat" },
                { id: "/c/692dca3f-2e40-832c-970f-f6a3bd7bb94f", type: "chat" },
                { id: "/c/6932e274-aff8-832c-b7af-1f3f0dc76496", type: "chat" },
                { id: "/c/6931ba71-e9c4-832b-8f99-61b30454fa82", type: "chat" },
                { id: "/c/6931a90d-c2d4-832b-8b0a-9de908a030f7", type: "chat" },
                { id: "/c/693092e1-f478-832c-84c3-a9004ed4935f", type: "chat" },
                { id: "/c/6930b99f-5378-832e-a657-95825ecbea89", type: "chat" },
                { id: "/c/692f82e7-ce74-8327-98be-63b5163cc4c0", type: "chat" },
                { id: "/c/692b56f9-e5e8-8330-a9d4-8514e8e5eec3", type: "chat" },
                { id: "/c/6926f55c-6720-832b-91fa-fd0a7bb17f22", type: "chat" },
                { id: "/c/6925d7c0-9bac-8332-8e44-d0a6cbe581d3", type: "chat" },
                { id: "/c/6925cbdf-8c90-832a-a545-79eb3d42d702", type: "chat" },
                { id: "/c/692439d0-5174-8330-8e87-152e51274b3e", type: "chat" },
                { id: "/c/69234aa3-0644-8332-9f50-8ba9e08cd6e9", type: "chat" },
                { id: "/c/69231cc8-619c-832c-a9b8-15ff17f0154b", type: "chat" },
                { id: "/c/692207cd-5684-832c-97b6-9b5225c4b1e8", type: "chat" },
                { id: "/c/6921dea1-9b1c-8328-9dd1-ba9bf3394952", type: "chat" },
                { id: "/c/69209199-ed84-8329-aed7-2bc685713e91", type: "chat" },
                { id: "/c/691f4967-882c-8331-ae03-8e43e32423f8", type: "chat" },
                { id: "/c/6921c2fa-0eac-832e-9c11-b7396f8b231c", type: "chat" },
                { id: "/c/69203cb1-6b7c-8327-8c36-f87fa8556db8", type: "chat" },
                { id: "/c/691ee575-d514-8326-8922-6b36c28bf39c", type: "chat" },
                { id: "/c/691e33f6-1cb4-8332-9fc4-9b8d75ad2376", type: "chat" },
                { id: "/c/691ded3b-1570-832c-9c1c-6c8cb08f9c07", type: "chat" },
                { id: "/c/691ddf92-3478-8333-913d-375a781512f2", type: "chat" },
                { id: "/c/691dda31-9ec0-832b-8cab-041320a0e3b8", type: "chat" },
                { id: "/c/691dd6cc-93e8-8326-9d47-a982089d4c87", type: "chat" },
                { id: "/c/691db34e-ef50-832e-b6a4-0cd91fd7b878", type: "chat" },
                { id: "/c/691da73e-4578-832f-bb27-7ed212973176", type: "chat" },
                { id: "/c/691b4ffa-d130-8327-91b5-ebfbb746e2c8", type: "chat" },
                { id: "/c/691b3ad1-2308-8333-9686-2acd15b99d63", type: "chat" }
            ],
            sidebarWidth: 276.9886169433594
        }
    };

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
        if (downloadDataLink) {
            downloadDataLink.addEventListener("click", (e) => {
                e.preventDefault();
                exportDataSnapshot();
            });
        }
        if (importDemoDataBtn) {
            importDemoDataBtn.addEventListener("click", () => {
                importDemoDataBtn.disabled = true;
                statusEl.textContent = "Loading demo data...";
                storage.save(DEMO_DATA)
                    .then(() => {
                        statusEl.textContent = "Demo data loaded. Reload chatgpt.com to apply.";
                    })
                    .catch((err) => {
                        console.warn("[GlynGPT] Failed to import demo data", err);
                        statusEl.textContent = "Could not load demo data.";
                    })
                    .finally(() => {
                        importDemoDataBtn.disabled = false;
                    });
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
