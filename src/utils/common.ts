export function satisfiesTexts(searchText: string, ...texts: string[]): boolean {
  return texts.some((text) => text.toLowerCase().includes(searchText.toLowerCase()));
}

/** In the "all" category pinned items are shown in their own section, so they are removed from the rest. */
export function filterOutPinnedItems<T extends { id: string }>(props: {
  category: string;
  items: T[];
  pinned: string[];
}): T[] {
  const { category, items, pinned } = props;
  return category === "all" ? items.filter((item) => !pinned.includes(item.id)) : items;
}
