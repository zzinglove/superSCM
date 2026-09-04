-- STEP 10 Safety Stock / Purchase Recommendation 검증 쿼리

select to_regclass('core.safety_stock_policy') as safety_policy,
       to_regclass('analytics.v_safety_stock') as safety_stock,
       to_regclass('analytics.v_purchase_recommendation') as recommendation;

-- CASE 1~3, 12: Forecast/확정수주 우선순위와 Safety Stock 변수
select item_id, forecast_qty, confirmed_order_qty, demand_basis_qty,
       forecast_error_sigma, leadtime_sigma, sigma_dlt, safety_stock,
       calculation_status, reason_code
from analytics.v_purchase_recommendation
order by item_id;

-- demand basis = max(Forecast, Confirmed Order)
select count(*) as demand_basis_violations
from analytics.v_purchase_recommendation
where calculation_status = 'SUCCESS'
  and demand_basis_qty is distinct from greatest(forecast_qty, confirmed_order_qty);

-- CASE 4~6: 발주 불필요, MOQ, Pack Size
select item_id, required_qty, moq, pack_size, recommended_qty, calculation_status, reason_code
from analytics.v_purchase_recommendation
where required_qty <= 0 or recommended_qty > 0
order by item_id;

-- CASE 7~8: 권고일 및 즉시/기한초과 플래그
select item_id, stockout_date, effective_leadtime, safety_buffer_days,
       recommended_order_date, is_immediate, is_overdue, order_timing_status
from analytics.v_purchase_recommendation
order by item_id;

-- CASE 9~11: 계산불가 사유
select item_id, calculation_status, reason_code, recommended_qty
from analytics.v_purchase_recommendation
where calculation_status = 'CALCULATION_UNAVAILABLE'
order by reason_code, item_id;

-- 계산 근거 재조회
select item_id, calculation_trace
from analytics.v_purchase_recommendation
where calculation_trace is not null
order by item_id;

-- MOQ 미만 추천 금지 및 Pack Size 배수
select count(*) as rounding_violations
from analytics.v_purchase_recommendation
where recommended_qty > 0
  and (recommended_qty < moq or mod(recommended_qty::numeric, pack_size) <> 0);
