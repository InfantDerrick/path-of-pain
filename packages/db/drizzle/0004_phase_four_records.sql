CREATE TABLE "posting_snapshot" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text NOT NULL,
  "user_id" text NOT NULL,
  "storage_key" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "hash" text NOT NULL,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "contact" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "company_id" text NOT NULL,
  "name" text NOT NULL,
  "role" text,
  "email" text,
  "phone" text,
  "url" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "opportunity_contact" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "user_id" text NOT NULL,
  "relationship" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "attachment" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text NOT NULL,
  "user_id" text NOT NULL,
  "storage_key" text NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "kind" text DEFAULT 'other' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "posting_snapshot" ADD CONSTRAINT "posting_snapshot_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "posting_snapshot" ADD CONSTRAINT "posting_snapshot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact" ADD CONSTRAINT "contact_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "opportunity_contact" ADD CONSTRAINT "opportunity_contact_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "opportunity_contact" ADD CONSTRAINT "opportunity_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "opportunity_contact" ADD CONSTRAINT "opportunity_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "posting_snapshot_opportunity_idx" ON "posting_snapshot" USING btree ("opportunity_id");
CREATE INDEX "posting_snapshot_user_captured_idx" ON "posting_snapshot" USING btree ("user_id","captured_at");
CREATE INDEX "contact_user_company_idx" ON "contact" USING btree ("user_id","company_id");
CREATE UNIQUE INDEX "contact_user_company_email_uidx" ON "contact" USING btree ("user_id","company_id","email") WHERE "contact"."email" is not null;
CREATE INDEX "opportunity_contact_opportunity_idx" ON "opportunity_contact" USING btree ("opportunity_id");
CREATE UNIQUE INDEX "opportunity_contact_pair_uidx" ON "opportunity_contact" USING btree ("opportunity_id","contact_id");
CREATE INDEX "attachment_opportunity_idx" ON "attachment" USING btree ("opportunity_id");
CREATE INDEX "attachment_user_created_idx" ON "attachment" USING btree ("user_id","created_at");
