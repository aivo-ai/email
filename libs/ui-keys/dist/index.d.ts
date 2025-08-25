export declare const KeyCodes: {
    readonly ENTER: 13;
    readonly ESCAPE: 27;
    readonly SPACE: 32;
    readonly ARROW_LEFT: 37;
    readonly ARROW_UP: 38;
    readonly ARROW_RIGHT: 39;
    readonly ARROW_DOWN: 40;
    readonly DELETE: 46;
    readonly BACKSPACE: 8;
    readonly TAB: 9;
};
export declare const ModifierKeys: {
    readonly CTRL: "ctrlKey";
    readonly SHIFT: "shiftKey";
    readonly ALT: "altKey";
    readonly META: "metaKey";
};
export interface KeyboardShortcut {
    key: string;
    modifiers?: string[];
    action: () => void;
    description?: string;
}
export declare class KeyboardManager {
    private shortcuts;
    register(shortcut: KeyboardShortcut): void;
    unregister(key: string, modifiers?: string[]): void;
    handleKeyDown: (event: KeyboardEvent) => void;
    private getShortcutKey;
}
//# sourceMappingURL=index.d.ts.map