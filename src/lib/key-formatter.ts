export function generateKeyName(
  email: string,
  tags: string[],
  date: string
): string {
  // Trim and replace whitespace in tags with _
  const tagString = tags
    .map((tag) => tag.trim().replace(/\s+/g, "_"))
    .join(" ");

  // Only add space before tags if there are tags
  const parts = [email];
  if (tagString) {
    parts.push(tagString);
  }
  parts.push(date);

  return parts.join(" ");
}

export function parseKeyName(keyName: string): {
  email: string;
  tags: string[];
  date: string;
} | null {
  const parts = keyName.split(" ");
  if (parts.length < 2) {
    return null;
  }

  const email = parts[0];
  const date = parts[parts.length - 1];
  const tags = parts.slice(1, -1);

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return { email, tags, date };
}

export function generateOutputFilename(
  email: string | null,
  tags: string[],
  date: string
): string {
  if (email && tags.length === 0) {
    // Single key case
    return `${email.replace("@", "-")}-${date}.csv`;
  }

  // Multiple keys - use first 3 tags
  const tagPart = tags.slice(0, 3).join("-");
  return `${tagPart}-${date}.csv`;
}
