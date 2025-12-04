(function () {
    // @meta FolderItem models a sidebar folder row, handling children, metadata, and inline UI state.
    const ns = (window.GlynGPT = window.GlynGPT || {});
    const DraggableElement = ns.DraggableElement;

    class FolderItem extends DraggableElement {
        constructor(rowEl, folderId, options) {
            super(rowEl, folderId, "folder");

            const opts = options || {};
            this.wrapperEl = opts.wrapperEl || null;
            this.contentsEl = opts.contentsEl || null;
            this.labelEl = opts.labelEl || null;
            this.chevronEl = opts.chevronEl || null;
            this.menuBtnEl = opts.menuBtnEl || null;
            this.iconEl = opts.iconEl || null;

            this.data = {
                id: folderId,
                name: (opts.data && opts.data.name) || "Folder",
                color: (opts.data && opts.data.color) || null,
                expanded: true
            };

            this.children = [];
            this.isExpanded = true;
            this.isRenaming = false;
            this.parentFolderItem = null;
            this.parentFolderId = null;

            this.onMetadataChange = typeof opts.onMetadataChange === "function"
                ? opts.onMetadataChange
                : null;
            this.onChildrenChange = typeof opts.onChildrenChange === "function"
                ? opts.onChildrenChange
                : null;

            if (this.labelEl) {
                this.labelEl.textContent = this.data.name;
            }

            this.refreshChevron();
            this.refreshIcon();
        }

        setParentFolder(parentFolder) {
            this.parentFolderItem = parentFolder || null;
            this.parentFolderId = parentFolder ? parentFolder.id : null;
        }

        getParentFolder() {
            return this.parentFolderItem || null;
        }

        // ============================
        //     CHILDREN MANAGEMENT
        // ============================

        addChild(chatItem) {
            if (!chatItem) return;
            if (!this.children.includes(chatItem)) {
                this.children.push(chatItem);
                this.emitChildrenChange("addChild");
            }
        }

        removeChildById(childId) {
            const idx = this.children.findIndex((c) => c.id === childId);
            if (idx >= 0) {
                this.children.splice(idx, 1);
                this.emitChildrenChange("removeChild");
            }
        }

        moveChildBefore(childId, targetId) {
            const arr = this.children;
            const fromIndex = arr.findIndex((c) => c.id === childId);
            const toIndex = arr.findIndex((c) => c.id === targetId);
            if (fromIndex === -1 || toIndex === -1 || childId === targetId) return;

            const [item] = arr.splice(fromIndex, 1);
            const newIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
            arr.splice(newIndex, 0, item);
            this.emitChildrenChange("reorderChild");
        }

        applyChildOrderToDOM() {
            if (!this.contentsEl) return;
            this.children.forEach((child) => {
                if (child.el && child.el.parentNode === this.contentsEl) {
                    this.contentsEl.appendChild(child.el);
                }
            });
        }

        syncChildrenFromDOM() {
            if (!this.contentsEl) return;
            const next = [];
            Array.from(this.contentsEl.children).forEach((node) => {
                if (node.__glynChatItem) {
                    next.push(node.__glynChatItem);
                }
            });
            this.children = next;
        }

        // ============================
        //        UI BEHAVIOUR
        // ============================

        toggleExpanded() {
            this.isExpanded = !this.isExpanded;
            if (this.contentsEl) {
                this.contentsEl.style.display = this.isExpanded ? "" : "none";
            }
            this.data.expanded = this.isExpanded;
            this.refreshChevron();
            this.emitMetadataChange("toggleExpanded");
        }

        setExpanded(flag) {
            const next = !!flag;
            if (this.isExpanded === next) return;
            this.isExpanded = next;
            if (this.contentsEl) {
                this.contentsEl.style.display = next ? "" : "none";
            }
            this.data.expanded = next;
            this.refreshChevron();
            this.emitMetadataChange("setExpanded");
        }

        refreshChevron() {
            if (!this.chevronEl) return;
            const Icons = (window.GlynGPT && window.GlynGPT.Icons) || {};
            const svg = this.isExpanded ? Icons.chevronDown : Icons.chevronRight;
            if (svg) this.chevronEl.innerHTML = svg;
        }

        refreshIcon() {
            if (!this.iconEl) return;

            const Icons = (window.GlynGPT && window.GlynGPT.Icons) || {};

            const style = (window.FOLDER_ICON_STYLE || "outline").toLowerCase();
            const useFill = style === "fill" || style === "full";
            const svg = useFill
                ? Icons.folderFullColor
                : Icons.folderOutline; // default = outline

            if (svg) {
                this.iconEl.innerHTML = svg;
            }

            // Apply per-folder colour using currentColor-based SVGs
            if (this.data && this.data.color) {
                this.iconEl.style.color = this.data.color;
            } else {
                // Reset to default (inherit from sidebar text)
                this.iconEl.style.color = "";
            }
        }
        setColor(color) {
            this.data.color = color || null;
            this.refreshIcon();
            this.emitMetadataChange("color");
        }


        // ============================
        //        INLINE RENAME
        // ============================

        inlineRename() {
            if (!this.labelEl || this.isRenaming) return;
            this.isRenaming = true;

            const label = this.labelEl;
            const currentName =
                this.data.name || label.textContent.trim() || "Folder";

            label.dataset.oldName = currentName;
            label.textContent = currentName;
            label.contentEditable = "true";
            label.spellcheck = false;
            label.classList.add("glyn-folder-label-editing");

            // Auto-select all text
            const range = document.createRange();
            range.selectNodeContents(label);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const finish = (commit) => {
                const oldName = label.dataset.oldName || currentName;
                const raw = label.textContent.trim();
                const newName = raw || oldName;

                if (commit) {
                    this.data.name = newName;
                    label.textContent = newName;
                    this.emitMetadataChange("rename");
                } else {
                    label.textContent = oldName;
                }

                label.contentEditable = "false";
                label.classList.remove("glyn-folder-label-editing");
                delete label.dataset.oldName;
                label.removeEventListener("keydown", onKey);
                label.removeEventListener("blur", onBlur);
                this.isRenaming = false;
            };

            const onKey = (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    finish(true);
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    finish(false);
                }
            };

            const onBlur = () => finish(true);

            label.addEventListener("keydown", onKey);
            label.addEventListener("blur", onBlur);
            label.focus();
        }

        // ============================
        //       DELETE FOLDER
        // ============================

        deleteToRoot(historyDiv) {
            if (!historyDiv || !this.wrapperEl) return;

            const links = Array.from(
                this.wrapperEl.querySelectorAll("a.__menu-item")
            );
            links.forEach((link) => {
                historyDiv.appendChild(link);
            });

            if (this.wrapperEl.parentNode) {
                this.wrapperEl.parentNode.removeChild(this.wrapperEl);
            }
            this.children = [];
            this.parentFolderItem = null;
            this.parentFolderId = null;
        }

        emitMetadataChange(reason) {
            if (typeof this.onMetadataChange === "function") {
                this.onMetadataChange(reason || "metadata", this);
            }
        }

        emitChildrenChange(reason) {
            if (typeof this.onChildrenChange === "function") {
                this.onChildrenChange(reason || "children", this);
            }
        }
    }

    ns.FolderItem = FolderItem;
})();
