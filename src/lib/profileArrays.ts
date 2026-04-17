import type { UserProfile } from "./types";

/** One bullet/skill per row when editing as plain text. */
export function linesToItems(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function itemsToLines(items: string[]): string {
  return items.join("\n");
}

/** Keeps order; drops empty entries. */
export function cleanItemList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function updateItemAt(items: string[], index: number, value: string): string[] {
  const next = [...items];
  next[index] = value;
  return next;
}

export function removeItemAt(items: string[], index: number): string[] {
  return items.filter((_, i) => i !== index);
}

export function insertItemAfter(items: string[], index: number, value = ""): string[] {
  const next = [...items];
  next.splice(index + 1, 0, value);
  return next;
}

/** Strips blank lines from list fields before persisting. */
export function compactProfileArrays(profile: UserProfile): UserProfile {
  return {
    ...profile,
    skills: cleanItemList(profile.skills),
    experienceBullets: cleanItemList(profile.experienceBullets),
    projectBullets: cleanItemList(profile.projectBullets),
  };
}
