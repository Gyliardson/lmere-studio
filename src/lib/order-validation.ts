export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const localDigits = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return /^\d{10,11}$/.test(localDigits) && /^[1-9]{2}/.test(localDigits) ? localDigits : null;
}

export function businessDateOrdinal(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
}

export function calendarLeadDays(eventDate: string, now = new Date()) {
  const event = new Date(`${eventDate}T12:00:00.000Z`);
  if (Number.isNaN(event.getTime()) || event.toISOString().slice(0, 10) !== eventDate) return null;
  const targetOrdinal = Date.UTC(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate());
  return Math.floor((targetOrdinal - businessDateOrdinal(now)) / DAY_MS);
}
