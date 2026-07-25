export function formatScore(score: number): string {
  return Math.max(0, Math.trunc(score)).toLocaleString('pt-BR');
}
