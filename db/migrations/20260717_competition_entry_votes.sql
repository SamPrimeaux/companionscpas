-- Public vote persistence for the Wet Dog Competition gallery.
-- One row per (entry_id, voter_fingerprint) so a visitor can vote once per pup
-- but can still vote for multiple different entries. vote_count on
-- competition_entries stays the fast-read source of truth, recomputed from
-- this table on every cast so it can never drift.

CREATE TABLE IF NOT EXISTS competition_entry_votes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  entry_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  voter_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_competition_entry_votes_unique
  ON competition_entry_votes (entry_id, voter_fingerprint);

CREATE INDEX IF NOT EXISTS idx_competition_entry_votes_campaign
  ON competition_entry_votes (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competition_entry_votes_entry
  ON competition_entry_votes (entry_id);
