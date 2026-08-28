create schema if not exists analytics;

create or replace view core.v_train_demand_month_grid as
with setting as (
  select date_trunc('month', train_start)::date as train_start_month,
         date_trunc('month', train_end)::date as train_end_month
  from core.forecast_setting
  where setting_id = 'default'
),
months as (
  select generate_series(train_start_month, train_end_month, interval '1 month')::date as period
  from setting
  where train_start_month is not null and train_end_month is not null
),
items as (
  select distinct upper(regexp_replace(item_id, '[\s\-_]', '', 'g')) as item_id
  from core.v_train_demand
  where item_id is not null
  union
  select distinct upper(regexp_replace(item_id, '[\s\-_]', '', 'g')) as item_id
  from core.v_item_master
  where item_id is not null
),
actuals as (
  select upper(regexp_replace(item_id, '[\s\-_]', '', 'g')) as item_id,
         date_trunc('month', use_date)::date as period,
         count(*) as record_count,
         count(qty) as nonnull_quantity_count,
         sum(qty) as quantity_sum
  from core.v_train_demand
  where item_id is not null and use_date is not null
  group by 1, 2
)
select i.item_id, m.period,
       case
         when a.record_count is null then 0::numeric
         when a.nonnull_quantity_count = 0 then null::numeric
         else a.quantity_sum
       end as quantity,
       case
         when a.record_count is null then 'NO_RECORD'
         when a.nonnull_quantity_count = 0 then 'SOURCE_NULL'
         else 'OBSERVED'
       end as quantity_state
from items i cross join months m
left join actuals a on a.item_id = i.item_id and a.period = m.period;

create or replace view analytics.v_sku_demand_profile as
with grid as (
  select g.*, row_number() over (partition by g.item_id order by g.period) - 1 as period_index
  from core.v_train_demand_month_grid g
),
bounds as (
  select item_id, count(*)::integer as n_periods, max(period) as last_period
  from grid group by item_id
),
stats as (
  select item_id,
         count(*)::integer as n_periods,
         count(*) filter (where quantity > 0)::integer as n_nonzero_periods,
         count(*) filter (where quantity = 0)::integer as n_zero_periods,
         count(*) filter (where quantity is null)::integer as n_source_null_periods,
         avg(quantity) filter (where quantity > 0) as nonzero_mean,
         stddev_samp(quantity) filter (where quantity > 0) as nonzero_sd,
         regr_slope(quantity::numeric, period_index::numeric) as trend_per_period
  from grid group by item_id
),
recent as (
  select g.item_id,
         avg(g.quantity) filter (where g.period > b.last_period - interval '3 months') as recent_mean,
         avg(g.quantity) filter (where g.period > b.last_period - interval '6 months' and g.period <= b.last_period - interval '3 months') as prior_mean
  from grid g join bounds b on b.item_id = g.item_id
  group by g.item_id
),
peaks as (
  select distinct on (item_id) item_id, period as peak_period
  from grid
  where quantity > 0
  order by item_id, quantity desc, period asc
),
calendar_means as (
  select item_id, extract(month from period)::integer as month_number, avg(quantity) as month_mean
  from grid where quantity is not null
  group by item_id, extract(month from period)
),
seasonality as (
  select item_id, max(month_mean) - min(month_mean) as month_mean_range,
         count(*)::integer as observed_calendar_months
  from calendar_means group by item_id
),
calculated as (
  select s.item_id, s.n_periods, s.n_nonzero_periods,
         case when s.n_nonzero_periods > 0 then s.n_periods::numeric / s.n_nonzero_periods else null end as adi,
         case when s.n_nonzero_periods >= 2 and s.nonzero_mean > 0 then s.nonzero_sd / s.nonzero_mean else null end as cv,
         case when s.n_nonzero_periods >= 2 and s.nonzero_mean > 0 then power(s.nonzero_sd / s.nonzero_mean, 2) else null end as cv_squared,
         case when s.n_periods > 0 then s.n_zero_periods::numeric / s.n_periods else null end as zero_demand_rate,
         s.trend_per_period as trend,
         case when r.prior_mean is not null and r.prior_mean <> 0 then (r.recent_mean - r.prior_mean) / abs(r.prior_mean) else null end as recent_change_rate,
         p.peak_period,
         case when s.n_periods >= 24 and coalesce(se.observed_calendar_months, 0) >= 12 then se.month_mean_range > 0 else null end as seasonality,
         s.n_source_null_periods
  from stats s left join recent r using (item_id) left join peaks p using (item_id) left join seasonality se using (item_id)
)
select c.item_id,
       im.item_name,
       c.n_periods,
       c.n_nonzero_periods,
       c.adi,
       c.cv,
       c.cv_squared,
       c.zero_demand_rate,
       c.trend,
       c.recent_change_rate,
       c.peak_period,
       case
         when c.adi is null or c.cv_squared is null then null
         when c.adi < 1.32 and c.cv_squared < 0.49 then 'SMOOTH'
         when c.adi >= 1.32 and c.cv_squared < 0.49 then 'INTERMITTENT'
         when c.adi < 1.32 and c.cv_squared >= 0.49 then 'ERRATIC'
         when c.adi >= 1.32 and c.cv_squared >= 0.49 then 'LUMPY'
       end as demand_type,
       c.seasonality,
       case
         when c.n_nonzero_periods = 0 then 'NO_DEMAND'
         when c.n_nonzero_periods < 2 then 'INSUFFICIENT_NONZERO_PERIODS'
         when c.n_periods < 24 then 'INSUFFICIENT_PERIODS'
         when c.recent_change_rate is null then 'INSUFFICIENT_RECENT_PERIODS'
         else null
       end as reason_code,
       case
         when c.cv_squared is null then null
         when c.cv_squared < 0.49 then 'STABLE'
         else 'VARIABLE'
       end as stability
from calculated c
left join core.v_item_master im on im.item_id = c.item_id;

create or replace view analytics.v_demand_profile_kpi as
select count(*)::integer as total_items,
       count(*) filter (where demand_type = 'SMOOTH')::integer as n_smooth,
       count(*) filter (where demand_type = 'INTERMITTENT')::integer as n_intermittent,
       count(*) filter (where demand_type = 'ERRATIC')::integer as n_erratic,
       count(*) filter (where demand_type = 'LUMPY')::integer as n_lumpy,
       count(*) filter (where demand_type in ('INTERMITTENT','LUMPY'))::integer as n_croston_needed,
       count(*) filter (where demand_type is null)::integer as n_calculation_unavailable
from analytics.v_sku_demand_profile;

grant select on core.v_train_demand_month_grid to authenticated;
grant select on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi to authenticated;
revoke all on core.v_train_demand_month_grid, analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi from anon;
