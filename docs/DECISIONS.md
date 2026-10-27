# Registro de Decisões de Arquitetura (ADR) — JurisFlow

**Triforce System | SaaS Jurídico Multi-Tenant**

---

### DEC-001: Isolamento em Duas Camadas Independentes (Defesa em Profundidade)

- **Status:** Aprovado e Implementado
- **Contexto:** Plataforma jurídica multi-tenant lidando com dados sob sigilo profissional e LGPD.
- **Decisão:** Isolamento na camada de aplicação via `requireOrgContext()` e no banco de dados via PostgreSQL Row Level Security (RLS) habilitado com `FORCE ROW LEVEL SECURITY`.
- **Motivo:** Garante que mesmo que uma query da aplicação omita acidentalmente o filtro `organization_id`, o motor do banco de dados bloqueia 100% o acesso entre tenants.
- **Alternativa Descartada:** Isolamento apenas na aplicação (risco inaceitável de vazamento por falha humana).

---

### DEC-002: Papel de Aplicação sem Privilégios Administrativos (`jurisflow_app`)

- **Status:** Aprovado e Implementado
- **Contexto:** O PostgreSQL desabilita RLS por padrão para superusuários ou papéis com `BYPASSRLS`.
- **Decisão:** A aplicação conecta exclusivamente com o papel `jurisflow_app` configurado com `NOBYPASSRLS` e `NOSUPERUSER`. A `DIRECT_URL` com `postgres` é reservada exclusivamente para migrações do Prisma Migrate CLI.
- **Motivo:** Torna o RLS mandatório em tempo de execução.
- **Alternativa Descartada:** Conectar a aplicação como `postgres` (anularia o RLS).

---

### DEC-003: Chaves Compostas para Prevenção de Referência Cruzada

- **Status:** Aprovado e Implementado
- **Contexto:** Relações filhas (ex.: `legal_cases -> clients`, `tasks -> legal_cases`).
- **Decisão:** Todas as chaves estrangeiras entre entidades do mesmo tenant utilizam chave composta `(organization_id, id)`.
- **Motivo:** Impede matematicamente que uma entidade do tenant A aponte para um registro do tenant B na chave estrangeira.
- **Alternativa Descartada:** Chaves simples `id` com validação apenas em código.

---

### DEC-004: Imutabilidade Estrita da Trilha de Auditoria e Aceite de Termos

- **Status:** Aprovado e Implementado
- **Contexto:** Conformidade probatória e LGPD.
- **Decisão:** As tabelas `audit_logs`, `document_access_logs` e `terms_acceptances` têm `UPDATE` e `DELETE` revogados para o papel `jurisflow_app`.
- **Motivo:** Garante que logs de auditoria e registros de aceite não possam ser adulterados nem apagados pela aplicação.
- **Alternativa Descartada:** Soft delete ou controle de atualização apenas via código da aplicação.

---

### DEC-005: Tratamento de Nomenclaturas Modernas e Legadas de Chaves Supabase

- **Status:** Aprovado e Implementado
- **Contexto:** O Supabase migrou de nomes legados (`ANON_KEY`, `SERVICE_ROLE_KEY`) para nomes modernos (`PUBLISHABLE_KEY`, `SECRET_KEY`).
- **Decisão:**
  1. Suporte simultâneo às duas nomenclaturas no validador `src/config/env.ts`.
  2. Se ambas forem informadas com valores **idênticos**, a aplicação aceita normalmente.
  3. Se ambas forem informadas com valores **diferentes**, a aplicação falha imediatamente com erro descritivo de conflito.
  4. Nenhuma mensagem de erro exibe o valor das variáveis recebidas, garantindo proteção contra vazamento em logs.
- **Motivo:** Compatibilidade com ambientes legados e novos projetos, com prevenção estrita contra divergência de credenciais e vazamento de segredos.
- **Alternativa Descartada:** Suportar apenas uma das nomenclaturas (causaria quebra de configuração) ou ignorar divergência silenciosamente (geraria comportamento imprevisível).

---

### DEC-006: Proteção com server-only e Validação Fail-Fast via instrumentation.ts

- **Status:** Aprovado e Implementado
- **Contexto:** Variáveis de ambiente sensíveis (como `SUPABASE_SECRET_KEY`, `DATABASE_URL` e `DIRECT_URL`) jamais podem ser expostas no bundle de cliente.
- **Decisão:**
  1. Marcação de `src/config/env.ts` com `import 'server-only'`.
  2. Teste unitário comprovando que o pacote `server-only` bloqueia a importação fora do ambiente de servidor, complementado pela verificação estática do compilador no `next build`.
  3. Inicialização e validação antecipada incondicional em `src/instrumentation.ts` no hook `register()` via acesso ao proxy `env`, garantindo que a aplicação recuse iniciar (_fail-fast_) caso as variáveis obrigatórias estejam ausentes ou mal formatadas.
- **Motivo:** Prevenção proativa contra vazamento de segredos em Client Components e detecção imediata de erros de configuração no boot do servidor.
- **Alternativa Descartada:** Validação tardia sob demanda (postergaria a descoberta de erros para a primeira requisição do usuário).
