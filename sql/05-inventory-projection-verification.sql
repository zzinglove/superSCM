-- STEP 9 Inventory Projection / Risk 검증 쿼리
-- Supabase SQL Editor에서 migration 적용 후 실행한다.

-- 기본 객체와 행 수
select to_regclass('core.leadtime_plan_history') as leadtime_history,
       to_regclass('core.v_leadtime_effective') as effective_leadtime,
       to_regclass('analytics.v_inventory_projection') as inventory_projection,
       to_regclass('analytics.v_stockout_risk') as stockout_risk;
select risk_status, reason_code, count(*)
from analytics.v_stockout_risk
group by risk_status, reason_code
order by risk_status, reason_code;

-- CASE 1~3: 상태는 projection 결과의 최초 결품 기간과 Effective Lead Time으로 판정된다.
select item_id, min(stockout_period) as stockout_period, max(effective_lead_time) as effective_lead_time,
       max(risk_status) as risk_status
from analytics.v_inventory_projection
group by item_id;

-- CASE 4, 10, 11: 관리자 확정값 우선, P80 fallback, 리드타임 누락 사유
select supplier_id, planned_lead_time, p80_days, effective_lead_time, source, reason_code
from core.v_leadtime_effective
order by supplier_id;

-- CASE 5, 6: 재고·Forecast가 없으면 숫자 0/SAFE로 숨겨지지 않는다.
select item_id, period, beginning_inventory, forecast_demand, ending_projected_inventory,
       calculation_status, reason_code, risk_status
from analytics.v_inventory_projection
where reason_code in ('NO_INVENTORY_DATA', 'NO_FORECAST')
order by item_id, period;

-- CASE 7: Open PO는 예정 월에만 반영된다. 예정 월 외 receipt는 0이어야 한다.
select p.item_id, p.period, p.scheduled_receipt, po.scheduled_date
from analytics.v_inventory_projection p
join (
  select upper(regexp_replace("품목코드", '[\s\-_]', '', 'g')) as item_id,
         date_trunc('month', nullif("납기예정일", '')::date)::date as scheduled_date
  from raw.purchase_order
  where nullif("납기예정일", '') is not null
) po on po.item_id = p.item_id
where p.scheduled_receipt > 0
order by p.item_id, p.period;

-- CASE 8, 9: 확정수주와 Soft Allocation이 원천 월에 차감 항목으로 존재한다.
select item_id, period, confirmed_sales_order, soft_allocation, soft_allocation_state,
       beginning_inventory, ending_projected_inventory
from analytics.v_inventory_projection
where confirmed_sales_order > 0 or soft_allocation > 0
order by item_id, period;

-- Projection 공식 불변식: 유효 행은 beginning + receipt - SO - soft - forecast = ending
select count(*) as formula_violations
from analytics.v_inventory_projection
where calculation_status = 'SUCCESS'
  and ending_projected_inventory is distinct from
      beginning_inventory + scheduled_receipt - confirmed_sales_order - soft_allocation - forecast_demand;

-- 변경 이력 존재 여부
select count(*) as leadtime_history_rows from core.leadtime_plan_history;
