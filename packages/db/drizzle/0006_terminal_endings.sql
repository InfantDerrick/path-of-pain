WITH stage_bounds AS (
  SELECT
    "user_id",
    COALESCE(MAX("order_index"), 0) AS max_order
  FROM "pipeline_stage"
  GROUP BY "user_id"
)
INSERT INTO "pipeline_stage" (
  "id",
  "user_id",
  "name",
  "slug",
  "order_index",
  "terminal_type",
  "hidden"
)
SELECT
  'stg_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  stage_bounds."user_id",
  'Rejected',
  'rejected',
  stage_bounds.max_order + 1,
  'rejected',
  false
FROM stage_bounds
WHERE NOT EXISTS (
  SELECT 1
  FROM "pipeline_stage" existing
  WHERE existing."user_id" = stage_bounds."user_id"
    AND existing."slug" = 'rejected'
);

WITH stage_bounds AS (
  SELECT
    "user_id",
    COALESCE(MAX("order_index"), 0) AS max_order
  FROM "pipeline_stage"
  GROUP BY "user_id"
)
INSERT INTO "pipeline_stage" (
  "id",
  "user_id",
  "name",
  "slug",
  "order_index",
  "terminal_type",
  "hidden"
)
SELECT
  'stg_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  stage_bounds."user_id",
  'Ghosted',
  'ghosted',
  stage_bounds.max_order + 1,
  'ghosted',
  false
FROM stage_bounds
WHERE NOT EXISTS (
  SELECT 1
  FROM "pipeline_stage" existing
  WHERE existing."user_id" = stage_bounds."user_id"
    AND existing."slug" = 'ghosted'
);
