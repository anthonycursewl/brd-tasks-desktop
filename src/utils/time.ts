export function getRemaining(expiresAt: string): { text: string; expired: boolean } {
  const now = Date.now();
  const expiresAtMs = new Date(expiresAt).getTime();
  const diff = expiresAtMs - now;

  if (diff <= 0) return { text: "Expired", expired: true };

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) return { text: `${hours}h ${minutes}m`, expired: false };
  return { text: `${minutes}m`, expired: false };
}

export function getRemainingDetailed(expiresAt: string) {
  const now = Date.now();
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const total = Math.max(0, Math.ceil(diff / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return { total, expired: false, days, hours, minutes, seconds };
}

export function getTimeRemaining(expiresAt: string): string {
  const { text, expired } = getRemaining(expiresAt);
  return expired ? "Expirada" : text;
}

export function getProgressPercent(expiresAt: string, createdAt: string): number {
  const total = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
