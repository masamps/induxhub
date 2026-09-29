import { CompanyCard } from "@/features/companies/components/company-card";

import type { CompanyCardData } from "../queries";

export function ResultsGrid({ companies }: { companies: CompanyCardData[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((company) => (
        <li key={company.id} className="flex">
          <CompanyCard company={company} />
        </li>
      ))}
    </ul>
  );
}
