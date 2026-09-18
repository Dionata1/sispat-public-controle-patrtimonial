CREATE TABLE "movimentacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"patrimonio_id" text NOT NULL,
	"codigo_patrimonial" text NOT NULL,
	"patrimonio_nome" text NOT NULL,
	"data_hora" text NOT NULL,
	"usuario_nome" text NOT NULL,
	"usuario_perfil" text NOT NULL,
	"local_anterior" text NOT NULL,
	"local_novo" text NOT NULL,
	"responsavel_anterior" text NOT NULL,
	"responsavel_novo" text NOT NULL,
	"motivo" text NOT NULL,
	"tipo_operacao" text NOT NULL,
	"data_registro" text
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"sigla" text NOT NULL,
	"responsavel" text NOT NULL,
	"email_contact" text,
	"total_patrimonios" integer
);
