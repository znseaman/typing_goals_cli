CREATE TABLE "goals_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"met" boolean NOT NULL,
	"name" text NOT NULL,
	"type" "type" NOT NULL,
	"measure" integer NOT NULL,
	"timeframe" text NOT NULL,
	"total_measure" integer NOT NULL,
	"result_ids" json NOT NULL,
	"min_wpm" real,
	"max_wpm" real,
	"avg_wpm" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals_history" ADD CONSTRAINT "goals_history_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_history" ADD CONSTRAINT "goals_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;