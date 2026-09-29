import type { CompanyProfile } from "@/features/companies/queries";
import { CompanyAvatar } from "@/features/companies/components/company-avatar";

export function ClientList({ items }: { items: CompanyProfile["clientes"] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((client) => (
        <li key={client.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
          <CompanyAvatar name={client.nome} logoUrl={client.logoUrl} className="size-10 rounded-xl text-sm" />
          <span className="text-sm font-medium">{client.nome}</span>
        </li>
      ))}
    </ul>
  );
}
