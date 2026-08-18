CREATE TABLE "email_connection" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "provider" text NOT NULL,
  "label" text NOT NULL,
  "encrypted_config" text,
  "status" text DEFAULT 'active' NOT NULL,
  "last_sync_at" timestamp with time zone,
  "last_error" text,
  "sync_window_days" integer DEFAULT 30 NOT NULL,
  "store_subject" boolean DEFAULT true NOT NULL,
  "store_snippets" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "email_message_ref" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "connection_id" text NOT NULL,
  "provider" text NOT NULL,
  "provider_message_id" text NOT NULL,
  "thread_id" text,
  "from_email" text,
  "from_domain" text,
  "subject" text,
  "subject_hash" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL,
  "processed_at" timestamp with time zone NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "email_suggestion" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "message_ref_id" text NOT NULL,
  "opportunity_id" text NOT NULL,
  "type" text NOT NULL,
  "confidence" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "summary" text NOT NULL,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "proposed_event" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);

ALTER TABLE "email_connection" ADD CONSTRAINT "email_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_message_ref" ADD CONSTRAINT "email_message_ref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_message_ref" ADD CONSTRAINT "email_message_ref_connection_id_email_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."email_connection"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_suggestion" ADD CONSTRAINT "email_suggestion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_suggestion" ADD CONSTRAINT "email_suggestion_message_ref_id_email_message_ref_id_fk" FOREIGN KEY ("message_ref_id") REFERENCES "public"."email_message_ref"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_suggestion" ADD CONSTRAINT "email_suggestion_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "email_connection_user_idx" ON "email_connection" USING btree ("user_id");
CREATE INDEX "email_connection_user_status_idx" ON "email_connection" USING btree ("user_id","status");
CREATE UNIQUE INDEX "email_message_ref_provider_message_uidx" ON "email_message_ref" USING btree ("user_id","provider","provider_message_id");
CREATE INDEX "email_message_ref_user_received_idx" ON "email_message_ref" USING btree ("user_id","received_at");
CREATE INDEX "email_message_ref_user_domain_idx" ON "email_message_ref" USING btree ("user_id","from_domain");
CREATE INDEX "email_suggestion_user_status_idx" ON "email_suggestion" USING btree ("user_id","status");
CREATE INDEX "email_suggestion_opportunity_idx" ON "email_suggestion" USING btree ("opportunity_id");
CREATE UNIQUE INDEX "email_suggestion_message_type_uidx" ON "email_suggestion" USING btree ("message_ref_id","type","opportunity_id");
