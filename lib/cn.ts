import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom type scale, so `text-small` is treated as a
// font size and never collapses with a text color like `text-ink-2`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["label", "small", "body", "lead", "title", "page"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
