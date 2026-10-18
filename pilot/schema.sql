-- Cloudflare D1 database for limited consent-aware Oído pilots.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS merchants(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 slug TEXT NOT NULL UNIQUE,
 token_hash TEXT NOT NULL UNIQUE,
 published INTEGER NOT NULL DEFAULT 0,
 accepting_requests INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items(
 id TEXT PRIMARY KEY,
 merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
 label TEXT NOT NULL,
 price_cents INTEGER,
 approved INTEGER NOT NULL DEFAULT 0,
 review_reason TEXT NOT NULL,
 position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS items_merchant ON items(merchant_id,position);
CREATE TABLE IF NOT EXISTS guest_requests(
 id TEXT PRIMARY KEY,
 public_ref TEXT NOT NULL UNIQUE,
 merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
 item_id TEXT NOT NULL REFERENCES items(id),
 item_label TEXT NOT NULL,
 price_cents INTEGER NOT NULL,
 idempotency_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'submitted',
 is_test INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(merchant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS requests_merchant ON guest_requests(merchant_id,created_at DESC);
