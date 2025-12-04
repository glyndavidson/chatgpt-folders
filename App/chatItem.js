(function () {
    // @meta ChatItem module wraps individual chat links as draggable elements within the sidebar.
    const ns = (window.GlynGPT = window.GlynGPT || {});
    const DraggableElement = ns.DraggableElement;

    class ChatItem extends DraggableElement {
        constructor(domElement, href, title) {
            super(domElement, href, "chat");
            this.href = href;
            this.title = title;
        }
    }

    ns.ChatItem = ChatItem;
})();
