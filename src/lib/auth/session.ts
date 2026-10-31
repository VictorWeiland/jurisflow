import "server-only";
import { createClient } from "@/lib/supabase/server";
import { AuthRequiredError } from "@/lib/auth/errors";
import type { User } from "@supabase/supabase-js";

/**
 * Camada (i): Resolve e valida a sessão do usuário no servidor via Supabase Auth.
 * Lê exclusivamente os cookies da requisição HTTP através de @supabase/ssr.
 *
 * Lança AuthRequiredError (401) se a sessão for inválida, expirada ou inexistente.
 */
export async function resolveSession(): Promise<User> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthRequiredError("Sessão inválida ou expirada");
  }

  return user;
}
