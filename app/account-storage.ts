/** Browser preferences are scoped using the server-verified account identity. */
let account: { role: "owner" | "guest"; storageId: string } | null = null;
let pending: Promise<void> | null = null;
export function initializeAccountStorage(): Promise<void> {
  if (!pending) pending = (async () => {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (!response.ok) throw new Error("Account session unavailable");
    const value = await response.json() as { role?: unknown; storageId?: unknown };
    if (typeof value.storageId !== "string" || !/^(owner|guest):[a-f0-9]{64}$/.test(value.storageId) || (value.role !== "owner" && value.role !== "guest") || !value.storageId.startsWith(value.role + ":")) throw new Error("Invalid account identity");
    account = {role:value.role,storageId:value.storageId};
  })().catch(error => { pending = null; throw error; });
  return pending;
}
export const accountStorage = {
  getItem(key: string): string | null {
    if (!account) return null;
    try {
      const scoped = `ninety-account:${account.storageId}:${key}`;
      const value = window.localStorage.getItem(scoped);
      if (value !== null) return value;
      // Preserve the owner's pre-account preferences; never give them to a guest.
      const legacy = account.role === "owner" ? window.localStorage.getItem(key) : null;
      if (legacy !== null) { window.localStorage.setItem(scoped, legacy); window.localStorage.removeItem(key); }
      return legacy;
    } catch { return null; }
  },
  setItem(key: string, value: string) {
    if (!account) return;
    try { window.localStorage.setItem(`ninety-account:${account.storageId}:${key}`, value); } catch {}
  },
};
