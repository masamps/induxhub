export type Reputation = {
  notaMedia: number | null;
  totalAvaliacoes: number;
  projetosConcluidos: number;
};

export type ReputationSeal = "destaque" | "avaliado" | "novo";

const DESTAQUE_MIN_NOTA = 4.5;
const DESTAQUE_MIN_AVALIACOES = 2;

/** Selo exibido no card de busca e no perfil. */
export function reputationSeal({ notaMedia, totalAvaliacoes }: Reputation): ReputationSeal {
  if (notaMedia === null || totalAvaliacoes === 0) return "novo";
  if (notaMedia >= DESTAQUE_MIN_NOTA && totalAvaliacoes >= DESTAQUE_MIN_AVALIACOES) return "destaque";
  return "avaliado";
}
