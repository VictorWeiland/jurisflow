import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/config/env";

/**
 * Cria o cliente Supabase oficial para Server Components e Route Handlers.
 * Utiliza exclusivamente os cookies da requisição Next.js lidos pelo servidor.
 * NUNCA aceita tokens ou chaves vindas de cabeçalhos arbitrários do cliente.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (options) {
                cookieStore.set(name, value, options);
              } else {
                cookieStore.set(name, value);
              }
            });
          } catch {
            // Em Server Components de leitura pura, mutações de cookie são ignoradas
          }
        },
      },
    },
  );
}
