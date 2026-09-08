-- Backfill NULL issuer values with default 'email' for existing accounts
UPDATE "account" SET "issuer" = 'email' WHERE "issuer" IS NULL;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_issuer_accountId_unique" UNIQUE("issuer","account_id");