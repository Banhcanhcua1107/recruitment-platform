-- Public company directory summary view.
-- This enables DB-side pagination/filtering/sorting for /companies and /api/companies
-- without scanning the full jobs payload in application memory.

DROP VIEW IF EXISTS public.company_directory_summary;

CREATE VIEW public.company_directory_summary AS
WITH visible_jobs AS (
  SELECT
    j.company_name AS name,
    NULLIF(BTRIM(j.logo_url), '') AS logo_url,
    NULLIF(BTRIM(j.cover_url), '') AS cover_url,
    NULLIF(BTRIM(j.location), '') AS location,
    j.industry,
    j.employer_id,
    j.posted_date
  FROM public.jobs AS j
  WHERE j.status = 'open'
    AND j.is_public_visible = true
    AND NULLIF(BTRIM(j.company_name), '') IS NOT NULL
),
ranked_jobs AS (
  SELECT
    v.*,
    ROW_NUMBER() OVER (
      PARTITION BY v.name
      ORDER BY v.posted_date DESC NULLS LAST, v.name ASC
    ) AS row_num
  FROM visible_jobs AS v
),
latest_job AS (
  SELECT
    r.name,
    r.logo_url,
    r.cover_url,
    r.location
  FROM ranked_jobs AS r
  WHERE r.row_num = 1
),
industry_agg AS (
  SELECT
    v.name,
    COALESCE(
      ARRAY_AGG(DISTINCT BTRIM(industry_item)) FILTER (WHERE BTRIM(industry_item) <> ''),
      ARRAY[]::TEXT[]
    ) AS industry
  FROM visible_jobs AS v
  LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(v.industry, '[]'::jsonb)) AS industry_item ON true
  GROUP BY v.name
),
company_agg AS (
  SELECT
    v.name,
    COUNT(*)::INTEGER AS job_count,
    MIN(v.employer_id::TEXT) FILTER (WHERE v.employer_id IS NOT NULL)::UUID AS employer_id
  FROM visible_jobs AS v
  GROUP BY v.name
),
employer_match AS (
  SELECT
    c.name,
    e.logo_url,
    e.cover_url,
    e.location,
    e.industry,
    e.company_size,
    e.company_description
  FROM company_agg AS c
  LEFT JOIN LATERAL (
    SELECT
      em.logo_url,
      em.cover_url,
      em.location,
      em.industry,
      em.company_size,
      em.company_description
    FROM public.employers AS em
    WHERE em.id = c.employer_id
       OR (c.employer_id IS NULL AND em.company_name = c.name)
    ORDER BY
      CASE WHEN em.id = c.employer_id THEN 0 ELSE 1 END,
      em.created_at DESC
    LIMIT 1
  ) AS e ON true
)
SELECT
  c.name,
  COALESCE(NULLIF(BTRIM(m.logo_url), ''), l.logo_url) AS logo_url,
  COALESCE(NULLIF(BTRIM(m.cover_url), ''), l.cover_url) AS cover_url,
  COALESCE(NULLIF(BTRIM(m.location), ''), l.location) AS location,
  COALESCE(
    ARRAY(
      SELECT DISTINCT BTRIM(industry_value)
      FROM UNNEST(
        COALESCE(
          ARRAY(
            SELECT BTRIM(value)
            FROM jsonb_array_elements_text(COALESCE(m.industry, '[]'::jsonb)) AS value
          ),
          ARRAY[]::TEXT[]
        ) || COALESCE(i.industry, ARRAY[]::TEXT[])
      ) AS industry_value
      WHERE BTRIM(industry_value) <> ''
    ),
    ARRAY[]::TEXT[]
  ) AS industry,
  NULLIF(BTRIM(m.company_size), '') AS size,
  NULLIF(BTRIM(m.company_description), '') AS description,
  c.job_count
FROM company_agg AS c
LEFT JOIN latest_job AS l ON l.name = c.name
LEFT JOIN industry_agg AS i ON i.name = c.name
LEFT JOIN employer_match AS m ON m.name = c.name;
