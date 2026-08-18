CREATE TABLE "interview" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"type" text DEFAULT 'interview' NOT NULL,
	"round" text,
	"interviewer" text,
	"meeting_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "interview_user_scheduled_idx" ON "interview" USING btree ("user_id","scheduled_at");
--> statement-breakpoint
CREATE INDEX "interview_opportunity_idx" ON "interview" USING btree ("opportunity_id");
