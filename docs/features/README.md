# Feature documentation index

Vectorization-ready docs for the Companions of CPAS platform. Each file is one main product surface with YAML frontmatter, stable headings, and explicit file/API/table links.

**Template:** [`../templates/FEATURE_DOC_TEMPLATE.md`](../templates/FEATURE_DOC_TEMPLATE.md)

**Cross-cutting references:**

| Doc | Use when |
|---|---|
| [`HANDOFF.md`](../HANDOFF.md) | Canonical vs legacy D1 tables |
| [`current-file-map.md`](../current-file-map.md) | Live route ownership |
| [`AGENTSAM_CPAS_ROADMAP.md`](../AGENTSAM_CPAS_ROADMAP.md) | Agent Sam Phase 2 |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Bindings, deploy, global rules |

## Feature catalog

| ID | Doc | Status | Primary user |
|---|---|---|---|
| `cms-live-editor` | [cms-live-editor.md](cms-live-editor.md) | Live | Staff editing page sections |
| `cms-website-admin` | [cms-website-admin.md](cms-website-admin.md) | Live | Staff managing site, assets, brand |
| `email-workspace` | [email-workspace.md](email-workspace.md) | Live | Staff inbox, Gmail, notifications |
| `animal-care` | [animal-care.md](animal-care.md) | Live / mixed | Care team, intakes, medical |
| `foster-applications` | [foster-applications.md](foster-applications.md) | Live | Placement coordinator |
| `volunteers` | [volunteers.md](volunteers.md) | Live | Volunteer coordinator |
| `donations-fundraising` | [donations-fundraising.md](donations-fundraising.md) | Live (Stripe test) | Fundraising lead |
| `reports` | [reports.md](reports.md) | Partial | Leadership / ops review |
| `agent-sam` | [agent-sam.md](agent-sam.md) | Mixed | Staff AI assistant |
| `public-publish-pipeline` | [public-publish-pipeline.md](public-publish-pipeline.md) | Live | Dev / CMS publish flow |
| `auth-sessions` | [auth-sessions.md](auth-sessions.md) | Live | All dashboard users |
| `social-integrations` | [social-integrations.md](social-integrations.md) | Lane A live / Lane B future | Integrations admin |
| `dashboard-shell` | [dashboard-shell.md](dashboard-shell.md) | Live | Platform shell / routing |

## Vectorization guidance (main platform)

1. **Chunk size:** one `##` section per chunk; keep frontmatter on the first chunk only or duplicate `feature_id` + `title` per chunk.
2. **Metadata:** index `feature_id`, `tags`, `status`, and `surfaces.routes` for filtered retrieval.
3. **Synonyms:** use the **Vectorization notes** section in each doc for query expansion.
4. **Freshness:** bump `last_verified` when behavior changes; prefer feature docs over historical `sam-todo-*` files.
5. **Exclude from index:** `audits/`, `sam-todo-*.md`, `cleanup-report-*.json`, mockup `.txt` files.

## Page-level specs (public marketing)

These predate the feature doc set and remain valid for **public page layout** detail:

- [`homepage-readme.md`](../homepage-readme.md)
- [`about-readme.md`](../about-readme.md)
- [`services-page-spec.md`](../services-page-spec.md)
- [`community-page-spec.md`](../community-page-spec.md)
- [`donate-readme.md`](../donate-readme.md)
