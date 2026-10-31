import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";
import type { OrgContext } from "@/lib/auth/context";

/**
 * Instância única (Singleton) do PrismaClient encapsulada e privada ao módulo src/lib/db.
 *
 * REGRA ARQUITETURAL INVIOLÁVEL:
 * 1. rawPrisma NUNCA é exportado para uso fora deste módulo.
 * 2. Em ambiente de produção e desenvolvimento, conecta utilizando o papel jurisflow_app
 *    através de DATABASE_URL (sem privilégios administrativos e com NOBYPASSRLS).
 * 3. Qualquer acesso a dados de tenant DEVE ser realizado unicamente através de
 *    withTenantContext(context, fn), que injeta as variáveis de RLS via transação local.
 */
const globalForPrisma = globalThis as unknown as {
  prismaInstance?: PrismaClient;
};

const rawPrisma =
  globalForPrisma.prismaInstance ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prismaInstance = rawPrisma;
}

/**
 * Tipo utilitário representando o cliente transacional de tenant disponível dentro do callback.
 */
export type TenantDbClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Executor transacional seguro de tenant.
 *
 * Abre uma transação no PostgreSQL e parametriza app.current_user_id e app.current_org_id
 * com escopo estritamente local (is_local = true), delegando a proteção ao motor RLS.
 *
 * Ao término da transação (COMMIT ou ROLLBACK), as variáveis de sessão são destruídas
 * automaticamente pelo PostgreSQL, impedindo vazamento de dados no pool de conexões.
 */
export async function withTenantContext<T>(
  context: OrgContext,
  fn: (db: TenantDbClient) => Promise<T>,
  customPrisma: PrismaClient = rawPrisma,
): Promise<T> {
  return customPrisma.$transaction(async (tx) => {
    // 1. Parametrização segura e nativa (sem interpolação textual direta)
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${context.orgId}, true)`;

    // 2. Executa o callback fornecendo o cliente transacional com RLS ativo
    return fn(tx as unknown as TenantDbClient);
  });
}

/**
 * Operações institucionais e globais públicas que não possuem tenant_id (ex.: planos de assinatura).
 */
export const publicDb = {
  subscriptionPlans: {
    findMany: () =>
      rawPrisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      }),
    findUnique: (
      args: Parameters<typeof rawPrisma.subscriptionPlan.findUnique>[0],
    ) => rawPrisma.subscriptionPlan.findUnique(args),
  },
};
