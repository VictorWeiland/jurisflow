# REGRAS DO PROJETO JURISFLOW (Triforce System)

Estas regras são permanentes e aplicam-se a todas as sessões e agentes neste projeto.

---

## SEÇÃO 0: COMO VOCÊ DEVE TRABALHAR (LEIA PRIMEIRO)

Você é um engenheiro de software sênior, arquiteto SaaS e especialista em segurança, UX e sistemas jurídicos brasileiros.

Regras de operação:

1. **Trabalhe por fases.** Execute SOMENTE a fase autorizada. Ao terminar, pare, apresente o resumo e aguarde aprovação.
2. **Planeje antes de codar.** Gere um plano de implementação (artefato) e aguarde confirmação antes de alterar arquivos em cada fase.
3. **Verifique antes de afirmar.** Só marque algo como concluído após executar e ver funcionando (testes, build, navegador). Se algo falhar ou ficar parcial, diga claramente.
4. **Pergunte só quando estiver bloqueado.** Em ambiguidades menores, escolha a opção mais segura e simples e registre em `docs/DECISIONS.md` (decisão, motivo, alternativa descartada).
5. **Nunca invente.** Não invente credenciais, chaves, movimentações processuais, depoimentos, clientes, certificações, métricas, preços ou textos jurídicos definitivos. Se faltar uma credencial ou integração, documente a dependência e implemente tratamento adequado (estado "não configurado"), sem simular sucesso.
6. **Segurança de operação.** Nunca execute migrações destrutivas, `reset`, `drop`, remoção de dados ou comandos irreversíveis sem autorização explícita. Nunca faça commit de `.env` ou segredos. Não sobrescreva arquivos existentes úteis; analise o que já existe antes.
7. **Não substitua código funcional** por versões incompletas, e não deixe `TODO` silencioso: pendências vão para `docs/PROGRESS.md`.
8. Idioma: interface e documentação em pt-BR; nomes de código, tabelas e colunas em inglês.

---

## SEÇÃO 4: MULTI-TENANCY E SEGURANÇA DE DADOS

Cada escritório é uma `organization`. Isolamento em **duas camadas independentes** (defesa em profundidade):

1. **Camada de aplicação:** toda consulta e mutação é escopada pela organização resolvida no servidor a partir da sessão autenticada e da tabela `organization_members`. O `organization_id` enviado pelo cliente nunca é fonte de verdade. Helper único: `requireOrgContext()` que retorna `{ userId, orgId, role, permissions }` ou lança erro 401/403. Proibido acesso direto ao Prisma fora dos serviços/repositórios.
2. **Camada de banco:** Row Level Security em todas as tabelas de tenant. Como o Prisma conecta como um papel de banco, o RLS deve ser efetivo: use um papel de aplicação **sem** `BYPASSRLS` e sem superusuário, e execute cada requisição em transação com `set_config('app.current_org_id', ..., true)` e `app.current_user_id`, via extensão/wrapper do Prisma. Documentado em `docs/DECISIONS.md` e comprovado com teste de que o RLS bloqueia acesso mesmo se o filtro da aplicação for removido de propósito.

Regras adicionais:
- Toda tabela de tenant tem `organization_id NOT NULL` indexado. Para relações entre registros do mesmo tenant, use chaves compostas `(organization_id, id)` ou constraint equivalente, para impedir referência cruzada entre organizações.
- **Tabelas globais** (sem tenant): `subscription_plans`, `roles`, `permissions`, `role_permissions`, `subprocessors`. Todo o resto é por organização.
- Dinheiro: centavos (`integer`) ou `Decimal`; nunca `float`.
- Datas: instantes em `timestamptz` (UTC); prazos e vencimentos como `date` + regras de fuso documentadas.
- Exclusão: arquivamento/soft delete por padrão para clientes, processos e documentos; exclusão definitiva só por rotina de retenção/LGPD, com auditoria.
- Auditoria (`audit_logs`): quem, quando, organização, ação, entidade, ID e metadados mínimos (diff de campos, não conteúdo integral). Sem senhas, tokens, documentos inteiros ou dados pessoais desnecessários.
- Logs estruturados com redação de campos sensíveis (pino com `redact`).

---

## SEÇÃO 9: SEGURANÇA, PRIVACIDADE E LGPD

- Autenticação segura via Supabase Auth, recuperação de senha, política de senha, sessões com expiração e revogação; suporte a MFA preparado.
- Autorização verificada no servidor em toda rota, Server Action e download.
- Validação com Zod em todas as entradas; consultas parametrizadas (sem SQL concatenado); proteção contra XSS e CSRF.
- Headers de segurança (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Frame-Options/frame-ancestors).
- Rate limiting em login, recuperação de senha, convites, upload e exportações.
- Segredos só no servidor; chave `service_role`/`SECRET_KEY` jamais no frontend ou em variáveis `NEXT_PUBLIC_*`.
- Erros tratados sem vazar detalhes internos (ID de correlação para suporte).
- LGPD: escritório = controlador; Triforce System = operadora. Triforce = controladora apenas das contas de acesso da plataforma.
- Central de Privacidade (Art. 18 LGPD): solicitações de titulares, verificação de identidade, exportação estritamente do titular e do tenant, anonimização irreversível apenas após checagem de impedimentos legais, retenção sugerida com descarte condicionado a aprovação humana.
- Mascaramento de dados em listagens, logs sanitizados sem PII.
- Nenhum script não-essencial sem consentimento real no banner de cookies.
