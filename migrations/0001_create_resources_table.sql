-- Migration number: 0001 	 2026-09-23T09:17:38.314Z

CREATE TABLE resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_key TEXT NOT NULL
    CHECK (
      length(category_key) > 0
      AND category_key NOT GLOB '*[^a-z0-9.-]*'
      AND category_key LIKE product_key || '.%'
    ),
  product_key TEXT NOT NULL
    CHECK (product_key IN ('yingao', 'tieao')),
  resource_type TEXT NOT NULL
    CHECK (resource_type IN ('document', 'sdk', 'firmware', 'video', 'faq', 'tool', 'link')),
  title_zh TEXT NOT NULL,
  title_en TEXT,
  summary_zh TEXT,
  summary_en TEXT,
  version TEXT,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  r2_key TEXT,
  external_url TEXT,
  file_name TEXT,
  file_size INTEGER CHECK (file_size IS NULL OR file_size >= 0),
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'unpublished')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_category_key
  ON resources (category_key);

CREATE INDEX idx_resources_product_key
  ON resources (product_key);

CREATE INDEX idx_resources_status
  ON resources (status);

CREATE INDEX idx_resources_published_at
  ON resources (published_at);

CREATE INDEX idx_resources_category_status_sort
  ON resources (category_key, status, sort_order);
