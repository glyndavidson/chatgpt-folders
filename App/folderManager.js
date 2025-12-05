(function () {
  // @meta FolderManager owns folder creation, lookup, and persistence hooks for the sidebar tree.
  const ns = (window.GlynGPT = window.GlynGPT || {});
  const FolderItem = ns.FolderItem;
  const ChatItem = ns.ChatItem;

  class FolderManager {
    constructor(historyDiv, historyManager, folderMenu) {
      this.historyDiv = historyDiv;
      this.historyManager = historyManager;
      this.folderMenu = folderMenu;
      this.folders = [];
      this.counter = 0;
      this.onChange = null;
      this._suspendCount = 0;
      this._confirmBackdrop = null;
      this._confirmDialog = null;
      this._confirmDeleteBtn = null;
      this._confirmCancelBtn = null;
      this._confirmResolve = null;
      this._confirmKeyHandler = null;
    }

    setChangeHandler(fn) {
      this.onChange = fn;
    }

    suspendNotifications() {
      this._suspendCount += 1;
    }

    resumeNotifications() {
      if (this._suspendCount > 0) {
        this._suspendCount -= 1;
      }
    }

    triggerChange(reason) {
      if (this._suspendCount > 0) return;
      if (typeof this.onChange === "function") {
        this.onChange(reason || "folder-change");
      }
    }

    createInitialFolder(name) {
      this.suspendNotifications();
      const result = this.createFolder(name || "New Folder", {
        insertAtTop: true
      });
      this.resumeNotifications();
      return result;
    }

    createFolderAbove(existingFolderItem, name, options) {
      const rec = this.getRecordByFolderItem(existingFolderItem);
      const insertBefore = rec ? rec.wrapperEl : null;
      const parentFolder = existingFolderItem ? existingFolderItem.getParentFolder() : null;
      return this.createFolder(name || "New folder", Object.assign({}, options, {
        insertBeforeEl: insertBefore,
        parentFolder: parentFolder || null
      }));
    }

    createFolder(name, options) {
      if (!this.historyDiv) return null;
      const opts = options || {};

      let id = opts.id;
      if (id) {
        const match = /folder-(\d+)/.exec(id);
        if (match) {
          const numeric = parseInt(match[1], 10);
          if (!Number.isNaN(numeric) && numeric > this.counter) {
            this.counter = numeric;
          }
        }
      } else {
        this.counter += 1;
        id = "folder-" + this.counter;
      }

      const folderName = (opts.data && opts.data.name) || opts.name || name || "Folder";
      const parentFolder = opts.parentFolder || null;
      const container = parentFolder && parentFolder.contentsEl
        ? parentFolder.contentsEl
        : this.historyDiv;
      if (!container) return null;

      const wrapper = document.createElement("div");
      wrapper.className = "glyn-folder-wrapper";
      wrapper.style.padding = "4px 0";

      wrapper.innerHTML = `
        <div class="glyn-folder-row" data-glyn-folder-id="${id}"
             style="padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <div class="glyn-folder-main" style="display:flex; align-items:center; gap:6px;">
            <span data-glyn-folder-chevron></span>
            <span data-glyn-folder-icon class="glyn-folder-icon"></span>
            <span data-glyn-folder-label></span>
          </div>
          <div class="trailing highlight text-token-text-tertiary">
            <button type="button" aria-label="Open folder options"
              class="__menu-item-trailing-btn glyn-folder-menu-btn"
              data-glyn-folder-menu-btn="true">
              <div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true">
                  <path d="M15.498 8.50159C16.3254 8.50159 16.9959 9.17228 16.9961 9.99963C16.9961 10.8271 16.3256 11.4987 15.498 11.4987C14.6705 11.4987 14 10.8271 14 9.99963C14.0002 9.17228 14.6706 8.50159 15.498 8.50159Z"></path>
                  <path d="M4.49805 8.50159C5.32544 8.50159 5.99689 9.17228 5.99707 9.99963C5.99707 10.8271 5.32555 11.4987 4.49805 11.4987C3.67069 11.4985 3 10.827 3 9.99963C3.00018 9.17239 3.6708 8.50176 4.49805 8.50159Z"></path>
                  <path d="M10.0003 8.50159C10.8276 8.50176 11.4982 9.17239 11.4984 9.99963C11.4984 10.827 10.8277 11.4985 10.0003 11.4987C9.17283 11.4987 8.50131 10.8271 8.50131 9.99963C8.50149 9.17228 9.17294 8.50159 10.0003 8.50159Z"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
        <div data-glyn-folder-contents="${id}" style="margin-left: 24px;"></div>
      `;

      const insertBeforeWrapperEl = opts.insertBeforeEl;
      const preferTop = Object.prototype.hasOwnProperty.call(opts, "insertAtTop")
        ? !!opts.insertAtTop
        : true;
      const beforeNode = insertBeforeWrapperEl && insertBeforeWrapperEl.parentNode === container
        ? insertBeforeWrapperEl
        : null;
      if (beforeNode) {
        container.insertBefore(wrapper, beforeNode);
      } else if (preferTop && container.firstChild) {
        container.insertBefore(wrapper, container.firstChild);
      } else {
        container.appendChild(wrapper);
      }

      const rowEl = wrapper.querySelector(".glyn-folder-row");
      const contentsEl = wrapper.querySelector(`[data-glyn-folder-contents="${id}"]`);
      const mainEl = wrapper.querySelector(".glyn-folder-main");
      const labelEl = wrapper.querySelector("[data-glyn-folder-label]");
      const chevronEl = wrapper.querySelector("[data-glyn-folder-chevron]");
      const iconEl = wrapper.querySelector("[data-glyn-folder-icon]");
      const menuBtnEl = wrapper.querySelector("[data-glyn-folder-menu-btn='true']");

      const data = {
        id,
        name: folderName,
        color: (opts.data && opts.data.color) || opts.color || null
      };
      const folder = new FolderItem(rowEl, id, {
        wrapperEl: wrapper,
        contentsEl,
        labelEl,
        chevronEl,
        menuBtnEl,
        iconEl,
        data,
        onMetadataChange: (reason) => this.triggerChange(reason || "folder-metadata"),
        onChildrenChange: (reason) => this.triggerChange(reason || "folder-children")
      });

      if (rowEl) {
        rowEl.__glynFolderItem = folder;
      }
      if (wrapper) {
        wrapper.__glynFolderItem = folder;
      }
      if (folder.contentsEl) {
        folder.contentsEl.__glynFolderItem = folder;
      }

      folder.setParentFolder(parentFolder);

      folder.enableDrag();
      folder.isExpanded = typeof opts.expanded === "boolean" ? opts.expanded : true;
      folder.data.expanded = folder.isExpanded;
      if (folder.contentsEl) {
        folder.contentsEl.style.display = folder.isExpanded ? "" : "none";
      }
      folder.refreshChevron();
      folder.refreshIcon();
      if (data.color) {
        folder.setColor(data.color);
      }

      if (mainEl) {
        mainEl.addEventListener("click", () => {
          if (folder.isRenaming) return;
          folder.toggleExpanded();
        });
      }

      if (menuBtnEl && this.folderMenu) {
        menuBtnEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.folderMenu.open(menuBtnEl, folder);
        });
      }

      this.folders.push({
        id,
        wrapperEl: wrapper,
        folderItem: folder,
        contentsEl,
        parentId: parentFolder ? parentFolder.id : null
      });

      this.triggerChange("create-folder");
      return folder;
    }

    getRecordByFolderItem(folderItem) {
      return this.folders.find(r => r.folderItem === folderItem) || null;
    }

    getRecordById(id) {
      return this.folders.find(r => r.id === id) || null;
    }

    getRecordByContentsEl(el) {
      return this.folders.find(r => r.contentsEl === el) || null;
    }

    moveFolderBefore(sourceFolder, targetFolder) {
      if (!sourceFolder || !targetFolder) return;
      const fromRec = this.getRecordByFolderItem(sourceFolder);
      const toRec = this.getRecordByFolderItem(targetFolder);
      if (!fromRec || !toRec || fromRec === toRec) return;
      const container = this._getContainerForNode(toRec.wrapperEl);
      this.moveFolderToContainer(sourceFolder, container, toRec.wrapperEl);
    }

    moveFolderBeforeElement(folderItem, targetEl) {
      if (!folderItem || !targetEl) return;
      const topEl = targetEl.closest(".glyn-folder-wrapper, a.__menu-item");
      const container = this._getContainerForNode(topEl || targetEl);
      this.moveFolderToContainer(folderItem, container, topEl || targetEl);
    }

    moveFolderToContainer(folderItem, containerEl, beforeNode) {
      const rec = this.getRecordByFolderItem(folderItem);
      if (!rec || !rec.wrapperEl) return;
      const container = containerEl || this.historyDiv;
      if (!container) return;
      const before = beforeNode && beforeNode.parentNode === container ? beforeNode : null;
      container.insertBefore(rec.wrapperEl, before || null);
      const parentFolder = this._getParentFolderForContainer(container);
      rec.parentId = parentFolder ? parentFolder.id : null;
      folderItem.setParentFolder(parentFolder);
      this.triggerChange("move-folder");
    }

    moveFolderIntoFolder(folderItem, destinationFolder, options) {
      if (!folderItem || !destinationFolder || !destinationFolder.contentsEl) return;
      const beforeNode = options && options.beforeNode ? options.beforeNode : null;
      this.moveFolderToContainer(folderItem, destinationFolder.contentsEl, beforeNode || null);
      destinationFolder.setExpanded(true);
    }

    async deleteFolder(folderItem, options) {
      if (!folderItem) return;
      const opts = options || {};
      if (!opts.skipConfirm) {
        const confirmed = await this._confirmFolderDeletion(folderItem);
        if (!confirmed) {
          return;
        }
      }
      this._removeFolderInternal(folderItem);
    }

    _removeFolderInternal(folderItem) {
      const rec = this.getRecordByFolderItem(folderItem);
      if (!rec) return;
      folderItem.deleteToRoot(this.historyDiv);
      this._removeRecordsForWrapper(rec.wrapperEl);
      if (this.historyManager) {
        this.historyManager.resetFromLinks(this.getRootChatLinks());
      }
      this.triggerChange("delete-folder");
    }

    _removeRecordsForWrapper(wrapperEl) {
      if (!wrapperEl) return;
      this.folders = this.folders.filter((record) => {
        if (!record || !record.wrapperEl) return false;
        return !wrapperEl.contains(record.wrapperEl) && record.wrapperEl !== wrapperEl;
      });
    }

    moveChatIntoFolder(folderItem, chatHref) {
      if (!folderItem || !chatHref) return;
      const link = this._findChatLink(chatHref);
      if (!link) return;
      const chatItem = link.__glynChatItem;
      if (!chatItem) return;
      if (this.historyManager && typeof this.historyManager.removeChat === "function") {
        this.historyManager.removeChat(chatHref);
      }
      folderItem.addChild(chatItem);
      if (folderItem.contentsEl) {
        folderItem.contentsEl.appendChild(link);
      }
      if (typeof folderItem.syncChildrenFromDOM === "function") {
        folderItem.syncChildrenFromDOM();
      }
    }

    _findChatLink(chatHref) {
      if (!this.historyDiv || !chatHref) return null;
      const links = Array.from(this.historyDiv.querySelectorAll("a.__menu-item"));
      return links.find(link => (link.getAttribute("href") || "") === chatHref) || null;
    }

    clearAllFolders() {
      if (!this.historyDiv || !this.folders.length) return;
      const wrappers = Array.from(this.historyDiv.querySelectorAll(".glyn-folder-wrapper"));
      wrappers.forEach((wrapper) => {
        const folder = wrapper.__glynFolderItem;
        if (folder) {
          folder.deleteToRoot(this.historyDiv);
        } else {
          const chats = Array.from(wrapper.querySelectorAll("a.__menu-item"));
          chats.forEach(link => this.historyDiv.appendChild(link));
          wrapper.remove();
        }
      });
      this.folders = [];
    }

    getRootChatLinks() {
      return Array.from(this.historyDiv.children).filter(el =>
        el.matches("a.__menu-item")
      );
    }

    refreshAllFolderIcons() {
      this.folders.forEach((rec) => {
        if (rec && rec.folderItem && typeof rec.folderItem.refreshIcon === "function") {
          rec.folderItem.refreshIcon();
        }
      });
    }

    setAllFoldersExpanded(expanded) {
      if (!this.folders || !this.folders.length) return false;
      const flag = !!expanded;
      let changed = false;
      this.suspendNotifications();
      this.folders.forEach((rec) => {
        if (!rec || !rec.folderItem || typeof rec.folderItem.setExpanded !== "function") return;
        const folder = rec.folderItem;
        if (flag && !folder.isExpanded) {
          folder.setExpanded(true);
          changed = true;
        } else if (!flag && folder.isExpanded) {
          folder.setExpanded(false);
          changed = true;
        }
      });
      this.resumeNotifications();
      if (changed) {
        this.triggerChange(flag ? "expand-all" : "collapse-all");
      }
      return changed;
    }

    _getContainerForNode(node) {
      if (!node) return this.historyDiv;
      if (node === this.historyDiv) return node;
      if (node.classList && node.classList.contains("glyn-folder-wrapper")) {
        return node.parentNode || this.historyDiv;
      }
      if (node.classList && node.classList.contains("glyn-folder-row")) {
        const wrapper = node.closest(".glyn-folder-wrapper");
        return wrapper && wrapper.parentNode ? wrapper.parentNode : this.historyDiv;
      }
      return node.parentNode || this.historyDiv;
    }

    _getParentFolderForContainer(container) {
      if (!container || container === this.historyDiv) return null;
      const rec = this.getRecordByContentsEl(container);
      return rec ? rec.folderItem : null;
    }

    _confirmFolderDeletion(folderItem) {
      return new Promise((resolve) => {
        this._ensureConfirmDialog();
        this._confirmResolve = resolve;
        if (this._confirmBackdrop) {
          this._confirmBackdrop.style.display = "flex";
          this._confirmBackdrop.setAttribute("aria-hidden", "false");
        }
        if (this._confirmDialog) {
          const name = folderItem && folderItem.data && folderItem.data.name
            ? folderItem.data.name
            : "this folder";
          const nameEl = this._confirmDialog.querySelector("[data-glyn-folder-confirm-name]");
          if (nameEl) {
            nameEl.textContent = name;
          }
        }
        if (this._confirmDeleteBtn) {
          setTimeout(() => this._confirmDeleteBtn.focus(), 0);
        }
      });
    }

    _ensureConfirmDialog() {
      if (this._confirmBackdrop) return;
      const backdrop = document.createElement("div");
      backdrop.className = "glyn-folder-confirm-backdrop";
      backdrop.style.display = "none";

      const dialog = document.createElement("div");
      dialog.className = "glyn-folder-confirm-dialog";
      dialog.innerHTML = `
        <h2>Delete folder?</h2>
        <p class="glyn-folder-confirm-body">
          <strong>This will permanently delete this folder and all child folders.</strong>
          Any chats within this folder will return to the root. If you want to delete chats, you will need to delete them individually.
        </p>
        <p class="glyn-folder-confirm-name">Folder: <span data-glyn-folder-confirm-name></span></p>
        <div class="glyn-folder-confirm-actions">
          <button type="button" data-role="cancel">Cancel</button>
          <button type="button" data-role="delete">Delete</button>
        </div>
      `;

      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const cancelBtn = dialog.querySelector("button[data-role='cancel']");
      const deleteBtn = dialog.querySelector("button[data-role='delete']");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => this._closeConfirmDialog(false));
      }
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => this._closeConfirmDialog(true));
      }
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          this._closeConfirmDialog(false);
        }
      });

      this._confirmKeyHandler = (e) => {
        if (e.key === "Escape" && this._confirmBackdrop && this._confirmBackdrop.style.display !== "none") {
          e.preventDefault();
          this._closeConfirmDialog(false);
        }
      };
      document.addEventListener("keydown", this._confirmKeyHandler);

      this._confirmBackdrop = backdrop;
      this._confirmDialog = dialog;
      this._confirmCancelBtn = cancelBtn;
      this._confirmDeleteBtn = deleteBtn;
    }

    _closeConfirmDialog(result) {
      if (this._confirmBackdrop) {
        this._confirmBackdrop.style.display = "none";
        this._confirmBackdrop.setAttribute("aria-hidden", "true");
      }
      const resolver = this._confirmResolve;
      this._confirmResolve = null;
      if (typeof resolver === "function") {
        resolver(!!result);
      }
    }
  }

  ns.FolderManager = FolderManager;
})();
