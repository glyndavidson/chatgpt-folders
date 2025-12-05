(function () {
  // @meta FolderMenu renders the contextual actions menu for folders, including colour picker logic.
  const ns = (window.GlynGPT = window.GlynGPT || {});
  const Icons = ns.Icons || {};

  class FolderMenu {
    constructor() {
      this.el = null;
      this.currentFolder = null;
      this.anchorEl = null;

      this.onNew = null;
      this.onRename = null;
      this.onChangeColor = null;
      this.onDelete = null;

      this.colorRow = null;
      this.colorInput = null;

      this.outsideHandler = this.handleOutsideClick.bind(this);
      this.keyHandler = this.handleKeyDown.bind(this);

      this.ensureElement();
    }

    ensureElement() {
      if (this.el) return;

      const menu = document.createElement("div");
      menu.className = "glyn-folder-menu";
      menu.style.display = "none";

      // Basic actions
      menu.innerHTML = `
        <button type="button" data-action="new">
          <span class="glyn-folder-menu-icon">${Icons.folderNew || ""}</span>
          <span>New folder</span>
        </button>
        <button type="button" data-action="rename">
          <span class="glyn-folder-menu-icon">${Icons.folderRename || ""}</span>
          <span>Rename</span>
        </button>
        <button type="button" data-action="color">
          <span class="glyn-folder-menu-icon">${Icons.folderColor || ""}</span>
          <span>Change color</span>
        </button>
      `;

      menu.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        e.preventDefault();
        e.stopPropagation();
        this.handleAction(action);
      });

      // Inline colour picker row (between "Change color" and "Delete")
      const colorRow = document.createElement("div");
      colorRow.className = "glyn-folder-menu-color-row";

      const input = document.createElement("input");
      input.type = "color";
      input.className = "glyn-folder-menu-color-input";
      input.value = "#ffffff";

      colorRow.appendChild(input);
      colorRow.style.display = "none"; // hidden until Change color is clicked
      menu.appendChild(colorRow);

      // Separator + Delete at the bottom
      const hr = document.createElement("hr");
      menu.appendChild(hr);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.dataset.action = "delete";
      deleteBtn.innerHTML = `
        <span class="glyn-folder-menu-icon">${Icons.folderDelete || ""}</span>
        <span>Delete</span>
      `;
      menu.appendChild(deleteBtn);

      // When the user picks a colour, call callback then close menu
      const emitColor = () => {
        const folder = this.currentFolder;
        const color = input.value;
        if (folder && color && typeof this.onChangeColor === "function") {
          this.onChangeColor(folder, color);
        }
      };

      input.addEventListener("input", () => {
        emitColor();
      });

      input.addEventListener("change", () => {
        emitColor();
        this.hideColorPickerRow();
        this.close();
      });

      this.colorRow = colorRow;
      this.colorInput = input;

      document.body.appendChild(menu);
      this.el = menu;
    }

    open(anchorEl, folderItem) {
      this.ensureElement();
      this.currentFolder = folderItem;
      this.anchorEl = anchorEl;

      const rect = anchorEl.getBoundingClientRect();
      const margin = 8;
      let top = rect.bottom + 4;
      let left = Math.max(rect.left, margin);

      this.el.style.top = `${top}px`;
      this.el.style.left = `${left}px`;
      this.el.style.display = "block";

      // Prevent the menu from overflowing past the viewport edges.
      const menuRect = this.el.getBoundingClientRect();
      const maxBottom = window.innerHeight - margin;
      const maxRight = window.innerWidth - margin;

      if (menuRect.bottom > maxBottom) {
        top = Math.max(margin, rect.top - menuRect.height - 4);
        this.el.style.top = `${top}px`;
      }

      if (menuRect.right > maxRight) {
        left = Math.max(margin, maxRight - menuRect.width);
        this.el.style.left = `${left}px`;
      }

      this.hideColorPickerRow(); // reset each time

      document.addEventListener("mousedown", this.outsideHandler, true);
      document.addEventListener("keydown", this.keyHandler, true);
    }

    close() {
      if (!this.el) return;

      this.el.style.display = "none";

      document.removeEventListener("mousedown", this.outsideHandler, true);
      document.removeEventListener("keydown", this.keyHandler, true);

      if (this.anchorEl) {
        this.anchorEl.blur();
      }

      this.anchorEl = null;
      this.currentFolder = null;
      this.hideColorPickerRow();
    }

    hideColorPickerRow() {
      if (this.colorRow) {
        this.colorRow.style.display = "none";
      }
    }

    handleOutsideClick(e) {
      if (!this.el) return;
      if (this.el.contains(e.target)) return;
      if (this.anchorEl && this.anchorEl.contains(e.target)) return;
      this.close();
    }

    handleKeyDown(e) {
      if (e.key === "Escape") {
        this.close();
      }
    }

    openColorPickerForFolder(folder) {
      if (!folder || !this.colorRow || !this.colorInput) return;

      // Set initial value to folder's current colour if available
      if (
        folder.data &&
        folder.data.color &&
        /^#([0-9a-fA-F]{3}){1,2}$/.test(folder.data.color)
      ) {
        this.colorInput.value = folder.data.color;
      }

      this.colorRow.style.display = "flex";
      // Focus the input so it's visually obvious; user just clicks the swatch
      this.colorInput.focus();
    }

    handleAction(action) {
      const folder = this.currentFolder;
      if (!folder) {
        this.close();
        return;
      }

      if (action === "new" && typeof this.onNew === "function") {
        this.onNew(folder);
        this.close();
      } else if (action === "rename" && typeof this.onRename === "function") {
        this.onRename(folder);
        this.close();
      } else if (action === "color") {
        this.openColorPickerForFolder(folder);
        // Don't close the menu; user still needs to click the colour swatch
      } else if (action === "delete" && typeof this.onDelete === "function") {
        this.onDelete(folder);
        this.close();
      } else {
        this.close();
      }
    }
  }

  ns.FolderMenu = FolderMenu;
})();
