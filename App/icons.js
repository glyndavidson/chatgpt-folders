(function () {
    const ns = (window.GlynGPT = window.GlynGPT || {});

    const chevronRight =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">' +
        '<polyline points="3,2 7,5 3,8" fill="none" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round" />' +
        '</svg>';

    const chevronDown =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">' +
        '<polyline points="2,3 5,7 8,3" fill="none" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round" />' +
        '</svg>';

    // Context-menu icons
    const folderNew =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
        '<path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '</svg>';

    const folderRename =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
        '<path d="M3 11.5 11.5 3 13 4.5 4.5 13 3 13z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M9.5 4.5 11.5 6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
        '</svg>';

    const folderColor =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
        'xmlns="http://www.w3.org/2000/svg">' +
        // Simple colour-palette-ish icon using currentColor
        '<path d="M12 3a8 8 0 0 0-8 8 7 7 0 0 0 7 7h1a3 3 0 0 0 3-3 2 2 0 0 0-2-2h-2" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="9" cy="10" r="1" fill="currentColor"/>' +
        '<circle cx="13" cy="8" r="1" fill="currentColor"/>' +
        '<circle cx="15" cy="12" r="1" fill="currentColor"/>' +
        '</svg>';

    const folderDelete =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
        '<path d="M4 5.5h8l-.6 7.5H4.6L4 5.5z" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
        '<path d="M3 5.5h10M6.5 3h3L10 3.8h-4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '</svg>';

    // --- Folder icons for the sidebar ---

    // Full-colour folder (uses currentColor so we can tint it later if we want)
    const folderFullColor =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>' +
        '</svg>';

    // Outline folder – matches ChatGPT’s minimal sidebar style
    const folderOutline =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
        'xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
        '</svg>';

    ns.Icons = {
        chevronRight,
        chevronDown,
        folderNew,
        folderRename,
        folderColor,
        folderDelete,
        folderFullColor,
        folderOutline
    };
})();