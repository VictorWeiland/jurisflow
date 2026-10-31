import { Client } from "pg";

const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  throw new Error(
    "TEST_DATABASE_URL deve ser definida nas variáveis de ambiente.",
  );
}

const parsed = new URL(testDbUrl);
const testPassword = process.env.TEST_APP_PASSWORD || "jurisflow_test_password";

export const JURISFLOW_APP_TEST_URL =
  process.env.TEST_APP_DATABASE_URL ||
  `${parsed.protocol}//jurisflow_app:${testPassword}@${parsed.host}${parsed.pathname}`;

// URL administrativa local apenas para provisionar fixtures
export const POSTGRES_TEST_URL = testDbUrl;

export async function createJurisflowAppClient(): Promise<Client> {
  const client = new Client({ connectionString: JURISFLOW_APP_TEST_URL });
  await client.connect();
  return client;
}

export async function createAdminTestClient(): Promise<Client> {
  const client = new Client({ connectionString: POSTGRES_TEST_URL });
  await client.connect();
  return client;
}

export async function setSessionContext(
  client: Client,
  params: { orgId?: string; userId?: string },
): Promise<void> {
  // Usar false para persistir a configuração no escopo da sessão (conexão atual)
  if (params.orgId !== undefined) {
    await client.query(
      `SELECT set_config('app.current_org_id', '${params.orgId}', false);`,
    );
  }
  if (params.userId !== undefined) {
    await client.query(
      `SELECT set_config('app.current_user_id', '${params.userId}', false);`,
    );
  }
}
