export const KeyCodes = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32,
    ARROW_LEFT: 37,
    ARROW_UP: 38,
    ARROW_RIGHT: 39,
    ARROW_DOWN: 40,
    DELETE: 46,
    BACKSPACE: 8,
    TAB: 9
};
export const ModifierKeys = {
    CTRL: 'ctrlKey',
    SHIFT: 'shiftKey',
    ALT: 'altKey',
    META: 'metaKey'
};
export class KeyboardManager {
    constructor() {
        this.shortcuts = new Map();
        this.handleKeyDown = (event) => {
            const modifiers = [];
            if (event.ctrlKey)
                modifiers.push(ModifierKeys.CTRL);
            if (event.shiftKey)
                modifiers.push(ModifierKeys.SHIFT);
            if (event.altKey)
                modifiers.push(ModifierKeys.ALT);
            if (event.metaKey)
                modifiers.push(ModifierKeys.META);
            const shortcutKey = this.getShortcutKey({
                key: event.key.toLowerCase(),
                modifiers
            });
            const shortcut = this.shortcuts.get(shortcutKey);
            if (shortcut) {
                event.preventDefault();
                shortcut.action();
            }
        };
    }
    register(shortcut) {
        const key = this.getShortcutKey(shortcut);
        this.shortcuts.set(key, shortcut);
    }
    unregister(key, modifiers) {
        const shortcutKey = this.getShortcutKey({ key, modifiers });
        this.shortcuts.delete(shortcutKey);
    }
    getShortcutKey(shortcut) {
        const modifiers = shortcut.modifiers ? shortcut.modifiers.sort().join('+') : '';
        return modifiers ? `${modifiers}+${shortcut.key.toLowerCase()}` : shortcut.key.toLowerCase();
    }
}
//# sourceMappingURL=index.js.map