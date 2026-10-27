/**
 * Hook de instrumentação do Next.js.
 * Executado na partida do servidor (Server Startup).
 * Força a validação incondicional de todas as variáveis de ambiente (Fail-Fast).
 */
export async function register() {
  const { env } = await import("@/config/env");
  // Acessa o proxy env explicitamente para disparar a validação fail-fast incondicional no boot
  void env.NODE_ENV;
}
