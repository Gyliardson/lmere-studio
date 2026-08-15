export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getBusinessDateString(instant: Date = new Date()): string {
  const parts = businessDateFormatter.formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Unable to resolve business calendar date");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateString: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new Error("Invalid calendar date");
  const date = new Date(`${dateString}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid calendar date");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getBusinessQuickDate(offsetDays: number, instant: Date = new Date()): string {
  return addCalendarDays(getBusinessDateString(instant), offsetDays);
}
