-- STEP 6 성능 보정: 실행 중 materialized temp grid를 재사용한다.
create or replace function core.baseline_point(p_model_id text,p_item_id text,p_period date,p_parameters jsonb)
returns numeric language plpgsql stable security definer set search_path=core,public as $$
declare q1 numeric; q2 numeric; q3 numeric; q4 numeric; q5 numeric; q6 numeric; window_size integer; lag_months integer;
begin
  if p_model_id in ('PY_SAME_MONTH','SEASONAL_NAIVE') then
    lag_months := coalesce((p_parameters->>case when p_model_id='PY_SAME_MONTH' then 'lag_months' else 'seasonal_period' end)::integer,12);
    select quantity into q1 from pg_temp.tmp_grid where item_id=p_item_id and period=(p_period-make_interval(months=>lag_months))::date;
    return q1;
  elsif p_model_id='WMA_3M' then
    select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date) into q1,q2,q3 from pg_temp.tmp_grid where item_id=p_item_id and period between (p_period-interval '3 months')::date and (p_period-interval '1 month')::date;
    if q1 is null or q2 is null or q3 is null then return null; end if;
    return (q1*coalesce((p_parameters->'weights'->>0)::numeric,3)+q2*coalesce((p_parameters->'weights'->>1)::numeric,2)+q3*coalesce((p_parameters->'weights'->>2)::numeric,1))/(coalesce((p_parameters->'weights'->>0)::numeric,3)+coalesce((p_parameters->'weights'->>1)::numeric,2)+coalesce((p_parameters->'weights'->>2)::numeric,1));
  else
    window_size := coalesce((p_parameters->>'window')::integer,case when p_model_id='MA_6M' then 6 else 3 end);
    if window_size=3 then
      select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date) into q1,q2,q3 from pg_temp.tmp_grid where item_id=p_item_id and period between (p_period-interval '3 months')::date and (p_period-interval '1 month')::date;
      if q1 is null or q2 is null or q3 is null then return null; end if;
      return (q1+q2+q3)/3;
    end if;
    select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date),max(quantity) filter(where period=(p_period-interval '4 months')::date),max(quantity) filter(where period=(p_period-interval '5 months')::date),max(quantity) filter(where period=(p_period-interval '6 months')::date) into q1,q2,q3,q4,q5,q6 from pg_temp.tmp_grid where item_id=p_item_id and period between (p_period-interval '6 months')::date and (p_period-interval '1 month')::date;
    if q1 is null or q2 is null or q3 is null or q4 is null or q5 is null or q6 is null then return null; end if;
    return (q1+q2+q3+q4+q5+q6)/6;
  end if;
end; $$;

create or replace function core.run_baseline_forecast()
returns table(run_id uuid,status text,message text)
language plpgsql security definer set search_path=core,public as $$
declare setting core.forecast_setting%rowtype; current_run uuid; snapshot timestamptz:=now(); actor uuid:=auth.uid(); started timestamptz:=clock_timestamp();
begin
  perform set_config('statement_timeout','120s',true);
  if not core.is_admin() then raise exception 'forecast execution requires ADMIN' using errcode='42501'; end if;
  select * into setting from core.forecast_setting where setting_id='default';
  if setting.train_start is null or setting.train_end is null or setting.granularity<>'month' then raise exception 'monthly forecast setting is incomplete'; end if;
  insert into core.forecast_run(status,granularity,train_start,train_end,horizon,data_snapshot_at,triggered_by,triggered_email,started_at) values('RUNNING',setting.granularity,setting.train_start,setting.train_end,setting.forecast_horizon,snapshot,actor,(select email from auth.users where id=actor),started) returning forecast_run.run_id into current_run;
  begin
    insert into core.model_version(run_id,model_id,version,parameters,definition,created_by) select current_run,model_id,version,parameters,jsonb_build_object('model_id',model_id,'model_name',model_name,'family',family,'engine',engine,'applicable_demand_type',applicable_demand_type,'description',description),actor from core.model_config where enabled=true and engine='SQL';
    create temporary table tmp_forecast_models on commit drop as select mc.*,mv.version_id from core.model_config mc join core.model_version mv on mv.model_id=mc.model_id and mv.run_id=current_run where mc.enabled=true and mc.engine='SQL';
    create temporary table tmp_grid on commit drop as select * from core.v_train_demand_month_grid;
    create index tmp_grid_item_period_idx on tmp_grid(item_id,period);
    analyze tmp_grid;
    create temporary table tmp_fit on commit drop as select g.item_id,g.period,m.model_id,g.quantity as actual,core.baseline_point(m.model_id,g.item_id,g.period,m.parameters) as fitted from tmp_grid g cross join tmp_forecast_models m where exists(select 1 from analytics.v_sku_demand_profile dp where dp.item_id=g.item_id and dp.demand_type is not null and m.applicable_demand_type ? dp.demand_type);
    create temporary table tmp_sigma on commit drop as select item_id,model_id,stddev_samp(actual-fitted) as sigma from tmp_fit where actual is not null and fitted is not null group by item_id,model_id;
    create temporary table tmp_future on commit drop as select i.item_id,(setting.train_end+make_interval(months=>x.n::integer))::date as period,m.model_id,m.version_id,m.version,m.parameters from (select distinct item_id from tmp_grid) i cross join generate_series(1,setting.forecast_horizon) x(n) cross join tmp_forecast_models m where exists(select 1 from analytics.v_sku_demand_profile dp where dp.item_id=i.item_id and dp.demand_type is not null and m.applicable_demand_type ? dp.demand_type);
    insert into core.forecast_result(run_id,model_id,model_version_id,model_version,item_id,period,predicted_qty,p50,p80,p90,sigma,basis,reason_code) select current_run,f.model_id,f.version_id,f.version,f.item_id,f.period,p.point,p.point,p.point+0.8416*s.sigma,p.point+1.2816*s.sigma,s.sigma,'SQL_BASELINE',null from tmp_future f cross join lateral(select core.baseline_point(f.model_id,f.item_id,f.period,f.parameters) as point) p left join tmp_sigma s on s.item_id=f.item_id and s.model_id=f.model_id where p.point is not null;
    update core.forecast_run r set status='SUCCESS',models=(select coalesce(jsonb_agg(model_id order by model_id),'[]'::jsonb) from tmp_forecast_models),n_models=(select count(*) from tmp_forecast_models),n_items=(select count(distinct item_id) from core.forecast_result where forecast_result.run_id=current_run),n_rows=(select count(*) from core.forecast_result where forecast_result.run_id=current_run),finished_at=clock_timestamp(),duration_ms=(extract(epoch from(clock_timestamp()-started))*1000)::bigint,message='Baseline Forecast 완료' where r.run_id=current_run;
  exception when others then
    update core.forecast_run set status='FAILED',finished_at=clock_timestamp(),duration_ms=(extract(epoch from(clock_timestamp()-started))*1000)::bigint,message=sqlerrm where forecast_run.run_id=current_run;
  end;
  return query select r.run_id,r.status,r.message from core.forecast_run r where r.run_id=current_run;
end; $$;
