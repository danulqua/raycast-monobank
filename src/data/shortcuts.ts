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
  refresh: Keyboard.Shortcut.Common.Refresh,
  convert: Keyboard.Shortcut.Common.Open,
  copyRate: Keyboard.Shortcut.Common.Copy,
  // No common equivalents for these.
  copyBalance: cmdShift("b"),
  copyTotal: cmdShift("t"),
  copyGoal: cmdShift("g"),
  toggleDetails: cmdShift("d"),
  copyAmount: cmdShift("a"),
  changePeriod: cmdShift("p"),
  viewStatement: cmdShift("s"),
  exportCsv: cmdShift("e"),
} satisfies Record<string, Keyboard.Shortcut>;
