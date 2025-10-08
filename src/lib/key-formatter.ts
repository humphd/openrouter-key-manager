export function generateKeyName(
  email: string,
  studentId: string,
  course: string,
  date: string
): string {
  return `${email} ${studentId} ${course} ${date}`;
}

export function generateEmail(username: string, domain: string): string {
  if (username.includes("@")) {
    return username;
  }
  return `${username}@${domain}`;
}

export function parseKeyName(keyName: string):
  | {
      email: string;
      studentId: string;
      course: string;
      date: string;
    }
  | string {
  const parts = keyName.split(" ");
  if (parts.length < 4) {
    // Format of key name is not what we expect, use the entire string
    return keyName;
  }

  return {
    email: parts[0],
    studentId: parts[1],
    course: parts[2],
    date: parts[3],
  };
}
