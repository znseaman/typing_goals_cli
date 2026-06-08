CREATE TYPE "public"."type" AS ENUM('time', 'count');--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "type" "type" NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "measure" integer NOT NULL;