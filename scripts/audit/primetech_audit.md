# PrimeTech Site Audit — Companions of CPAS
Generated: 2026-05-29 14:58

## Summary

| Page | Lines | Size | Inline CSS | Flags |
|------|-------|------|------------|-------|

---

## PrimeTech Pipeline Contract

Every content/layout change must flow through:

```
1. Edit content in D1: cms_pages + cms_page_sections
2. Trigger /api/cms/publish
3. render_page.js assembles HTML using theme tokens from cms_themes
4. Output written to KV (edge cache) + R2 (archive)
5. Worker serves from KV on public request
6. git commit references todo_id or ctx_id
7. Never edit public/*.html directly once pipeline is live
```

### File Budget Targets

| File type | Target |
|-----------|--------|
| Page HTML | < 200 lines, < 15KB |
| Page CSS  | < 15KB |
| Page JS   | < 20KB |
| cpas-shell.css | < 50KB (currently ?KB) |
| cpas-shell.js  | < 30KB |
| Any section    | < 50KB total (Shopify discipline) |