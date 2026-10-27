import "server-only";
import { z } from "zod";

/**
 * Interface tipada das variáveis de ambiente validadas e normalizadas.
 */
export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  TEST_DATABASE_URL?: string;
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: "development" | "test" | "production";
  ALLOW_SEED?: boolean;
}

/**
 * Validador puro de variáveis de ambiente.
 * Normaliza variáveis modernas e legadas e garante que NENHUM valor seja vazado em mensagens de erro.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const errors: string[] = [];

  // 1. Resolução e verificação de conflito da chave pública
  const pubModern = rawEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const pubLegacy = rawEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let resolvedPublicKey: string | undefined;
  if (pubModern && pubLegacy) {
    if (pubModern !== pubLegacy) {
      errors.push(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY possuem valores divergentes",
      );
    } else {
      resolvedPublicKey = pubModern;
    }
  } else {
    resolvedPublicKey = pubModern || pubLegacy;
  }

  if (!resolvedPublicKey) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY: obrigatória ausente",
    );
  }

  // 2. Resolução e verificação de conflito da chave secreta
  const secModern = rawEnv.SUPABASE_SECRET_KEY?.trim();
  const secLegacy = rawEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

  let resolvedSecretKey: string | undefined;
  if (secModern && secLegacy) {
    if (secModern !== secLegacy) {
      errors.push(
        "SUPABASE_SECRET_KEY e SUPABASE_SERVICE_ROLE_KEY possuem valores divergentes",
      );
    } else {
      resolvedSecretKey = secModern;
    }
  } else {
    resolvedSecretKey = secModern || secLegacy;
  }

  if (!resolvedSecretKey) {
    errors.push(
      "SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY: obrigatória ausente",
    );
  }

  // 3. Schema Zod para as demais variáveis (sem expor valores recebidos em caso de falha)
  const schema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z
      .string({
        required_error: "obrigatória ausente",
      })
      .url({
        message: "formato de URL inválido",
      }),
    DATABASE_URL: z
      .string({
        required_error: "obrigatória ausente",
      })
      .min(1, {
        message: "obrigatória ausente",
      }),
    DIRECT_URL: z
      .string({
        required_error: "obrigatória ausente",
      })
      .min(1, {
        message: "obrigatória ausente",
      }),
    TEST_DATABASE_URL: z
      .string()
      .min(1, { message: "obrigatória ausente" })
      .optional(),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url({
        message: "formato de URL inválido",
      })
      .default("http://localhost:3000"),
    NODE_ENV: z
      .enum(["development", "test", "production"], {
        errorMap: () => ({
          message: "deve ser development, test ou production",
        }),
      })
      .default("development"),
    ALLOW_SEED: z.preprocess(
      (v) => (v === "true" || v === true ? true : false),
      z.boolean().optional(),
    ),
  });

  const parsed = schema.safeParse(rawEnv);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const fieldName = issue.path.join(".") || "variável desconhecida";
      errors.push(`${fieldName}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[Falha de Validação de Ambiente]:\n- ${errors.join("\n- ")}`,
    );
  }

  const validData = parsed.data!;

  const result: Env = {
    NEXT_PUBLIC_SUPABASE_URL: validData.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvedPublicKey!,
    SUPABASE_SECRET_KEY: resolvedSecretKey!,
    DATABASE_URL: validData.DATABASE_URL,
    DIRECT_URL: validData.DIRECT_URL,
    TEST_DATABASE_URL: validData.TEST_DATABASE_URL,
    NEXT_PUBLIC_APP_URL: validData.NEXT_PUBLIC_APP_URL,
    NODE_ENV: validData.NODE_ENV,
    ALLOW_SEED: validData.ALLOW_SEED,
  };

  return Object.freeze(result);
}

// Exportação com lazy evaluation para o runtime da aplicação
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv(process.env);
  }
  return cachedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
