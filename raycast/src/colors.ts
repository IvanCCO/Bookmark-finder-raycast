import { Color } from "@raycast/api";

const PALETTE = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Magenta, Color.Red, Color.Yellow];

/** Mesma categoria, sempre a mesma cor. */
export function categoryColor(name: string): Color {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
