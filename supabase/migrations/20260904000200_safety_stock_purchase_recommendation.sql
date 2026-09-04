-- STEP 10: Safety Stock와 Purchase Recommendation

create table if not exists core.safety_stock_policy (
  item_grade text primary key,
  service_level numeric not null check (service_level > 0 and service_level < 1),
  z_value numeric not null check (z_value > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create or replace function core.set_safety_stock_policy_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists safety_stock_policy_updated_at on core.safety_stock_policy;
create trigger safety_stock_policy_updated_at before update on core.safety_stock_policy
for each row execute function core.set_safety_stock_policy_updated_at();

drop view if exists analytics.v_purchase_recommendation;
drop view if exists analytics.v_safety_stock;

create or replace view analytics.v_safety_stock as
with chosen_forecast as (
  select distinct on (fr.item_id) fr.item_id, fr.run_id, fr.model_id, fr.model_version
  from core.forecast_result fr
  join core.forecast_run r on r.run_id = fr.run_id and r.status = 'SUCCESS'
  join analytics.v_champion_model cm on cm.item_id = fr.item_id and cm.champion_model_id = fr.model_id
  order by fr.item_id, r.started_at desc, fr.run_id desc
),
forecast_stats as (
  select cf.item_id, cf.run_id, cf.model_version,
         sum(fr.p50) as forecast_qty,
         avg(fr.p50 / nullif(extract(day from (date_trunc('month', fr.period) + interval '1 month - 1 day')), 0)) as demand_daily,
         avg(fr.sigma / nullif(sqrt(extract(day from (date_trunc('month', fr.period) + interval '1 month - 1 day'))), 0)) as forecast_error_sigma
  from chosen_forecast cf
  join core.forecast_result fr on fr.item_id = cf.item_id and fr.run_id = cf.run_id and fr.model_id = cf.model_id
  where fr.p50 is not null
  group by cf.item_id, cf.run_id, cf.model_version
),
projection_totals as (
  select p.item_id,
         max(p.item_name) as item_name,
         max(p.supplier_id) as supplier_id,
         (array_agg(p.beginning_inventory order by p.period))[1] as available_inventory,
         sum(coalesce(p.scheduled_receipt, 0)) as scheduled_receipt,
         sum(coalesce(p.confirmed_sales_order, 0)) as confirmed_order_qty,
         min(p.stockout_date) as stockout_date,
         (array_agg(p.risk_status order by p.period))[1] as risk_status
  from analytics.v_inventory_projection p
  group by p.item_id
),
leadtime as (
  select i.item_id, e.effective_lead_time, st.std_days as leadtime_sigma
  from core.v_item_master i
  left join core.v_leadtime_effective e on e.supplier_id = i.supplier_id
  left join core.v_leadtime_stat st on st.supplier_id = i.supplier_id
  where i.is_active = 'Y'
),
policies as (
  select i.item_id, ip.item_grade, ip.moq, ip.pack_size,
         sp.service_level, sp.z_value
  from core.v_item_master i
  left join core.item_policy ip on ip.item_id = i.item_id
  left join core.safety_stock_policy sp on sp.item_grade = ip.item_grade and sp.active = true
  where i.is_active = 'Y'
)
select pt.item_id,
       pt.item_name,
       pol.item_grade,
       fs.forecast_qty,
       pt.confirmed_order_qty,
       lt.effective_lead_time as leadtime_days,
       fs.demand_daily,
       fs.forecast_error_sigma,
       lt.leadtime_sigma,
       pol.service_level,
       pol.z_value,
       case when lt.effective_lead_time is null or fs.demand_daily is null or fs.forecast_error_sigma is null
                  or lt.leadtime_sigma is null or pol.service_level is null or pol.z_value is null then null
            else sqrt(lt.effective_lead_time * power(fs.forecast_error_sigma, 2)
                      + power(fs.demand_daily, 2) * power(lt.leadtime_sigma, 2)) end as sigma_dlt,
       case when lt.effective_lead_time is null or fs.demand_daily is null or fs.forecast_error_sigma is null
                  or lt.leadtime_sigma is null or pol.service_level is null or pol.z_value is null then null
            else pol.z_value * sqrt(lt.effective_lead_time * power(fs.forecast_error_sigma, 2)
                      + power(fs.demand_daily, 2) * power(lt.leadtime_sigma, 2)) end as safety_stock,
       pt.available_inventory,
       pt.scheduled_receipt,
       pt.stockout_date,
       pt.risk_status,
       fs.run_id as forecast_run_id,
       fs.model_version,
       case when fs.forecast_qty is null then 'CALCULATION_UNAVAILABLE'
            when fs.forecast_error_sigma is null then 'CALCULATION_UNAVAILABLE'
            when lt.effective_lead_time is null or lt.leadtime_sigma is null then 'CALCULATION_UNAVAILABLE'
            when pol.item_grade is null then 'CALCULATION_UNAVAILABLE'
            when pol.service_level is null or pol.z_value is null then 'CALCULATION_UNAVAILABLE'
            else 'SUCCESS' end as calculation_status,
       case when fs.forecast_qty is null then 'NO_FORECAST'
            when fs.forecast_error_sigma is null then 'INSUFFICIENT_FORECAST_ERROR'
            when lt.effective_lead_time is null then 'NO_LEADTIME'
            when lt.leadtime_sigma is null then 'INSUFFICIENT_LEADTIME_VARIABILITY'
            when pol.item_grade is null then 'NO_SERVICE_LEVEL'
            when pol.service_level is null or pol.z_value is null then 'NO_SERVICE_LEVEL'
            else null end as reason_code
from projection_totals pt
left join forecast_stats fs on fs.item_id = pt.item_id
left join leadtime lt on lt.item_id = pt.item_id
left join policies pol on pol.item_id = pt.item_id;

create or replace view analytics.v_purchase_recommendation as
with policy_buffer as (
  select max(safety_buffer_days)::numeric as safety_buffer_days
  from core.policy_config
  where active = true and config_key in ('PURCHASE_RECOMMENDATION', 'STOCKOUT_RISK')
),
base as (
  select s.*, s.risk_status as projection_risk_status,
         ip.item_id as item_policy_id, ip.moq, ip.pack_size, b.safety_buffer_days
  from analytics.v_safety_stock s
  left join core.item_policy ip on ip.item_id = s.item_id
  cross join policy_buffer b
),
calculated as (
  select b.*,
         greatest(b.forecast_qty, b.confirmed_order_qty) as demand_basis_qty,
         case when b.calculation_status = 'SUCCESS'
              then greatest(b.forecast_qty, b.confirmed_order_qty) + b.safety_stock
                   - b.available_inventory - b.scheduled_receipt end as required_qty
  from base b
),
rounded as (
  select c.*,
         case when c.required_qty is null then null
              when c.required_qty <= 0 then 0
              when c.moq is null or c.pack_size is null or c.moq <= 0 or c.pack_size <= 0 then null
              else ceil(greatest(c.required_qty, c.moq) / c.pack_size) * c.pack_size end as recommended_qty
  from calculated c
),
dated as (
  select r.*,
         case when r.required_qty is null or r.required_qty <= 0 then null
              when r.stockout_date is null or r.effective_lead_time is null or r.safety_buffer_days is null then null
              else (r.stockout_date - make_interval(days => (r.effective_lead_time + r.safety_buffer_days)::integer))::date end as recommended_order_date
  from rounded r
)
select d.item_id,
       d.item_name,
       d.item_grade,
       d.forecast_qty,
       d.confirmed_order_qty,
       d.demand_basis_qty,
       d.available_inventory,
       d.scheduled_receipt,
       d.safety_stock,
       d.effective_lead_time,
       d.stockout_date,
       d.safety_buffer_days,
       d.required_qty,
       d.moq,
       d.pack_size,
       case when d.calculation_status <> 'SUCCESS' or d.required_qty is null then null
            when d.required_qty > 0 and (d.moq is null or d.pack_size is null or d.moq <= 0 or d.pack_size <= 0) then null
            when d.required_qty > 0 and (d.stockout_date is null or d.safety_buffer_days is null) then null
            else d.recommended_qty end as recommended_qty,
       d.recommended_order_date,
       case when d.calculation_status <> 'SUCCESS' or d.required_qty is null
                  or (d.required_qty > 0 and (d.stockout_date is null or d.safety_buffer_days is null)) then 'CALCULATION_UNAVAILABLE'
            else coalesce(d.projection_risk_status, 'CALCULATION_UNAVAILABLE') end as risk_status,
       case when d.calculation_status <> 'SUCCESS' then 'CALCULATION_UNAVAILABLE'
            when d.required_qty <= 0 then 'SUCCESS'
            when d.recommended_qty is null then 'CALCULATION_UNAVAILABLE'
            else 'SUCCESS' end as calculation_status,
       case when d.calculation_status <> 'SUCCESS' then d.reason_code
            when d.required_qty is null and d.available_inventory is null then 'NO_INVENTORY_DATA'
            when d.required_qty <= 0 then 'NO_ORDER'
            when d.recommended_qty is null and (d.item_policy_id is null or d.moq is null or d.pack_size is null) then 'NO_ITEM_POLICY'
            when d.recommended_order_date is null and d.stockout_date is null then 'NO_STOCKOUT_DATE'
            when d.recommended_order_date is null and d.safety_buffer_days is null then 'NO_POLICY_CONFIG'
            else null end as reason_code,
       d.forecast_run_id,
       d.model_version,
       case when d.recommended_order_date is null then null else d.recommended_order_date <= current_date end as is_immediate,
       case when d.recommended_order_date is null then null else d.recommended_order_date < current_date end as is_overdue,
       case when d.required_qty <= 0 then 'NO_ORDER'
            when d.recommended_order_date is null then 'CALCULATION_UNAVAILABLE'
            when d.recommended_order_date < current_date then 'OVERDUE'
            when d.recommended_order_date = current_date then 'IMMEDIATE'
            else 'SCHEDULED' end as order_timing_status,
       jsonb_build_object(
         'forecast_qty', d.forecast_qty,
         'confirmed_order_qty', d.confirmed_order_qty,
         'demand_basis_qty', d.demand_basis_qty,
         'safety_stock', d.safety_stock,
         'available_inventory', d.available_inventory,
         'scheduled_receipt', d.scheduled_receipt,
         'required_qty', d.required_qty,
         'moq', d.moq,
         'pack_size', d.pack_size,
         'recommended_qty', case when d.calculation_status = 'SUCCESS' and d.required_qty is not null
                                      and (d.required_qty <= 0 or (d.stockout_date is not null and d.safety_buffer_days is not null)) then d.recommended_qty end,
         'leadtime_days', d.effective_lead_time,
         'safety_buffer_days', d.safety_buffer_days,
         'forecast_error_sigma', d.forecast_error_sigma,
         'leadtime_sigma', d.leadtime_sigma,
         'demand_daily', d.demand_daily,
         'sigma_dlt', d.sigma_dlt,
         'z_value', d.z_value,
         'service_level', d.service_level,
         'forecast_run_id', d.forecast_run_id,
         'model_version', d.model_version
       ) as calculation_trace
from dated d;

alter table core.safety_stock_policy enable row level security;
revoke all on core.safety_stock_policy from anon, authenticated;
grant select, insert, update on core.safety_stock_policy to authenticated;
drop policy if exists safety_stock_policy_select on core.safety_stock_policy;
create policy safety_stock_policy_select on core.safety_stock_policy for select to authenticated using (true);
drop policy if exists safety_stock_policy_admin_write on core.safety_stock_policy;
create policy safety_stock_policy_admin_write on core.safety_stock_policy for all to authenticated using (core.is_admin()) with check (core.is_admin());
grant select on analytics.v_safety_stock, analytics.v_purchase_recommendation to authenticated;
revoke all on analytics.v_safety_stock, analytics.v_purchase_recommendation from anon;
