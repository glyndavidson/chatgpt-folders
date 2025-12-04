(function () {
    // @meta DraggableElement centralizes drag event wiring shared by chat items and folder rows.
    const ns = (window.GlynGPT = window.GlynGPT || {});

    class DraggableElement {
        constructor(domElement, id, type) {
            this.el = domElement;
            this.id = id;       // href for chats, folderId for folders
            this.type = type;   // "chat" or "folder"
            this.enabled = false;
        }

        enableDrag() {
            if (this.enabled || !this.el) return;
            this.enabled = true;

            this.el.setAttribute("draggable", "true");
            this.el.dataset.glynId = this.id;
            this.el.dataset.glynType = this.type;

            this.el.addEventListener("dragstart", this.onDragStart.bind(this));
            this.el.addEventListener("dragover", this.onDragOver.bind(this));
            this.el.addEventListener("drop", this.onDrop.bind(this));
            this.el.addEventListener("dragend", this.onDragEnd.bind(this));
            this.el.addEventListener("dragleave", this.onDragLeave.bind(this));
        }

        onDragStart(evt) {
            DraggableElement.currentDrag = this;
            if (evt.dataTransfer) {
                evt.dataTransfer.effectAllowed = "move";
                // Needed for cross-browser behaviour
                evt.dataTransfer.setData("text/plain", this.id);
            }
        }

        onDragOver(evt) {
            if (!DraggableElement.currentDrag) return;
            evt.preventDefault();
            if (evt.dataTransfer) {
                evt.dataTransfer.dropEffect = "move";
            }

            const source = DraggableElement.currentDrag;

            // Chat hovering folders: support before/after insertion zones
            if (this.type === "folder" && (source.type === "chat" || source.type === "folder")) {
                const rect = this.el.getBoundingClientRect();
                const relY = rect && rect.height
                    ? (evt.clientY - rect.top) / rect.height
                    : 0.5;
                const wrapper = this.el.closest(".glyn-folder-wrapper");
                const rootContainer = wrapper ? wrapper.parentNode : this.el.parentNode;

                if (relY <= 0.25 && rootContainer) {
                    if (DraggableElement.showDropMarker) {
                        DraggableElement.showDropMarker(wrapper || this.el, rootContainer);
                    }
                    if (DraggableElement.unhighlightDropTarget) {
                        DraggableElement.unhighlightDropTarget(this.el);
                    }
                    return;
                }

                if (relY >= 0.75 && rootContainer) {
                    const afterEl = wrapper ? wrapper.nextSibling : this.el.nextSibling;
                    if (DraggableElement.showDropMarker) {
                        DraggableElement.showDropMarker(afterEl || null, rootContainer);
                    }
                    if (DraggableElement.unhighlightDropTarget) {
                        DraggableElement.unhighlightDropTarget(this.el);
                    }
                    return;
                }

                if (DraggableElement.hideDropMarker) {
                    DraggableElement.hideDropMarker();
                }
                if (DraggableElement.highlightDropTarget) {
                    DraggableElement.highlightDropTarget(this.el);
                }
                return; // important: don't fall through to spacer logic
            }

            // All other cases
            // For chat->chat, folder->folder, folder->chat etc.,
            // we use the spacer line and DON'T highlight the folder.
            if (DraggableElement.showDropMarker) {
                DraggableElement.showDropMarker(this.el);
            }

            // ensure any previous folder highlight is cleared if we're not
            // in the chat->folder case
            if (this.type === "folder" && DraggableElement.unhighlightDropTarget) {
                DraggableElement.unhighlightDropTarget(this.el);
            }
        }
        onDrop(evt) {
            if (!DraggableElement.currentDrag) return;
            evt.preventDefault();

            const source = DraggableElement.currentDrag;
            const target = this;
            const container = this.el.parentNode;

            if (DraggableElement.hideDropMarker) {
                DraggableElement.hideDropMarker();
            }
            if (DraggableElement.unhighlightDropTarget) {
                DraggableElement.unhighlightDropTarget(this.el);
            }

            if (DraggableElement.dropHandler && source !== target) {
                DraggableElement.dropHandler(source, target, container, evt);
            }
        }

        onDragLeave(_evt) {
            // If we were highlighting a folder as a target, clear that when
            // the drag leaves the row.
            if (this.type === "folder" && DraggableElement.unhighlightDropTarget) {
                DraggableElement.unhighlightDropTarget(this.el);
            }
        }

        onDragEnd(_evt) {
            if (DraggableElement.hideDropMarker) {
                DraggableElement.hideDropMarker();
            }
            if (this.type === "folder" && DraggableElement.unhighlightDropTarget) {
                DraggableElement.unhighlightDropTarget(this.el);
            }
            DraggableElement.currentDrag = null;
        }

        // static: wire in a central drop handler
        static setDropHandler(fn) {
            DraggableElement.dropHandler = fn;
        }
    }

    DraggableElement.currentDrag = null;
    DraggableElement.dropHandler = null;
    DraggableElement.showDropMarker = null;
    DraggableElement.hideDropMarker = null;
    DraggableElement.highlightDropTarget = null;
    DraggableElement.unhighlightDropTarget = null;

    ns.DraggableElement = DraggableElement;
})();
