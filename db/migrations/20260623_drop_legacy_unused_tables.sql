-- Drop legacy D1 tables with no references in src/ Worker code (verified 2026-06-19).
-- Safe to re-run: IF EXISTS on each DROP.
-- See docs/HANDOFF.md for defer list (tables that still need code changes first).

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS agentsam_mcp_tools;
DROP TABLE IF EXISTS agentsam_mcp_workflows;
DROP TABLE IF EXISTS cms_editor_sessions;
DROP TABLE IF EXISTS cms_editor_events;

PRAGMA foreign_keys = ON;
