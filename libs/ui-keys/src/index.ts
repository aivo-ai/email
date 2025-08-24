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
} as const

export const ModifierKeys = {
  CTRL: 'ctrlKey',
  SHIFT: 'shiftKey',
  ALT: 'altKey',
  META: 'metaKey'
} as const

export interface KeyboardShortcut {
  key: string
  modifiers?: string[]
  action: () => void
  description?: string
}

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()

  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut)
    this.shortcuts.set(key, shortcut)
  }

  unregister(key: string, modifiers?: string[]): void {
    const shortcutKey = this.getShortcutKey({ key, modifiers } as KeyboardShortcut)
    this.shortcuts.delete(shortcutKey)
  }

  handleKeyDown = (event: KeyboardEvent): void => {
    const modifiers = []
    if (event.ctrlKey) modifiers.push(ModifierKeys.CTRL)
    if (event.shiftKey) modifiers.push(ModifierKeys.SHIFT)
    if (event.altKey) modifiers.push(ModifierKeys.ALT)
    if (event.metaKey) modifiers.push(ModifierKeys.META)

    const shortcutKey = this.getShortcutKey({
      key: event.key.toLowerCase(),
      modifiers
    } as KeyboardShortcut)

    const shortcut = this.shortcuts.get(shortcutKey)
    if (shortcut) {
      event.preventDefault()
      shortcut.action()
    }
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers ? shortcut.modifiers.sort().join('+') : ''
    return modifiers ? `${modifiers}+${shortcut.key.toLowerCase()}` : shortcut.key.toLowerCase()
  }
}
