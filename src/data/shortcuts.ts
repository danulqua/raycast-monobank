import { Keyboard } from "@raycast/api";

function cmdShift(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", "shift"], key },
    Windows: { modifiers: ["ctrl", "shift"], key },
  };
}

export const shortcuts = {
  pin: Keyboard.Shortcut.Common.Pin,
  moveUp: Keyboard.Shortcut.Common.MoveUp,
  moveDown: Keyboard.Shortcut.Common.MoveDown,
  edit: Keyboard.Shortcut.Common.Edit,
  copyIban: Keyboard.Shortcut.Common.Copy,
  // No common equivalents for these.
  copyBalance: cmdShift("b"),
  copyTotal: cmdShift("t"),
  copyGoal: cmdShift("g"),
  toggleDetails: cmdShift("d"),
} satisfies Record<string, Keyboard.Shortcut>;
