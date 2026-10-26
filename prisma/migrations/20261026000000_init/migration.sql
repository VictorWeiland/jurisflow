-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "max_users" INTEGER NOT NULL DEFAULT 3,
    "max_storage_mb" INTEGER NOT NULL DEFAULT 5120,
    "max_cases" INTEGER NOT NULL DEFAULT 500,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subprocessors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "purpose" VARCHAR(200) NOT NULL,
    "data_types" TEXT NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "privacy_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subprocessors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "trade_name" VARCHAR(200),
    "cnpj" VARCHAR(20),
    "oab_number" VARCHAR(30),
    "oab_state" VARCHAR(2),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    "dpo_name" VARCHAR(200),
    "dpo_email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "avatar_url" VARCHAR(500),
    "phone" VARCHAR(30),
    "oab_number" VARCHAR(30),
    "oab_state" VARCHAR(2),
    "is_superadmin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "invited_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "diff" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'trial',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "category" VARCHAR(50) NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_version" VARCHAR(20) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_activities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "purpose" TEXT NOT NULL,
    "data_categories" TEXT NOT NULL,
    "legal_basis" VARCHAR(100) NOT NULL,
    "retention_period" VARCHAR(100) NOT NULL,
    "security_measures" TEXT NOT NULL,
    "dpo_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "processing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "requester_name" VARCHAR(200) NOT NULL,
    "requester_email" VARCHAR(255) NOT NULL,
    "requester_document" VARCHAR(30) NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'received',
    "response_deadline" DATE NOT NULL,
    "internal_notes" TEXT,
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "retention_months" INTEGER NOT NULL,
    "legal_basis" VARCHAR(100) NOT NULL,
    "requires_human_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "detected_at" TIMESTAMPTZ(6) NOT NULL,
    "severity" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "affected_records_count" INTEGER,
    "containment_actions" TEXT NOT NULL,
    "reported_to_authorities" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'investigating',
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "person_type" VARCHAR(20) NOT NULL DEFAULT 'individual',
    "name" VARCHAR(200) NOT NULL,
    "document_number" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "alt_phone" VARCHAR(30),
    "address" JSONB,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_cases" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "cnj_number" VARCHAR(30),
    "title" VARCHAR(250) NOT NULL,
    "adverse_party" VARCHAR(200),
    "court" VARCHAR(100),
    "judicial_branch" VARCHAR(100),
    "area" VARCHAR(50) NOT NULL,
    "action_type" VARCHAR(100),
    "responsible_id" UUID,
    "distribution_date" DATE,
    "case_value_cents" BIGINT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "phase" VARCHAR(50),
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "internal_ref" VARCHAR(50),
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_parties" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "party_type" VARCHAR(50) NOT NULL,
    "document_number" VARCHAR(30),
    "lawyer_name" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "event_date" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "due_time" VARCHAR(10),
    "calculation_type" VARCHAR(30) NOT NULL DEFAULT 'informative',
    "calculation_log" JSONB,
    "responsible_id" UUID,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hearings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "hearing_date" TIMESTAMPTZ(6) NOT NULL,
    "location" VARCHAR(255),
    "hearing_type" VARCHAR(50) NOT NULL DEFAULT 'conciliation',
    "responsible_id" UUID,
    "notes" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "responsible_id" UUID,
    "due_date" DATE,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(30) NOT NULL DEFAULT 'todo',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'petition',
    "description" TEXT,
    "storage_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" UUID NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "change_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_type" VARCHAR(30) NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "case_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "total_amount_cents" BIGINT NOT NULL,
    "fee_type" VARCHAR(30) NOT NULL DEFAULT 'fixed',
    "installments_count" INTEGER NOT NULL DEFAULT 1,
    "signed_at" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "paid_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "due_date" DATE NOT NULL,
    "category_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" VARCHAR(30) NOT NULL DEFAULT 'pix',
    "received_by" UUID NOT NULL,
    "receipt_url" VARCHAR(500),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "court" VARCHAR(100),
    "is_forensic" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "link" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_id_key" ON "organization_members"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_idx" ON "invitations"("organization_id");

-- CreateIndex
CREATE INDEX "invitations_token_hash_idx" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_entity_id_idx" ON "audit_logs"("organization_id", "entity", "entity_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_id_key" ON "subscriptions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "organization_settings_organization_id_idx" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key_key" ON "organization_settings"("organization_id", "key");

-- CreateIndex
CREATE INDEX "consent_records_organization_id_user_id_idx" ON "consent_records"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "terms_acceptances_user_id_document_type_idx" ON "terms_acceptances"("user_id", "document_type");

-- CreateIndex
CREATE INDEX "processing_activities_organization_id_idx" ON "processing_activities"("organization_id");

-- CreateIndex
CREATE INDEX "data_subject_requests_organization_id_status_idx" ON "data_subject_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "retention_policies_organization_id_idx" ON "retention_policies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_organization_id_entity_type_key" ON "retention_policies"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "security_incidents_organization_id_idx" ON "security_incidents"("organization_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_document_number_idx" ON "clients"("organization_id", "document_number");

-- CreateIndex
CREATE INDEX "clients_organization_id_is_active_is_archived_idx" ON "clients"("organization_id", "is_active", "is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organization_id_id_key" ON "clients"("organization_id", "id");

-- CreateIndex
CREATE INDEX "legal_cases_organization_id_status_idx" ON "legal_cases"("organization_id", "status");

-- CreateIndex
CREATE INDEX "legal_cases_organization_id_responsible_id_idx" ON "legal_cases"("organization_id", "responsible_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_organization_id_id_key" ON "legal_cases"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_organization_id_cnj_number_key" ON "legal_cases"("organization_id", "cnj_number");

-- CreateIndex
CREATE INDEX "case_parties_organization_id_case_id_idx" ON "case_parties"("organization_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_parties_organization_id_id_key" ON "case_parties"("organization_id", "id");

-- CreateIndex
CREATE INDEX "case_events_organization_id_case_id_event_date_idx" ON "case_events"("organization_id", "case_id", "event_date");

-- CreateIndex
CREATE UNIQUE INDEX "case_events_organization_id_id_key" ON "case_events"("organization_id", "id");

-- CreateIndex
CREATE INDEX "deadlines_organization_id_due_date_status_idx" ON "deadlines"("organization_id", "due_date", "status");

-- CreateIndex
CREATE INDEX "deadlines_organization_id_responsible_id_idx" ON "deadlines"("organization_id", "responsible_id");

-- CreateIndex
CREATE UNIQUE INDEX "deadlines_organization_id_id_key" ON "deadlines"("organization_id", "id");

-- CreateIndex
CREATE INDEX "hearings_organization_id_hearing_date_idx" ON "hearings"("organization_id", "hearing_date");

-- CreateIndex
CREATE UNIQUE INDEX "hearings_organization_id_id_key" ON "hearings"("organization_id", "id");

-- CreateIndex
CREATE INDEX "tasks_organization_id_status_position_idx" ON "tasks"("organization_id", "status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_organization_id_id_key" ON "tasks"("organization_id", "id");

-- CreateIndex
CREATE INDEX "task_comments_organization_id_task_id_idx" ON "task_comments"("organization_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_comments_organization_id_id_key" ON "task_comments"("organization_id", "id");

-- CreateIndex
CREATE INDEX "documents_organization_id_case_id_idx" ON "documents"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_is_confidential_idx" ON "documents"("organization_id", "is_confidential");

-- CreateIndex
CREATE UNIQUE INDEX "documents_organization_id_id_key" ON "documents"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_organization_id_document_id_version_numbe_key" ON "document_versions"("organization_id", "document_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_organization_id_id_key" ON "document_versions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "document_access_logs_organization_id_document_id_created_at_idx" ON "document_access_logs"("organization_id", "document_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_access_logs_organization_id_id_key" ON "document_access_logs"("organization_id", "id");

-- CreateIndex
CREATE INDEX "contracts_organization_id_client_id_idx" ON "contracts"("organization_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_organization_id_id_key" ON "contracts"("organization_id", "id");

-- CreateIndex
CREATE INDEX "financial_transactions_organization_id_due_date_type_idx" ON "financial_transactions"("organization_id", "due_date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_organization_id_id_key" ON "financial_transactions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "payment_records_organization_id_transaction_id_idx" ON "payment_records"("organization_id", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_organization_id_id_key" ON "payment_records"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_name_type_key" ON "categories"("organization_id", "name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_id_key" ON "categories"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_organization_id_date_court_key" ON "holidays"("organization_id", "date", "court");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_organization_id_id_key" ON "holidays"("organization_id", "id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_is_read_idx" ON "notifications"("organization_id", "user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_organization_id_id_key" ON "notifications"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_category_key" ON "notification_preferences"("user_id", "category");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_organization_id_task_id_fkey" FOREIGN KEY ("organization_id", "task_id") REFERENCES "tasks"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_document_id_fkey" FOREIGN KEY ("organization_id", "document_id") REFERENCES "documents"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_organization_id_document_id_fkey" FOREIGN KEY ("organization_id", "document_id") REFERENCES "documents"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_case_id_fkey" FOREIGN KEY ("organization_id", "case_id") REFERENCES "legal_cases"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_contract_id_fkey" FOREIGN KEY ("organization_id", "contract_id") REFERENCES "contracts"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_organization_id_transaction_id_fkey" FOREIGN KEY ("organization_id", "transaction_id") REFERENCES "financial_transactions"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==============================================================================
-- DADOS GLOBAIS INICIAIS (Roles, Permissions, Plans, Subprocessors)
-- ==============================================================================

-- 1. Roles
INSERT INTO "roles" ("id", "name", "display_name", "description", "is_system", "created_at", "updated_at") VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Proprietário', 'Controle total da organização e titularidade', true, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrador', 'Gestão administrativa, equipe e configurações', true, now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'lawyer', 'Advogado', 'Gestão de processos, prazos, audiências e clientes', true, now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'assistant', 'Assistente Jurídico', 'Operação de suporte, tarefas e andamentos', true, now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'financial', 'Financeiro', 'Gestão financeira, cobranças, fluxo de caixa e relatórios', true, now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'viewer', 'Consulta', 'Acesso somente leitura para clientes e auditoria', true, now(), now())
ON CONFLICT ("name") DO NOTHING;

-- 2. Subscription Plans
INSERT INTO "subscription_plans" ("id", "name", "code", "description", "price_cents", "billing_cycle", "max_users", "max_storage_mb", "max_cases", "features", "is_active", "created_at", "updated_at") VALUES
  ('10000000-0000-0000-0000-000000000001', 'Essencial', 'essential', 'Ideal para advogados autônomos iniciando digitalização', 14900, 'monthly', 1, 5120, 300, '{"audit_logs": true, "export_csv": true, "calendar": true}', true, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'Profissional', 'professional', 'Para escritórios pequenos e médios em expansão', 34900, 'monthly', 5, 25600, 2000, '{"audit_logs": true, "export_csv": true, "calendar": true, "kanban": true, "privacy_center": true}', true, now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'Empresarial', 'enterprise', 'Equipes jurídicas corporativas e grandes bancas', 79900, 'monthly', 20, 102400, 10000, '{"audit_logs": true, "export_csv": true, "calendar": true, "kanban": true, "privacy_center": true, "custom_roles": true}', true, now(), now())
ON CONFLICT ("code") DO NOTHING;

-- 3. Subprocessors (LGPD Art. 33/39)
INSERT INTO "subprocessors" ("id", "name", "purpose", "data_types", "country", "privacy_url", "is_active", "created_at", "updated_at") VALUES
  ('20000000-0000-0000-0000-000000000001', 'Supabase Inc. / AWS', 'Hospedagem de Banco de Dados PostgreSQL e Autenticação (Região sa-east-1)', 'Dados cadastrais, registros jurídicos e credenciais criptografadas', 'Brasil (São Paulo)', 'https://supabase.com/privacy', true, now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'Vercel Inc. / AWS', 'Hospedagem da Aplicação Frontend e Edge Network', 'Metadados de tráfego, headers HTTP e logs de edge anonimizados', 'Estados Unidos / Brasil', 'https://vercel.com/legal/privacy-policy', true, now(), now())
ON CONFLICT ("id") DO NOTHING;


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ==============================================================================

-- 1. Habilitação de RLS em todas as tabelas com isolamento

ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "organization_members";
CREATE POLICY "tenant_isolation_policy" ON "organization_members"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "invitations";
CREATE POLICY "tenant_isolation_policy" ON "invitations"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "audit_logs";
CREATE POLICY "tenant_isolation_policy" ON "audit_logs"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "subscriptions";
CREATE POLICY "tenant_isolation_policy" ON "subscriptions"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "organization_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "organization_settings";
CREATE POLICY "tenant_isolation_policy" ON "organization_settings"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "consent_records";
CREATE POLICY "tenant_isolation_policy" ON "consent_records"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "processing_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processing_activities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "processing_activities";
CREATE POLICY "tenant_isolation_policy" ON "processing_activities"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "data_subject_requests";
CREATE POLICY "tenant_isolation_policy" ON "data_subject_requests"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "retention_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retention_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "retention_policies";
CREATE POLICY "tenant_isolation_policy" ON "retention_policies"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "security_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_incidents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "security_incidents";
CREATE POLICY "tenant_isolation_policy" ON "security_incidents"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "clients";
CREATE POLICY "tenant_isolation_policy" ON "clients"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "legal_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_cases" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "legal_cases";
CREATE POLICY "tenant_isolation_policy" ON "legal_cases"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "case_parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_parties" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "case_parties";
CREATE POLICY "tenant_isolation_policy" ON "case_parties"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "case_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "case_events";
CREATE POLICY "tenant_isolation_policy" ON "case_events"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "deadlines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deadlines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "deadlines";
CREATE POLICY "tenant_isolation_policy" ON "deadlines"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "hearings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hearings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "hearings";
CREATE POLICY "tenant_isolation_policy" ON "hearings"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "tasks";
CREATE POLICY "tenant_isolation_policy" ON "tasks"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_comments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "task_comments";
CREATE POLICY "tenant_isolation_policy" ON "task_comments"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "documents";
CREATE POLICY "tenant_isolation_policy" ON "documents"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "document_versions";
CREATE POLICY "tenant_isolation_policy" ON "document_versions"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "document_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_access_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "document_access_logs";
CREATE POLICY "tenant_isolation_policy" ON "document_access_logs"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "contracts";
CREATE POLICY "tenant_isolation_policy" ON "contracts"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "financial_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "financial_transactions";
CREATE POLICY "tenant_isolation_policy" ON "financial_transactions"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "payment_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_records" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "payment_records";
CREATE POLICY "tenant_isolation_policy" ON "payment_records"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "categories";
CREATE POLICY "tenant_isolation_policy" ON "categories"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holidays" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "holidays";
CREATE POLICY "tenant_isolation_policy" ON "holidays"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "notifications";
CREATE POLICY "tenant_isolation_policy" ON "notifications"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

-- 2. Tabela organizations
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_current_isolation_policy" ON "organizations";
CREATE POLICY "org_current_isolation_policy" ON "organizations"
  FOR ALL TO jurisflow_app
  USING ("id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS "org_member_list_policy" ON "organizations";
CREATE POLICY "org_member_list_policy" ON "organizations"
  FOR SELECT TO jurisflow_app
  USING ("id" IN (
    SELECT "organization_id" FROM "organization_members"
    WHERE "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND "is_active" = true
  ));

-- 3. Tabela organization_members (política extra de listagem própria)
DROP POLICY IF EXISTS "user_own_memberships_policy" ON "organization_members";
CREATE POLICY "user_own_memberships_policy" ON "organization_members"
  FOR SELECT TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- 4. Tabela profiles
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_own_policy" ON "profiles";
CREATE POLICY "profile_own_policy" ON "profiles"
  FOR ALL TO jurisflow_app
  USING ("id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS "profile_member_read_policy" ON "profiles";
CREATE POLICY "profile_member_read_policy" ON "profiles"
  FOR SELECT TO jurisflow_app
  USING ("id" IN (
    SELECT "user_id" FROM "organization_members"
    WHERE "organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
  ));

-- 5. Tabela terms_acceptances
ALTER TABLE "terms_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terms_acceptances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "terms_user_isolation_policy" ON "terms_acceptances";
CREATE POLICY "terms_user_isolation_policy" ON "terms_acceptances"
  FOR ALL TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- 6. Tabela notification_preferences
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_pref_own_policy" ON "notification_preferences";
CREATE POLICY "notif_pref_own_policy" ON "notification_preferences"
  FOR ALL TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);


-- ==============================================================================
-- FUNÇÕES SECURITY DEFINER (com FORCE ROW LEVEL SECURITY ativo)
-- ==============================================================================

-- 1. Criação de Organização com Proprietário
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name text,
  org_slug text,
  org_timezone text DEFAULT 'America/Sao_Paulo'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_owner_role_id uuid;
BEGIN
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: app.current_user_id ausente' USING ERRCODE = '28000';
  END IF;

  -- Garante existência de registro em public.profiles correspondente a auth.users
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, email, full_name, is_superadmin, created_at, updated_at)
    SELECT id, email, split_part(email, '@', 1), false, now(), now()
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner';
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Papel owner não encontrado' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.organizations (id, name, slug, timezone, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, org_slug, org_timezone, true, now(), now())
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (id, organization_id, user_id, role_id, is_active, joined_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_user_id, v_owner_role_id, true, now(), now());

  RETURN v_org_id;
END;
$$;

-- 2. Aceite de Convite com Validação em auth.users e SELECT FOR UPDATE
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
  v_existing_id uuid;
BEGIN
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: app.current_user_id ausente' USING ERRCODE = '28000';
  END IF;

  -- Validação estrita em auth.users exigindo e-mail confirmado
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id AND email_confirmed_at IS NOT NULL;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui e-mail verificado em auth.users' USING ERRCODE = '28000';
  END IF;

  -- Lock pessimista com FOR UPDATE para garantia de uso único
  SELECT id, organization_id, role_id, email INTO v_invitation
  FROM public.invitations
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_invitation.email) != lower(v_user_email) THEN
    RAISE EXCEPTION 'O convite pertence a outro e-mail' USING ERRCODE = '42501';
  END IF;

  -- Garante existência de registro em public.profiles correspondente a auth.users
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, email, full_name, is_superadmin, created_at, updated_at)
    SELECT id, email, split_part(email, '@', 1), false, now(), now()
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.organization_members
  WHERE organization_id = v_invitation.organization_id AND user_id = v_user_id;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.organization_members (id, organization_id, user_id, role_id, is_active, joined_at, updated_at)
    VALUES (gen_random_uuid(), v_invitation.organization_id, v_user_id, v_invitation.role_id, true, now(), now());
  END IF;

  UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

-- Restrições de execução nas funções
REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) TO jurisflow_app;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO jurisflow_app;

-- ==============================================================================
-- REVOGAÇÃO DE PRIVILÉGIOS (Mínimos Estritos)
-- ==============================================================================

-- 1. Revoga acesso de anon e authenticated em todas as tabelas, sequences e rotinas do schema public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 2. Tabelas Globais: jurisflow_app tem APENAS permissão de leitura (SELECT)
REVOKE INSERT, UPDATE, DELETE ON public.roles FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.permissions FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_plans FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.subprocessors FROM jurisflow_app;

-- 3. Aceite de Termos (terms_acceptances): apenas INSERT e SELECT (imutável)
REVOKE UPDATE, DELETE ON public.terms_acceptances FROM jurisflow_app;

-- 4. Trilha de Auditoria e Acessos a Documentos: apenas INSERT e SELECT (imutável)
REVOKE UPDATE, DELETE ON public.audit_logs FROM jurisflow_app;
REVOKE UPDATE, DELETE ON public.document_access_logs FROM jurisflow_app;
