(function () {
    const ns = (window.GlynGPT = window.GlynGPT || {});

    class HistoryManager {
        constructor() {
            this.chatOrder = []; // hrefs of root-level chats
            this.onChange = null;
            this._suspendCount = 0;
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
                this.onChange(reason || "history-change");
            }
        }

        ensureChatOrderFromLinks(links) {
            const hrefs = Array.from(links)
                .map(link => link.getAttribute("href") || "")
                .filter(Boolean);

            let changed = false;

            if (!this.chatOrder.length) {
                this.chatOrder = hrefs.slice();
                if (this.chatOrder.length) {
                    this.triggerChange("ensure");
                }
                return;
            }

            hrefs.forEach(href => {
                if (!this.chatOrder.includes(href)) {
                    this.chatOrder.push(href);
                    changed = true;
                }
            });

            const filtered = this.chatOrder.filter(href => hrefs.includes(href));
            if (filtered.length !== this.chatOrder.length) {
                changed = true;
            }
            this.chatOrder = filtered;

            if (changed) {
                this.triggerChange("ensure");
            }
        }

        moveChat(fromHref, toHref) {
            const arr = this.chatOrder;
            const fromIndex = arr.indexOf(fromHref);
            const toIndex = arr.indexOf(toHref);
            if (fromIndex === -1 || toIndex === -1 || fromHref === toHref) return;

            const [item] = arr.splice(fromIndex, 1);
            const newIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
            arr.splice(newIndex, 0, item);
            this.triggerChange("move");
        }

        removeChat(href) {
            const idx = this.chatOrder.indexOf(href);
            if (idx !== -1) {
                this.chatOrder.splice(idx, 1);
                this.triggerChange("remove");
            }
        }

        setOrder(hrefs) {
            const arr = Array.isArray(hrefs)
                ? hrefs.filter(href => typeof href === "string" && href.length)
                : [];
            let changed = arr.length !== this.chatOrder.length;
            if (!changed) {
                for (let i = 0; i < arr.length; i += 1) {
                    if (arr[i] !== this.chatOrder[i]) {
                        changed = true;
                        break;
                    }
                }
            }
            this.chatOrder = arr;
            if (changed) {
                this.triggerChange("set-order");
            }
        }

        resetFromLinks(links) {
            this.chatOrder = [];
            this.ensureChatOrderFromLinks(links);
        }

        applyChatOrderToDOM(historyDiv, links) {
            if (!historyDiv) return;
            const map = new Map();
            links.forEach(link => {
                const href = link.getAttribute("href") || "";
                if (href) map.set(href, link);
            });

            this.chatOrder.forEach(href => {
                const link = map.get(href);
                if (link) historyDiv.appendChild(link);
            });
        }
    }

    ns.HistoryManager = HistoryManager;
})();
