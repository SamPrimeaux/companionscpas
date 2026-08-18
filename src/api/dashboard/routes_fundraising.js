// routes_fundraising.js — extracted from dashboard_api.js (tkt_cpas_mod_dashboard_api_20260818)
// Auto-split: verbatim route bodies moved from the original ladder. No behavior change.

import { CAMPAIGN_SELECT, TENANT, fetchCampaignById, getAuthUser, invalidateDonatePageCache, json, loadCampaignLiveStats, normalizeCampaign, nowIso, saveCampaignRecord } from "./shared.js";

async function handleFundraisingDetailGet(request, env, url, path, method) {
  const fundraisingDetailMatch = path.match(/^\/api\/dashboard\/fundraising\/([^/]+)$/);
  if (fundraisingDetailMatch && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const campaign = await fetchCampaignById(env, fundraisingDetailMatch[1]);
    if (!campaign) return json({ ok: false, error: 'Campaign not found' }, 404);
    const donationRows = await env.DB.prepare(`
      SELECT d.id, d.amount_cents, d.currency, d.status, d.donated_at, d.created_at,
             d.donor_message, d.is_anonymous,
             dn.full_name AS donor_name, dn.email AS donor_email
      FROM donations d
      LEFT JOIN donors dn ON dn.id = d.donor_id
      WHERE d.campaign_id = ?
      ORDER BY COALESCE(d.donated_at, d.created_at) DESC
      LIMIT 100
    `).bind(campaign.id).all().catch(() => ({ results: [] }));
    const raisedLive = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) AS total
      FROM donations
      WHERE campaign_id = ?
        AND status = 'succeeded'
        AND payment_provider = 'stripe'
        AND stripe_payment_intent_id LIKE 'pi_%'
    `).bind(campaign.id).first().catch(() => ({ total: 0 }));
    const liveRaised = Number(raisedLive?.total) || 0;
    const entryRows = await env.DB.prepare(`
      SELECT ce.id, ce.dog_name, ce.owner_name, ce.owner_email, ce.owner_phone,
             ce.caption, ce.photo_url, ce.payment_status, ce.submission_status,
             ce.moderation_status, ce.is_approved, ce.expected_amount_cents,
             ce.vote_count, ce.stripe_payment_intent_id, ce.metadata_json,
             ce.admin_notified_at, ce.failure_message, ce.created_at, ce.archived_at,
             ce.resume_pay_token,
             cu.id AS campaign_update_id, cu.milestone_amount_cents, cu.is_public AS update_is_public
      FROM competition_entries ce
      LEFT JOIN campaign_updates cu
        ON cu.id = ('cupd_' || REPLACE(ce.id, 'entry_', ''))
       AND cu.campaign_id = ce.campaign_id
      WHERE ce.campaign_id = ? AND ce.tenant_id = ?
      ORDER BY ce.created_at DESC
      LIMIT 200
    `).bind(campaign.id, TENANT).all().catch(() => ({ results: [] }));
    const updateRows = await env.DB.prepare(`
      SELECT id, title, body, image_asset_id, update_type, milestone_amount_cents,
             status, is_public, published_at, created_at
      FROM campaign_updates
      WHERE campaign_id = ? AND tenant_id = ?
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 100
    `).bind(campaign.id, TENANT).all().catch(() => ({ results: [] }));
    return json({
      ok: true,
      campaign: { ...campaign, raised_cents: liveRaised, raised_amount_cents: liveRaised },
      donations: donationRows.results || [],
      entries: (entryRows.results || []).map((e) => ({
        ...e,
        resume_pay_url: e.resume_pay_token
          ? `https://companionsofcaddo.org/wet-dog/pay/${encodeURIComponent(e.resume_pay_token)}`
          : null,
      })),
      campaign_updates: updateRows.results || [],
    });
  }
  return null;
}

async function handleFundraisingEntriesList(request, env, url, path, method) {
  const fundraisingEntriesMatch = path.match(/^\/api\/dashboard\/fundraising\/([^/]+)\/entries$/);
  if (fundraisingEntriesMatch && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const campaignId = fundraisingEntriesMatch[1];
    const rows = await env.DB.prepare(`
      SELECT ce.*, cu.id AS campaign_update_id, cu.milestone_amount_cents, cu.is_public AS update_is_public
      FROM competition_entries ce
      LEFT JOIN campaign_updates cu
        ON cu.id = ('cupd_' || REPLACE(ce.id, 'entry_', ''))
       AND cu.campaign_id = ce.campaign_id
      WHERE ce.campaign_id = ? AND ce.tenant_id = ?
      ORDER BY ce.created_at DESC
      LIMIT 200
    `).bind(campaignId, TENANT).all().catch(() => ({ results: [] }));
    return json({ ok: true, entries: rows.results || [] });
  }
  return null;
}

async function handleFundraisingEntryAction(request, env, url, path, method) {
  const fundraisingEntryActionMatch = path.match(
    /^\/api\/dashboard\/fundraising\/([^/]+)\/entries\/([^/]+)\/(approve|reject|archive|resend|set-votes|send-pay-link)$/
  );
  if (fundraisingEntryActionMatch && method === 'POST') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const campaignId = fundraisingEntryActionMatch[1];
    const entryId = decodeURIComponent(fundraisingEntryActionMatch[2]);
    const action = fundraisingEntryActionMatch[3];
    const b = await request.json().catch(() => ({}));
    const entry = await env.DB.prepare(`
      SELECT id, campaign_id, payment_status FROM competition_entries
      WHERE id = ? AND campaign_id = ? AND tenant_id = ? LIMIT 1
    `).bind(entryId, campaignId, TENANT).first().catch(() => null);
    if (!entry?.id) return json({ ok: false, error: 'Entry not found' }, 404);

    if (action === 'approve') {
      await env.DB.prepare(`
        UPDATE competition_entries
        SET is_approved = 1,
            moderation_status = 'approved',
            approved_by = ?,
            approved_at = datetime('now'),
            rejection_reason = NULL,
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(session.email || session.user_id || 'dashboard', entryId, TENANT).run();
      const { setCampaignUpdatePublicForEntry } = await import('../competition_campaign_updates.js');
      await setCampaignUpdatePublicForEntry(env, entryId, true);
      // Clear entry-related admin alerts once reviewed.
      await env.DB.prepare(`
        UPDATE dashboard_notifications
        SET status = 'dismissed', dismissed_at = datetime('now')
        WHERE tenant_id = ?
          AND related_type = 'competition_entry'
          AND (
            related_id = ?
            OR related_id = ?
            OR related_id LIKE ?
          )
          AND COALESCE(status, 'active') = 'active'
      `).bind(TENANT, entryId, `${entryId}:paid`, `${entryId}%`).run().catch(() => null);
      // Gallery HTML is baked into KV page:/donate — bust so approved entries appear immediately.
      await invalidateDonatePageCache(env);
      return json({ ok: true, entry_id: entryId, moderation_status: 'approved' });
    }

    if (action === 'reject') {
      const reason = String(b.reason || 'Rejected by admin').slice(0, 500);
      await env.DB.prepare(`
        UPDATE competition_entries
        SET is_approved = 0,
            moderation_status = 'rejected',
            rejection_reason = ?,
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(reason, entryId, TENANT).run();
      const { setCampaignUpdatePublicForEntry } = await import('../competition_campaign_updates.js');
      await setCampaignUpdatePublicForEntry(env, entryId, false);
      await invalidateDonatePageCache(env);
      return json({ ok: true, entry_id: entryId, moderation_status: 'rejected' });
    }

    if (action === 'archive') {
      await env.DB.prepare(`
        UPDATE competition_entries
        SET archived_at = datetime('now'),
            moderation_status = CASE WHEN moderation_status = 'pending' THEN 'archived' ELSE moderation_status END,
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(entryId, TENANT).run();
      const { setCampaignUpdatePublicForEntry } = await import('../competition_campaign_updates.js');
      await setCampaignUpdatePublicForEntry(env, entryId, false);
      await invalidateDonatePageCache(env);
      return json({ ok: true, entry_id: entryId, archived: true });
    }

    if (action === 'set-votes') {
      const voteCount = Math.max(0, Math.min(1000000, Math.floor(Number(b.vote_count))));
      if (!Number.isFinite(voteCount)) {
        return json({ ok: false, error: 'vote_count must be a non-negative number' }, 400);
      }
      await env.DB.prepare(`
        UPDATE competition_entries
        SET vote_count = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(voteCount, entryId, TENANT).run();
      // Keep public gallery in sync when staff mirrors Facebook reactions.
      await invalidateDonatePageCache(env);
      return json({ ok: true, entry_id: entryId, vote_count: voteCount });
    }

    if (action === 'resend') {
      if (entry.payment_status !== 'paid') {
        return json({ ok: false, error: 'Only paid entries can resend the paid notification' }, 400);
      }
      // Clear prior dashboard notification dedupe so resend can create a fresh row.
      await env.DB.prepare(`
        UPDATE dashboard_notifications
        SET status = 'dismissed', dismissed_at = datetime('now')
        WHERE tenant_id = ? AND related_type = 'competition_entry' AND related_id = ?
      `).bind(TENANT, `${entryId}:paid`).run().catch(() => null);
      await env.DB.prepare(`
        UPDATE competition_entries SET admin_notified_at = NULL, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(entryId, TENANT).run().catch(() => null);
      // Allow entrant thank-you to resend too.
      await env.DB.prepare(`
        DELETE FROM email_logs
        WHERE tenant_id = ?
          AND related_type = 'competition_entry'
          AND related_id = ?
          AND email_type = 'competition_entry_thank_you'
      `).bind(TENANT, entryId).run().catch(() => null);
      const { notifyCompetitionEntry } = await import('../competition_notifications.js');
      const mail = await notifyCompetitionEntry(env, entryId, 'paid');
      return json({ ok: true, entry_id: entryId, email: mail });
    }

    if (action === 'send-pay-link') {
      if (entry.payment_status === 'paid') {
        return json({ ok: false, error: 'Entry is already paid' }, 400);
      }
      const full = await env.DB.prepare(`
        SELECT id, dog_name, owner_name, owner_email, expected_amount_cents, campaign_id
        FROM competition_entries
        WHERE id = ? AND tenant_id = ? LIMIT 1
      `).bind(entryId, TENANT).first();
      if (!full?.owner_email) return json({ ok: false, error: 'Entrant email missing' }, 400);
      const {
        ensureResumePayToken,
        competitionResumePayUrl,
      } = await import('../render_competition_resume_pay.js');
      const token = await ensureResumePayToken(env, entryId);
      if (!token) return json({ ok: false, error: 'Could not create pay link' }, 500);
      const payUrl = competitionResumePayUrl(token);
      const amount = ((Number(full.expected_amount_cents) || 1000) / 100).toFixed(2);
      const dog = full.dog_name || 'your pet';
      const first = String(full.owner_name || 'friend').trim().split(/\s+/)[0] || 'friend';
      const { sendResend } = await import('../payments_email.js');
      const mail = await sendResend(env, {
        to: String(full.owner_email).trim().toLowerCase(),
        name: full.owner_name || null,
        subject: `Finish ${dog}'s Wet Dog Competition entry`,
        html: `<p>Hi ${first},</p>
<p>Your photo for <strong>${dog}</strong> is saved. Complete the $${amount} entry fee to publish the entry:</p>
<p><a href="${payUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6f2270;color:#fff;text-decoration:none;font-weight:700">Pay $${amount} &amp; submit entry</a></p>
<p style="color:#64586a;font-size:13px">Or open this link:<br>${payUrl}</p>
<p>— Companions of CPAS</p>`,
        text: `Hi ${first},\n\nFinish ${dog}'s Wet Dog Competition entry ($${amount}):\n${payUrl}\n\n— Companions of CPAS`,
        type: 'competition_entry_resume_pay',
        related_type: 'competition_entry',
        related_id: entryId,
      });
      if (!mail.ok && !mail.skipped) {
        return json({ ok: false, error: mail.error || 'Email failed', pay_url: payUrl }, 500);
      }
      return json({
        ok: true,
        entry_id: entryId,
        pay_url: payUrl,
        resume_pay_token: token,
        email: mail,
      });
    }
  }
  return null;
}

async function handleFundraisingList(request, env, url, path, method) {
  if (path === '/api/dashboard/fundraising' && method === 'GET') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const [rows, liveStats, reviewCountRow] = await Promise.all([
      env.DB.prepare(`${CAMPAIGN_SELECT} ORDER BY fc.updated_at DESC`)
        .all().catch(() => ({ results: [] })),
      loadCampaignLiveStats(env),
      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM competition_entries
        WHERE tenant_id = ?
          AND payment_status = 'paid'
          AND COALESCE(is_approved, 0) = 0
          AND archived_at IS NULL
          AND COALESCE(moderation_status, '') NOT IN ('rejected', 'demo', 'archived')
      `).bind(TENANT).first().catch(() => ({ n: 0 })),
    ]);
    const campaigns = (rows.results || []).map((row) => {
      const base = normalizeCampaign(row);
      const live = liveStats.get(String(base.id)) || null;
      if (!live) return base;
      return {
        ...base,
        raised_cents: live.raised_cents,
        raised_amount_cents: live.raised_cents,
        donors: live.gift_count,
        donor_count: live.gift_count,
        gift_count: live.gift_count,
      };
    });
    return json({
      campaigns,
      competition_review_count: Number(reviewCountRow?.n || 0),
    });
  }
  return null;
}

async function handleFundraisingCreate(request, env, url, path, method) {
  if (path === '/api/dashboard/fundraising' && method === 'POST') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    try {
      const b = await request.json().catch(() => ({}));
      const id = await saveCampaignRecord(env, b);
      await invalidateDonatePageCache(env);
      return json({ ok: true, id });
    } catch (err) {
      return json({ ok: false, error: err.message || 'Campaign create failed' }, 400);
    }
  }
  return null;
}

async function handleFundraisingUpdate(request, env, url, path, method) {
  if (path === '/api/dashboard/fundraising' && method === 'PUT') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    try {
      const b = await request.json().catch(() => ({}));
      if (!b.id) return json({ ok: false, error: 'id required' }, 400);
      const id = await saveCampaignRecord(env, b, b.id);
      await invalidateDonatePageCache(env);
      return json({ ok: true, id });
    } catch (err) {
      return json({ ok: false, error: err.message || 'Campaign update failed' }, 400);
    }
  }
  return null;
}

async function handleFundraisingDetailDelete(request, env, url, path, method) {
  const fundraisingDetailMatch = path.match(/^\/api\/dashboard\/fundraising\/([^/]+)$/);
  if (fundraisingDetailMatch && method === 'DELETE') {
    const session = await getAuthUser(request, env);
    if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
    const campaignId = fundraisingDetailMatch[1];
    const campaign = await fetchCampaignById(env, campaignId);
    if (!campaign) return json({ ok: false, error: 'Campaign not found' }, 404);

    const entryKeys = await env.DB.prepare(`
      SELECT id, r2_key, asset_id FROM competition_entries
      WHERE campaign_id = ? AND tenant_id = ?
    `).bind(campaignId, TENANT).all().catch(() => ({ results: [] }));

    try {
      // Null every known FK to fundraising_campaigns before the hard delete.
      await env.DB.batch([
        env.DB.prepare(`UPDATE cms_assets SET campaign_id = NULL, update_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`UPDATE animal_profiles SET campaign_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`UPDATE scheduled_posts SET campaign_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`UPDATE social_post_drafts SET campaign_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`UPDATE donations SET campaign_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`UPDATE donation_intents SET campaign_id = NULL WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`DELETE FROM campaign_updates WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`DELETE FROM competition_entries WHERE campaign_id = ?`).bind(campaignId),
        env.DB.prepare(`DELETE FROM fundraising_campaigns WHERE id = ?`).bind(campaignId),
      ]);
    } catch (err) {
      console.warn('[fundraising] hard delete failed:', err?.message || err);
      return json({
        ok: false,
        error: err?.message || 'Delete failed — a related record still references this campaign',
      }, 409);
    }

    for (const row of entryKeys.results || []) {
      if (row.r2_key && env.WEBSITE_ASSETS) {
        await env.WEBSITE_ASSETS.delete(row.r2_key).catch(() => null);
      }
      if (row.asset_id) {
        await env.DB.prepare(`DELETE FROM cms_assets WHERE id = ? AND tenant_id = ?`)
          .bind(row.asset_id, TENANT).run().catch(() => null);
      }
    }

    await invalidateDonatePageCache(env);
    return json({ ok: true, deleted: campaignId, entries_removed: (entryKeys.results || []).length });
  }
  return null;
}

async function handleDonationsList(request, env, url, path, method) {
  if (path === '/api/dashboard/donations' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT d.*, dn.full_name AS donor_name, dn.email AS donor_email, fc.title AS campaign_title
      FROM donations d
      LEFT JOIN donors dn ON dn.id = d.donor_id
      LEFT JOIN fundraising_campaigns fc ON fc.id = d.campaign_id
      ORDER BY COALESCE(d.donated_at, d.created_at) DESC LIMIT 250
    `).all().catch(() => ({ results: [] }));
    return json({ donations: rows.results || [] });
  }
  return null;
}

async function handleDonationCreate(request, env, url, path, method) {
  if (path === '/api/dashboard/donations' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const amount = Math.max(0, Number(b.amount_cents || 0));
    if (!amount) return json({ ok: false, error: 'amount_cents required' }, 400);
    const now = nowIso();
    const id  = b.id || `don_${Date.now()}`;
    await env.DB.prepare(`INSERT INTO donations (id,organization_id,donor_id,campaign_id,amount_cents,currency,status,payment_provider,donor_message,is_anonymous,donated_at,created_at) VALUES (?,?,NULL,?,'usd',?,?,?,?,?,?)`)
      .bind(id, b.organization_id || TENANT, b.campaign_id || null, amount, b.status || 'received', b.payment_provider || 'manual', b.donor_message || null, String(b.donor_name || '').toLowerCase() === 'anonymous' ? 1 : 0, b.donated_at || now, now).run();
    if (b.campaign_id && ['received','completed','paid','succeeded'].includes(String(b.status || 'received').toLowerCase())) {
      await env.DB.prepare(`UPDATE fundraising_campaigns SET raised_amount_cents=COALESCE(raised_amount_cents,0)+?,donor_count=COALESCE(donor_count,0)+1,updated_at=? WHERE id=?`)
        .bind(amount, now, b.campaign_id).run();
    }
    await invalidateDonatePageCache(env);
    return json({ ok: true, id });
  }
  return null;
}

export async function routesFundraising(request, env, url, path, method) {
  {
    const r = await handleFundraisingDetailGet(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingEntriesList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingEntryAction(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingCreate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingUpdate(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleFundraisingDetailDelete(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleDonationsList(request, env, url, path, method);
    if (r) return r;
  }
  {
    const r = await handleDonationCreate(request, env, url, path, method);
    if (r) return r;
  }
  return null;
}
