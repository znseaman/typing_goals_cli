ALTER TABLE "goals" DROP CONSTRAINT "goals_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "goals" DROP COLUMN "tag_id";