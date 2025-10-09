export function getProvisioningKey(cliKey?: string): string {
  if (cliKey) {
    return cliKey;
  }

  const envKey = process.env.OPENROUTER_PROVISIONING_KEY;
  if (envKey) {
    return envKey;
  }

  throw new Error(
    "Provisioning key not found. Set OPENROUTER_PROVISIONING_KEY environment variable or use --provisioning-key option",
  );
}

export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
