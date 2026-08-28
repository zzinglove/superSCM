select backtest_run_id,forecast_run_id,status,metric,test_start,test_end from analytics.v_backtest_run order by started_at desc limit 10;
select model_id,item_id,n_periods,wape,mape,bias,rmse,mae,baseline_improvement,rank,calculation_status,reason_code from analytics.v_model_performance order by item_id,rank nulls last,model_id limit 100;
select item_id,champion_model_id,champion_metric,champion_metric_value,selection_method,selection_reason,candidate_performance from analytics.v_champion_model order by item_id;
select run_id,item_id,period,model_id,actual,p50,p80,p90,wape,mape,bias,rmse,mae,is_champion from analytics.v_model_comparison order by item_id,period,model_id limit 100;
select has_table_privilege('anon','core.model_performance','insert') as anon_can_insert_performance,
       has_function_privilege('authenticated','core.run_backtest(uuid)','execute') as authenticated_can_call_backtest;
