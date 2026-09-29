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
