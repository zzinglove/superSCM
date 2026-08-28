-- STEP 6 Forecast Engine 검증 쿼리
select model_id,engine,version,enabled,applicable_demand_type,parameters from analytics.v_model_config order by model_id;
select run_id,status,n_models,n_items,n_rows,data_snapshot_at,is_stale,message from analytics.v_forecast_run order by started_at desc;
select run_id,model_id,item_id,period,predicted_qty,p50,p80,p90,sigma,reason_code from analytics.v_forecast_result order by period,item_id,model_id limit 100;
select * from analytics.v_forecast_run_kpi order by run_id;
select model_id,parameters from analytics.v_model_config where model_id='WMA_3M';
select count(*) as invalid_interval_rows from analytics.v_forecast_result where (sigma is null and (p80 is not null or p90 is not null)) or (predicted_qty is null and p50 is not null);
select count(*) as result_without_version from analytics.v_forecast_result where model_version_id is null or model_version is null;
select fr.run_id,fr.model_id,fr.model_version,mv.version,mv.parameters from core.forecast_result fr join core.model_version mv on mv.version_id=fr.model_version_id;
select run_id,data_snapshot_at,is_stale from analytics.v_forecast_run where is_stale=true;
select routine_schema,routine_name,routine_definition from information_schema.routines where routine_schema='core' and routine_name in ('baseline_point','run_baseline_forecast');
