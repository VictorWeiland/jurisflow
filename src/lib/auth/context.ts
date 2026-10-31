import "server-only";
import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import { brand } from "@/config/brand";
import { resolveSession } from "@/lib/auth/session";
import { ForbiddenOrgAccessError, OrgRequiredError } from "@/lib/auth/errors";

/**
 * Nome canônico do cookie que armazena a organização ativa do usuário,
 * derivado diretamente do slug centralizado da marca.
 */
export const ORG_COOKIE_NAME = `${brand.slug}_org_id`;

// Símbolo unicamente local para garantir que OrgContext seja um Branded Type nominal
declare const OrgContextBrand: unique symbol;

/**
 * Interface tipada e blindada (Branded Type) do contexto de tenant autenticado e validado.
 *
 * REGRA DE SEGURANÇA:
 * O tipo nominal impede que qualquer módulo fora de src/lib/auth crie ou forje
 * instâncias literais de OrgContext.
 */
export type OrgContext = {
  readonly [OrgContextBrand]: true;
  readonly userId: string;
  readonly orgId: string;
  readonly roleId: string;
  readonly roleName: string;
};

function createOrgContext(payload: {
  userId: string;
  orgId: string;
  roleId: string;
  roleName: string;
}): OrgContext {
  return payload as unknown as OrgContext;
}

/**
 * Camada (ii) - Resolução e validação de pertinência do tenant.
 *
 * REGRA ARQUITETURAL INVIOLÁVEL:
 * 1. O cookie jurisflow_org_id NUNCA é aceito cegamente.
 * 2. Valida contra organization_members onde user_id = :userId,
 *    organization_id = :orgId, e status = 'active'.
 * 3. Valida se a organização também está com status = 'active'.
 * 4. Aplica as variáveis de isolamento do PostgreSQL:
 *    set_config('app.current_user_id', ..., true)
 *    set_config('app.current_org_id', ..., true)
 *    dentro de transação com is_local = true (sem vazamento entre conexões do pool).
 *
 * Esta função é interna ao módulo de autenticação. Nenhuma rota ou componente externo
 * pode invocá-la passando userId vindo de requisição.
 */
export async function resolveOrgContext(
  prisma: PrismaClient,
  userId: string,
  cookieOrgId?: string | null,
): Promise<OrgContext> {
  if (
    !cookieOrgId ||
    typeof cookieOrgId !== "string" ||
    cookieOrgId.trim() === ""
  ) {
    throw new OrgRequiredError(
      `Organização não selecionada. O cookie ${ORG_COOKIE_NAME} é obrigatório.`,
    );
  }

  const normalizedOrgId = cookieOrgId.trim();

  // Executa dentro de transação local configurando app.current_user_id
  // para permitir que a política RLS 'user_own_memberships_policy' avalie a pertença
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;

    // Consulta atômica verificando membership ativo e organização ativa
    const member = await tx.organizationMember.findFirst({
      where: {
        userId,
        organizationId: normalizedOrgId,
        isActive: true,
        organization: {
          isActive: true,
        },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenOrgAccessError(
        "Acesso negado: o usuário não é membro ativo da organização solicitada.",
      );
    }

    return createOrgContext({
      userId,
      orgId: normalizedOrgId,
      roleId: member.roleId,
      roleName: member.role.name,
    });
  });
}

/**
 * Ponto de entrada canônico da aplicação para resolução de contexto de tenant.
 *
 * Executa em sequência mandatória:
 * 1. Camada (i): resolveSession() -> Obtém userId via Supabase Auth lido dos cookies.
 * 2. Camada (ii): Lê o cookie 'jurisflow_org_id' exclusivamente de cookies() do Next.js.
 *    (Headers customizados como x-organization-id ou x-user-id são sumariamente ignorados).
 * 3. resolveOrgContext() -> Valida a pertinência no banco e retorna o contexto seguro.
 */
export async function requireOrgContext(
  prisma: PrismaClient,
): Promise<OrgContext> {
  // 1. Resolve usuário autenticado pelo Supabase Auth (rejeita com 401 se não houver sessão)
  const user = await resolveSession();

  // 2. Lê estritamente o cookie jurisflow_org_id do servidor
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ORG_COOKIE_NAME)?.value;

  // 3. Valida a pertinência e status do tenant
  return resolveOrgContext(prisma, user.id, cookieOrgId);
}

/**
 * Helper de execução segura dentro de transação de tenant com PostgreSQL RLS ativo.
 * Define app.current_user_id e app.current_org_id com escopo estrito local (is_local = true).
 */
export async function withOrgContext<T>(
  prisma: PrismaClient,
  context: OrgContext,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Define as variáveis de sessão no PostgreSQL no escopo da transação atual (true)
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${context.orgId}, true)`;

    // Executa a operação do tenant protegida por RLS
    return fn(tx as unknown as PrismaClient);
  });
}
