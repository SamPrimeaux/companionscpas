  // Cron: 06:00 UTC daily — sync ETO to IAM + roll up yesterday's usage
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncToIAM(env));

    ctx.waitUntil(
      env.DB.prepare(`
        INSERT OR REPLACE INTO agentsam_usage_rollups_daily
          (tenant_id, workspace_id, day,
           ai_calls, tokens_in, tokens_out, cost_usd,
           tool_calls, tool_successes, tool_failures, error_count,
           provider_breakdown_json, top_models_json,
           rollup_source, rolled_up_at)
        SELECT
          tenant_id,
          workspace_id,
          date(created_at)            AS day,
          COUNT(*)                    AS ai_calls,
          SUM(tokens_in)              AS tokens_in,
          SUM(tokens_out)             AS tokens_out,
          SUM(cost_usd)               AS cost_usd,
          0, 0, 0,
          SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END) AS error_count,
          json_group_object(provider, ROUND(SUM(cost_usd), 6)) AS provider_breakdown_json,
          json_group_array(model_key) AS top_models_json,
          'daily_cron',
          unixepoch()
        FROM agentsam_usage_events
        WHERE date(created_at) = date('now', '-1 day')
          AND tenant_id = 'tenant_companionscpas'
        GROUP BY tenant_id, workspace_id, date(created_at)
      `).run().catch(e => console.warn("[rollup] failed:", e.message))
    );
  }
