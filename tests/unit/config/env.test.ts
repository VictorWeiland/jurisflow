import { describe, it, expect, vi } from "vitest";
import { validateEnv } from "@/config/env";

describe("Validação de Variáveis de Ambiente (src/config/env.ts)", () => {
  const validBaseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://xyzcompany.supabase.co",
    DATABASE_URL: "postgresql://jurisflow_app:dummy@localhost:6543/postgres",
    DIRECT_URL: "postgresql://postgres:dummy@localhost:5432/postgres",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
  };

  it("deve validar com sucesso usando variáveis modernas (PUBLISHABLE_KEY e SECRET_KEY)", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "modern_pub_key_123",
      SUPABASE_SECRET_KEY: "modern_secret_key_456",
    };

    const env = validateEnv(rawEnv);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://xyzcompany.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("modern_pub_key_123");
    expect(env.SUPABASE_SECRET_KEY).toBe("modern_secret_key_456");
    expect(env.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL);
    expect(env.DIRECT_URL).toBe(validBaseEnv.DIRECT_URL);
  });

  it("deve validar com sucesso usando variáveis legadas (ANON_KEY e SERVICE_ROLE_KEY)", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy_anon_key_123",
      SUPABASE_SERVICE_ROLE_KEY: "legacy_service_key_456",
    };

    const env = validateEnv(rawEnv);

    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      "legacy_anon_key_123",
    );
    expect(env.SUPABASE_SECRET_KEY).toBe("legacy_service_key_456");
  });

  it("deve aceitar quando ambas as chaves forem fornecidas e forem idênticas", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "same_key_pub",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "same_key_pub",
      SUPABASE_SECRET_KEY: "same_key_sec",
      SUPABASE_SERVICE_ROLE_KEY: "same_key_sec",
    };

    const env = validateEnv(rawEnv);
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("same_key_pub");
    expect(env.SUPABASE_SECRET_KEY).toBe("same_key_sec");
  });

  it("deve falhar com erro claro se as chaves públicas forem conflitantes/diferentes", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave_moderna_abc",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave_legada_xyz",
      SUPABASE_SECRET_KEY: "secret_123",
    };

    expect(() => validateEnv(rawEnv)).toThrowError(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY possuem valores divergentes/i,
    );
  });

  it("deve falhar com erro claro se as chaves secretas forem conflitantes/diferentes", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub_123",
      SUPABASE_SECRET_KEY: "secret_moderna_abc",
      SUPABASE_SERVICE_ROLE_KEY: "secret_legada_xyz",
    };

    expect(() => validateEnv(rawEnv)).toThrowError(
      /SUPABASE_SECRET_KEY e SUPABASE_SERVICE_ROLE_KEY possuem valores divergentes/i,
    );
  });

  it("deve falhar quando variável obrigatória estiver ausente", () => {
    const rawEnv = {
      ...validBaseEnv,
      // Sem chaves de API
    };

    expect(() => validateEnv(rawEnv)).toThrowError(/obrigatória ausente/i);
  });

  it("deve falhar quando URL tiver formato inválido", () => {
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_URL: "url-invalida-sem-protocolo",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub_123",
      SUPABASE_SECRET_KEY: "sec_123",
    };

    expect(() => validateEnv(rawEnv)).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL: formato de URL inválido/i,
    );
  });

  it("NUNCA deve vazar valores de variáveis na mensagem de erro (teste com valor secreto)", () => {
    const secretValue = "senha-falsa-123-ultra-secreta";
    const rawEnv = {
      ...validBaseEnv,
      NEXT_PUBLIC_SUPABASE_URL: secretValue, // URL inválida contendo string secreta
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub_123",
      SUPABASE_SECRET_KEY: "sec_123",
    };

    try {
      validateEnv(rawEnv);
      expect.unreachable("Deveria ter lançado erro de validação");
    } catch (err) {
      const error = err as Error;
      // Confirma que a mensagem contém o nome da variável e o motivo
      expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(error.message).toContain("formato de URL inválido");
      // Confirma expressamente que o valor secreto NÃO está presente na mensagem de erro
      expect(error.message).not.toContain(secretValue);
    }
  });

  it("deve confirmar que o pacote server-only bloqueia a execução em contexto de cliente", async () => {
    vi.doUnmock("server-only");
    await expect(async () => {
      // Força a importação direta do pacote real sem mock
      await import("server-only");
    }).rejects.toThrowError(
      /This module cannot be imported from a Client Component module/i,
    );
    vi.doMock("server-only", () => ({}));
  });
});
