const ratingFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function formatRating(value: number) {
  return ratingFormatter.format(value);
}

export function formatMonthYear(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function yearsInMarket(foundedYear: number, now = new Date()) {
  return Math.max(now.getFullYear() - foundedYear, 0);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

/** Data curta ("05 de out."). Datas puras (yyyy-mm-dd) são lidas ao meio-dia para não virar o dia anterior. */
export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}

export function formatFullDate(value: string) {
  return fullDateFormatter.format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}

/** "há 3 dias", "hoje". */
export function formatRelativeDays(value: string, now = new Date()) {
  const days = Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return formatShortDate(value);
}
