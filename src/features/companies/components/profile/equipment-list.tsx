import type { CompanyProfile } from "@/features/companies/queries";

export function EquipmentList({ items }: { items: CompanyProfile["equipamentos"] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">{item.nome}</p>
            {item.modelo && <p className="text-sm text-muted-foreground">{item.modelo}</p>}
            {item.capacidade && <p className="text-sm text-muted-foreground">{item.capacidade}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-surface-raised px-2.5 py-0.5 text-sm font-semibold" aria-label={`Quantidade: ${item.quantidade}`}>
            {item.quantidade}×
          </span>
        </li>
      ))}
    </ul>
  );
}
