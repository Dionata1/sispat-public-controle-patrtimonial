CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"nome_completo" text NOT NULL,
	"cpf" text NOT NULL,
	"matricula" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text,
	"cargo" text NOT NULL,
	"setor" text NOT NULL,
	"role" text NOT NULL,
	"situacao" text NOT NULL,
	"password_hash" text NOT NULL,
	"force_password_change" boolean NOT NULL,
	"tentativas_invalidas" integer DEFAULT 0 NOT NULL,
	"data_criacao" text NOT NULL,
	"ultimo_acesso" text,
	CONSTRAINT "users_login_unique" UNIQUE("login"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

--> statement-breakpoint
INSERT INTO "users" ("id", "login", "nome_completo", "cpf", "matricula", "email", "telefone", "cargo", "setor", "role", "situacao", "password_hash", "force_password_change", "tentativas_invalidas", "data_criacao", "ultimo_acesso")
VALUES ('usr-admin', 'admin', 'Administrador Geral do SISPAT', '000.000.000-00', 'ADM-0000', 'admin@sispat.local', NULL, 'Administrador Geral', 'Administração Central', 'ADMIN', 'Ativo', 'pbkdf2$150000$cq8XxwqGbhlSnTqMnvTuWQ==$/fed4RzGo3i6KVfgjzvrCPfSG2y9qUz6aNMrDzLSV8g=', true, 0, '2025-01-01T00:00:00.000Z', NULL)
ON CONFLICT ("id") DO NOTHING;
