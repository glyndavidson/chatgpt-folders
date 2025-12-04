(function () {
  const ns = (window.GlynGPT = window.GlynGPT || {});

  class DragController {
    constructor(historyDiv, historyManager, folderManager, forceFoldersTop) {
      this.historyDiv = historyDiv;
      this.historyManager = historyManager;
      this.folderManager = folderManager;
      this.forceFoldersTop = !!forceFoldersTop;
      this.debugPrefix = "[GlynGPT][DragController]";
    }

    setForceFoldersTop(flag) {
      this.forceFoldersTop = !!flag;
    }

    // Find the folder record whose contentsEl currently contains the given chat element
    findFolderRecordForChatEl(chatEl) {
      if (!chatEl || !this.folderManager || !Array.isArray(this.folderManager.folders)) {
        return null;
      }
      return this.folderManager.folders.find(rec =>
        rec &&
        rec.contentsEl &&
        rec.contentsEl.contains(chatEl)
      ) || null;
    }

    // Move a chat (ChatItem) into a folder (FolderItem), from root or from another folder
    moveChatToFolder(folderItem, chatItem, beforeChatItem) {
      if (!folderItem || !chatItem) return;

      const href = chatItem.id;
      console.log(this.debugPrefix, "moveChatToFolder", {
        href,
        folder: folderItem.data && folderItem.data.name,
        before: beforeChatItem ? beforeChatItem.id : null
      });

      // If the chat is currently in the root history, remove it from the root order
      if (this.historyDiv && this.historyDiv.contains(chatItem.el)) {
        if (this.historyManager && typeof this.historyManager.removeChat === "function") {
          this.historyManager.removeChat(href);
        }
      } else {
        // Otherwise it must be inside some folder – remove from that folder's children
        const fromRec = this.findFolderRecordForChatEl(chatItem.el);
        if (fromRec && fromRec.folderItem && Array.isArray(fromRec.folderItem.children)) {
          const arr = fromRec.folderItem.children;
          const idx = arr.findIndex(c => c === chatItem || c.id === href);
          if (idx !== -1) arr.splice(idx, 1);
        }
      }

      // Finally, add to the destination folder
      folderItem.addChild(chatItem);
      if (beforeChatItem && typeof folderItem.moveChildBefore === "function") {
        folderItem.moveChildBefore(chatItem.id, beforeChatItem.id);
      }

      if (folderItem.contentsEl) {
        if (beforeChatItem &&
            beforeChatItem.el &&
            folderItem.contentsEl.contains(beforeChatItem.el)) {
          folderItem.contentsEl.insertBefore(chatItem.el, beforeChatItem.el);
        } else {
          folderItem.contentsEl.appendChild(chatItem.el);
        }
      }

      if (typeof folderItem.applyChildOrderToDOM === "function") {
        folderItem.applyChildOrderToDOM();
      }
      if (typeof folderItem.syncChildrenFromDOM === "function") {
        folderItem.syncChildrenFromDOM();
      }
    }

    // Move a chat (ChatItem) out of a folder back to the root list,
    // inserting it before the given target ChatItem (or at the end if target is null)
    moveChatFromFolderToRoot(chatItem, targetChatItem, beforeNode) {
      if (!chatItem || !this.historyDiv) return;

      const href = chatItem.id;
      console.log(this.debugPrefix, "moveChatFromFolderToRoot", {
        href,
        target: targetChatItem ? targetChatItem.id : null,
        beforeNodeTag: beforeNode ? beforeNode.tagName : null
      });

      // Remove from whatever folder currently owns it
      const fromRec = this.findFolderRecordForChatEl(chatItem.el);
      if (fromRec && fromRec.folderItem && Array.isArray(fromRec.folderItem.children)) {
        const arr = fromRec.folderItem.children;
        const idx = arr.findIndex(c => c === chatItem || c.id === href);
        if (idx !== -1) arr.splice(idx, 1);
        if (typeof fromRec.folderItem.syncChildrenFromDOM === "function") {
          fromRec.folderItem.syncChildrenFromDOM();
        }
      }

      // Insert into DOM in the root history
      if (targetChatItem && targetChatItem.el && this.historyDiv.contains(targetChatItem.el)) {
        this.historyDiv.insertBefore(chatItem.el, targetChatItem.el);
      } else if (beforeNode && beforeNode.parentNode === this.historyDiv) {
        this.historyDiv.insertBefore(chatItem.el, beforeNode);
      } else {
        this.historyDiv.appendChild(chatItem.el);
      }

      this.syncRootOrderFromDOM();
    }

    handleDrop(source, target, containerEl) {
      if (!source) return;

      const resolvedContainer = this._resolveContainer(containerEl);
      const isRootContainer = resolvedContainer === this.historyDiv;
      console.log(this.debugPrefix, "handleDrop", {
        sourceType: source.type,
        sourceId: source.id,
        targetType: target ? target.type : null,
        targetId: target ? target.id : null,
        isRootContainer,
        containerElTag: containerEl ? containerEl.tagName : null
      });

      // --- FOLDER SOURCE (reordering only) ---
      if (source.type === "folder") {
        this._handleFolderDrop(source, target, containerEl, resolvedContainer);
        return;
      }

      // --- CHAT SOURCE ---
      if (source.type !== "chat") return;

      if (target && target.type === "before-element") {
        if (isRootContainer) {
          this.moveChatFromFolderToRoot(source, null, target.element || null);
        } else if (containerEl) {
          const folderRec = this.folderManager.getRecordByContentsEl
            ? this.folderManager.getRecordByContentsEl(containerEl)
            : null;
          const folder = folderRec && folderRec.folderItem;
          if (folder) {
            const dropChat = target.element && target.element.__glynChatItem
              ? target.element.__glynChatItem
              : null;
            if (dropChat) {
              this.moveChatToFolder(folder, source, dropChat);
            } else if (target.element && containerEl.contains(target.element)) {
              this.moveChatToFolder(folder, source, null);
              containerEl.insertBefore(source.el, target.element);
              if (typeof folder.syncChildrenFromDOM === "function") {
                folder.syncChildrenFromDOM();
              }
            }
          }
        }
        return;
      }

      // 1) Dropping inside a folder's contents area
      if (!isRootContainer && containerEl) {
        const folderRec = this.folderManager.getRecordByContentsEl
          ? this.folderManager.getRecordByContentsEl(containerEl)
          : null;
        const destFolder = folderRec && folderRec.folderItem;

        if (destFolder) {
          const dropTargetChat =
            target && target.type === "chat" ? target : null;
          const alreadyInDest =
            destFolder.contentsEl &&
            destFolder.contentsEl.contains(source.el);

          if (alreadyInDest && target && target.type === "chat") {
            // Reorder within the same folder
            if (typeof destFolder.moveChildBefore === "function" &&
                typeof destFolder.applyChildOrderToDOM === "function") {
              destFolder.moveChildBefore(source.id, target.id);
              destFolder.applyChildOrderToDOM();
            }
          } else if (!alreadyInDest) {
            // Move into this folder (from root or from another folder)
            this.moveChatToFolder(destFolder, source, dropTargetChat);
          }
          return;
        }
      }

      // From here on, we rely on having a target for relative positioning
      if (!target) {
        // Special case: dropping a chat from a folder into an "empty" root area
        const inFolderRecord = this.findFolderRecordForChatEl(source.el);
        console.log(this.debugPrefix, "handleDrop:noTarget", {
          sourceType: source.type,
          isRootContainer,
          inFolderRecord: !!inFolderRecord
        });
        if (isRootContainer && inFolderRecord) {
          this.moveChatFromFolderToRoot(source, null, null);
        }
        return;
      }

      // 2) Chat → chat
      if (target.type === "chat") {
        // Root-level behaviour
        if (isRootContainer && this.historyDiv && this.historyDiv.contains(target.el)) {
          const sourceFolderRec = this.findFolderRecordForChatEl(source.el);
          const sourceInRoot = !sourceFolderRec;

          if (sourceInRoot) {
            if (source.el && target.el && this.historyDiv.contains(source.el) &&
                this.historyDiv.contains(target.el)) {
              this.historyDiv.insertBefore(source.el, target.el);
              this.syncRootOrderFromDOM();
            }
          } else {
            // Move from a folder back to root, before the target chat
            this.moveChatFromFolderToRoot(source, target);
          }
          return;
        }

        // Inside a folder: we should already have handled this in the containerEl branch above,
        // but keep a safety path in case containerEl wasn't what we expected.
        if (!isRootContainer && containerEl) {
          const folderRec = this.folderManager.getRecordByContentsEl
            ? this.folderManager.getRecordByContentsEl(containerEl)
            : null;
          const folder = folderRec && folderRec.folderItem;
          if (folder &&
              folder.contentsEl &&
              folder.contentsEl.contains(source.el) &&
              typeof folder.moveChildBefore === "function" &&
              typeof folder.applyChildOrderToDOM === "function") {
            folder.moveChildBefore(source.id, target.id);
            folder.applyChildOrderToDOM();
            return;
          }
        }
      }

      // 3) Chat → folder row (drop on the folder header itself)
      if (target.type === "folder") {
        this.moveChatToFolder(target, source, null);
      }
    }

    syncRootOrderFromDOM() {
      if (!this.historyManager ||
          !this.folderManager ||
          typeof this.folderManager.getRootChatLinks !== "function") {
        return;
      }
      const links = this.folderManager.getRootChatLinks();
      const hrefs = links
        .map(link => link.getAttribute("href") || "")
        .filter(Boolean);
      if (typeof this.historyManager.setOrder === "function") {
        this.historyManager.setOrder(hrefs);
      } else {
        this.historyManager.chatOrder = hrefs;
      }
    }

    _handleFolderDrop(sourceFolder, target, containerEl, resolvedContainer) {
      if (!this.folderManager || !sourceFolder) return;

      if (target && target.type === "before-element") {
        const destFolder = this._getFolderForContainer(resolvedContainer);
        if (this._isInvalidFolderMove(sourceFolder, destFolder)) return;
        this.folderManager.moveFolderToContainer(
          sourceFolder,
          resolvedContainer,
          target.element || null
        );
        return;
      }

      if (!target) {
        if (resolvedContainer === this.historyDiv) {
          this.folderManager.moveFolderToContainer(sourceFolder, resolvedContainer, null);
        } else {
          const destFolder = this._getFolderForContainer(resolvedContainer);
          if (destFolder && !this._isInvalidFolderMove(sourceFolder, destFolder)) {
            this.folderManager.moveFolderIntoFolder(sourceFolder, destFolder, {});
          }
        }
        return;
      }

      if (target.type === "folder") {
        if (containerEl &&
            containerEl.classList &&
            containerEl.classList.contains("glyn-folder-wrapper")) {
          if (this._isInvalidFolderMove(sourceFolder, target)) return;
          this.folderManager.moveFolderIntoFolder(sourceFolder, target, {});
          return;
        }

        const destFolder = this._getFolderForContainer(resolvedContainer);
        if (this._isInvalidFolderMove(sourceFolder, destFolder)) return;
        const beforeNode = target.wrapperEl ||
          (target.el ? target.el.closest(".glyn-folder-wrapper") : null) ||
          null;
        this.folderManager.moveFolderToContainer(
          sourceFolder,
          resolvedContainer,
          beforeNode
        );
        return;
      }

      if (target.type === "chat") {
        const destFolder = this._getFolderForContainer(resolvedContainer);
        if (this._isInvalidFolderMove(sourceFolder, destFolder)) return;
        this.folderManager.moveFolderToContainer(
          sourceFolder,
          resolvedContainer,
          target.el || null
        );
      }
    }

    _resolveContainer(containerEl) {
      if (!containerEl) return this.historyDiv;
      if (containerEl === this.historyDiv) return containerEl;
      if (containerEl.classList && containerEl.classList.contains("glyn-folder-wrapper")) {
        return containerEl.parentNode || this.historyDiv;
      }
      return containerEl;
    }

    _getFolderForContainer(containerEl) {
      if (!containerEl || containerEl === this.historyDiv) return null;
      if (typeof this.folderManager.getRecordByContentsEl === "function") {
        const rec = this.folderManager.getRecordByContentsEl(containerEl);
        return rec && rec.folderItem ? rec.folderItem : null;
      }
      return null;
    }

    _isInvalidFolderMove(sourceFolder, destinationFolder) {
      if (!sourceFolder || !destinationFolder) return false;
      if (sourceFolder === destinationFolder) return true;
      let current = destinationFolder.getParentFolder
        ? destinationFolder.getParentFolder()
        : null;
      while (current) {
        if (current === sourceFolder) return true;
        current = current.getParentFolder ? current.getParentFolder() : null;
      }
      return false;
    }
  }

  ns.DragController = DragController;
})();
