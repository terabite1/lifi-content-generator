-- =============================================================================
-- LiFi LinkedIn Post Generator — Data Queries
-- Run these against the Snowflake data warehouse (data-dbt models)
-- Each query maps to a JSON key in data/snapshot.json
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [1] platform_kpis
-- Overall platform health: last 30 days vs prior 30 days
-- -----------------------------------------------------------------------------
SELECT
    -- Current 30d
    SUM(CASE WHEN date >= CURRENT_DATE - 30 THEN volume_usd ELSE 0 END)          AS volume_usd_30d,
    SUM(CASE WHEN date >= CURRENT_DATE - 30 THEN tx_count ELSE 0 END)            AS tx_count_30d,

    -- Prior 30d (for growth % calc)
    SUM(CASE WHEN date >= CURRENT_DATE - 60
              AND date <  CURRENT_DATE - 30 THEN volume_usd ELSE 0 END)           AS volume_usd_prior_30d,
    SUM(CASE WHEN date >= CURRENT_DATE - 60
              AND date <  CURRENT_DATE - 30 THEN tx_count ELSE 0 END)             AS tx_count_prior_30d,

    -- All-time
    SUM(volume_usd)                                                               AS volume_usd_all_time,
    SUM(tx_count)                                                                 AS tx_count_all_time
FROM datamart.core.stats_lifi;


-- -----------------------------------------------------------------------------
-- [2] monthly_growth
-- Last 6 months: volume, transactions, active users, new users
-- -----------------------------------------------------------------------------
SELECT
    DATE_TRUNC('month', month)                  AS month,
    SUM(volume_usd)                             AS volume_usd,
    SUM(tx_count)                               AS tx_count,
    SUM(active_users)                           AS active_users,
    SUM(new_users)                              AS new_users
FROM datamart.core.stats_monthly
WHERE data_source = 'lifi'
  AND month >= DATEADD('month', -6, DATE_TRUNC('month', CURRENT_DATE))
GROUP BY 1
ORDER BY 1
;


-- -----------------------------------------------------------------------------
-- [3] top_chains
-- Most active sending + receiving chains last 30 days by volume
-- -----------------------------------------------------------------------------
SELECT
    sending_chain_name,
    receiving_chain_name,
    SUM(volume_usd)     AS volume_usd,
    SUM(tx_count)       AS tx_count
FROM datamart.core.stats_chain_token
WHERE date >= CURRENT_DATE - 30
  AND is_same_chain = FALSE
GROUP BY 1, 2
ORDER BY volume_usd DESC
LIMIT 10
;


-- -----------------------------------------------------------------------------
-- [4] top_tokens
-- Most bridged token pairs last 30 days
-- -----------------------------------------------------------------------------
SELECT
    token_route,
    SUM(volume_usd)     AS volume_usd,
    SUM(tx_count)       AS tx_count
FROM datamart.core.stats_chain_token
WHERE date >= CURRENT_DATE - 30
GROUP BY 1
ORDER BY volume_usd DESC
LIMIT 10
;


-- -----------------------------------------------------------------------------
-- [5] revenue
-- Protocol revenue last 30 days vs prior 30 days
-- -----------------------------------------------------------------------------
SELECT
    SUM(CASE WHEN date >= CURRENT_DATE - 30 THEN lifi_revenue ELSE 0 END)             AS lifi_revenue_30d,
    SUM(CASE WHEN date >= CURRENT_DATE - 30 THEN integrator_fees ELSE 0 END)          AS integrator_fees_30d,
    SUM(CASE WHEN date >= CURRENT_DATE - 60
              AND date <  CURRENT_DATE - 30 THEN lifi_revenue ELSE 0 END)             AS lifi_revenue_prior_30d,
    SUM(lifi_revenue)                                                                  AS lifi_revenue_all_time
FROM datamart.core.stats_fees
;


-- -----------------------------------------------------------------------------
-- [6] top_integrators
-- Top 10 integrators by volume in the last 30 days
-- -----------------------------------------------------------------------------
SELECT
    integrator,
    total_volume_usd,
    tx_count,
    chain_count,
    tool_count,
    chains_used
FROM datamart.core.stats_integrators
ORDER BY total_volume_usd DESC
LIMIT 10
;


-- -----------------------------------------------------------------------------
-- [7] chain_count
-- How many unique chains are currently active (seen transfers last 30d)
-- -----------------------------------------------------------------------------
SELECT
    COUNT(DISTINCT sending_chain_name)                          AS active_sending_chains,
    COUNT(DISTINCT receiving_chain_name)                        AS active_receiving_chains,
    COUNT(DISTINCT COALESCE(sending_chain_name, receiving_chain_name)) AS total_unique_chains
FROM datamart.core.stats_chain_token
WHERE date >= CURRENT_DATE - 30
;


-- -----------------------------------------------------------------------------
-- [8] unique_wallets
-- Total unique wallets all-time and last 30 days
-- -----------------------------------------------------------------------------
SELECT
    COUNT(*)                                                    AS total_wallets_all_time,
    SUM(CASE WHEN first_used_date >= CURRENT_DATE - 30
             THEN 1 ELSE 0 END)                                 AS new_wallets_30d,
    AVG(total_volume_usd)                                       AS avg_wallet_volume_usd,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tx_count)       AS median_wallet_tx_count
FROM datamart.core.stats_wallets
;


-- -----------------------------------------------------------------------------
-- [9] quality_metrics
-- Slippage and success rates last 30 days
-- -----------------------------------------------------------------------------
SELECT
    AVG(avg_slippage_pct)                               AS avg_slippage_pct,
    AVG(median_slippage_pct)                            AS median_slippage_pct,
    SUM(positive_slippage_count)                        AS positive_slippage_total,
    SUM(tx_count)                                       AS total_tx,
    SUM(positive_slippage_count) * 1.0 / NULLIF(SUM(tx_count), 0)  AS positive_slippage_rate
FROM datamart.core.stats_slippage
WHERE date >= CURRENT_DATE - 30
;


-- -----------------------------------------------------------------------------
-- [10] cross_chain_vs_same_chain
-- Volume split: cross-chain bridges vs same-chain swaps last 30 days
-- -----------------------------------------------------------------------------
SELECT
    is_same_chain,
    SUM(volume_usd)     AS volume_usd,
    SUM(tx_count)       AS tx_count
FROM datamart.core.stats_lifi
WHERE date >= CURRENT_DATE - 30
GROUP BY 1
;


-- -----------------------------------------------------------------------------
-- [11] tool_breakdown
-- Top bridge/DEX tools by tx count last 30 days
-- -----------------------------------------------------------------------------
SELECT
    tool,
    SUM(volume_usd)     AS volume_usd,
    SUM(tx_count)       AS tx_count
FROM datamart.core.stats_lifi
WHERE date >= CURRENT_DATE - 30
  AND tool IS NOT NULL
  AND tool NOT IN ('feeCollection', 'wrapper', 'custom')   -- exclude utility tools
GROUP BY 1
ORDER BY tx_count DESC
LIMIT 10
;


-- -----------------------------------------------------------------------------
-- [12] jumper_vs_api
-- Jumper.exchange vs API/SDK split last 30 days
-- -----------------------------------------------------------------------------
SELECT
    is_jumper,
    SUM(volume_usd)     AS volume_usd,
    SUM(tx_count)       AS tx_count,
    COUNT(DISTINCT integrator) AS integrator_count
FROM datamart.core.stats_lifi
WHERE date >= CURRENT_DATE - 30
GROUP BY 1
;
