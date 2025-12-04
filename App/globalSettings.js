(function () {
    const ns = (window.GlynGPT = window.GlynGPT || {});

    class GlobalSettings {
        constructor(storageService) {
            this.storage = storageService;
            this.key = "globalSettings";
            this.values = {
                forceFoldersTop: false,
                folderIconStyle: "outline"
            };
        }

        async load() {
            if (!this.storage) return this.values;
            const data = await this.storage.load({});
            if (data && typeof data === "object" && data[this.key]) {
                this.values = Object.assign({}, this.values, data[this.key]);
            }
            return this.values;
        }

        async save() {
            if (!this.storage) return false;
            const payload = await this.storage.load({});
            const next = Object.assign({}, payload, {
                [this.key]: this.values
            });
            return this.storage.save(next);
        }

        setForceFoldersTop(value) {
            this.values.forceFoldersTop = !!value;
            return this.save();
        }

        getForceFoldersTop() {
            return !!this.values.forceFoldersTop;
        }

        setFolderIconStyle(style) {
            this.values.folderIconStyle = this._normalizeIconStyle(style);
            return this.save();
        }

        getFolderIconStyle() {
            return this._normalizeIconStyle(this.values.folderIconStyle);
        }

        async setValues(partial) {
            if (!partial || typeof partial !== "object") {
                return this.save();
            }
            if (Object.prototype.hasOwnProperty.call(partial, "forceFoldersTop")) {
                this.values.forceFoldersTop = !!partial.forceFoldersTop;
            }
            if (Object.prototype.hasOwnProperty.call(partial, "folderIconStyle")) {
                this.values.folderIconStyle = this._normalizeIconStyle(partial.folderIconStyle);
            }
            return this.save();
        }

        getValues() {
            return Object.assign({}, this.values);
        }

        _normalizeIconStyle(style) {
            return style === "fill" ? "fill" : "outline";
        }
    }

    ns.GlobalSettings = GlobalSettings;
})();
