create schema if not exists core;
create schema if not exists analytics;
-- STEP 6 baseline forecast engine

alter table if exists core.forecast_setting add column if not exists forecast_horizon integer not null default 3;
do $$ begin
  if to_regclass('core.forecast_setting') is not null then
    alter table core.forecast_setting drop constraint if exists forecast_setting_horizon_positive;
    alter table core.forecast_setting add constraint forecast_setting_horizon_positive check (forecast_horizon > 0);
  end if;
end $$;

create table if not exists core.model_config (
  model_id text primary key, model_name text not null, family text not null,
  engine text not null check (engine in ('SQL','PYTHON')), version text not null,
  enabled boolean not null default true, is_default boolean not null default false,
  applicable_demand_type jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb, description text,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists core.model_version (
  version_id uuid primary key default gen_random_uuid(), run_id uuid,
  model_id text not null references core.model_config(model_id), version text not null,
  parameters jsonb not null, definition jsonb not null, created_at timestamptz not null default now(),
  created_by uuid references auth.users(id), unique(run_id, model_id)
);
create table if not exists core.forecast_run (
  run_id uuid primary key default gen_random_uuid(), status text not null check (status in ('RUNNING','SUCCESS','FAILED')),
  granularity text not null, train_start date, train_end date, horizon integer not null,
  champion_metric text, data_snapshot_at timestamptz not null default now(), models jsonb not null default '[]'::jsonb,
  n_models integer not null default 0, n_items integer not null default 0, n_rows integer not null default 0,
  started_at timestamptz not null default now(), finished_at timestamptz, duration_ms bigint,
  triggered_by uuid references auth.users(id), triggered_email text, note text, message text
);
create table if not exists core.forecast_result (
  run_id uuid not null references core.forecast_run(run_id) on delete restrict,
  model_id text not null references core.model_config(model_id), model_version_id uuid not null references core.model_version(version_id),
  model_version text not null, item_id text not null, period date not null,
  predicted_qty numeric, p50 numeric, p80 numeric, p90 numeric, sigma numeric, basis text not null, reason_code text,
  primary key(run_id,model_id,item_id,period), unique(model_version_id,item_id,period)
);
insert into core.model_config(model_id,model_name,family,engine,version,enabled,is_default,applicable_demand_type,parameters,description) values
 ('MA_3M','3개월 이동평균','BASELINE','SQL','1.0.0',true,true,'["SMOOTH","INTERMITTENT","ERRATIC","LUMPY"]','{"window":3}'::jsonb,'직전 3개월 평균'),
 ('MA_6M','6개월 이동평균','BASELINE','SQL','1.0.0',true,false,'["SMOOTH","INTERMITTENT","ERRATIC","LUMPY"]','{"window":6}'::jsonb,'직전 6개월 평균'),
 ('WMA_3M','가중 이동평균','BASELINE','SQL','1.0.0',true,false,'["SMOOTH","INTERMITTENT","ERRATIC","LUMPY"]','{"window":3,"weights":[3,2,1]}'::jsonb,'최근순 3:2:1 가중 평균'),
 ('PY_SAME_MONTH','전년 동월','BASELINE','SQL','1.0.0',true,false,'["SMOOTH","INTERMITTENT","ERRATIC","LUMPY"]','{"lag_months":12}'::jsonb,'전년 동월 실제값'),
 ('SEASONAL_NAIVE','계절 나이브','BASELINE','SQL','1.0.0',true,false,'["SMOOTH","INTERMITTENT","ERRATIC","LUMPY"]','{"seasonal_period":12}'::jsonb,'12개월 계절 주기 이전값')
on conflict(model_id) do update set model_name=excluded.model_name,family=excluded.family,engine=excluded.engine,description=excluded.description;
create index if not exists model_version_run_idx on core.model_version(run_id,model_id);
create index if not exists forecast_result_run_idx on core.forecast_result(run_id,period);
create index if not exists forecast_result_item_idx on core.forecast_result(item_id,period);
create or replace function core.set_model_config_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists model_config_set_updated_at on core.model_config;
create trigger model_config_set_updated_at before update on core.model_config for each row execute function core.set_model_config_updated_at();

create or replace function core.baseline_point(p_model_id text,p_item_id text,p_period date,p_parameters jsonb)
returns numeric language plpgsql stable security definer set search_path=core,public as $$
declare q1 numeric; q2 numeric; q3 numeric; q4 numeric; q5 numeric; q6 numeric; window_size integer; lag_months integer;
begin
  if p_model_id in ('PY_SAME_MONTH','SEASONAL_NAIVE') then
    lag_months := coalesce((p_parameters->>case when p_model_id='PY_SAME_MONTH' then 'lag_months' else 'seasonal_period' end)::integer,12);
    select quantity into q1 from core.v_train_demand_month_grid where item_id=p_item_id and period=(p_period-make_interval(months=>lag_months))::date;
    return q1;
  elsif p_model_id='WMA_3M' then
    select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date) into q1,q2,q3 from core.v_train_demand_month_grid where item_id=p_item_id and period between (p_period-interval '3 months')::date and (p_period-interval '1 month')::date;
    if q1 is null or q2 is null or q3 is null then return null; end if;
    return (q1*coalesce((p_parameters->'weights'->>0)::numeric,3)+q2*coalesce((p_parameters->'weights'->>1)::numeric,2)+q3*coalesce((p_parameters->'weights'->>2)::numeric,1))/(coalesce((p_parameters->'weights'->>0)::numeric,3)+coalesce((p_parameters->'weights'->>1)::numeric,2)+coalesce((p_parameters->'weights'->>2)::numeric,1));
  else
    window_size := coalesce((p_parameters->>'window')::integer,case when p_model_id='MA_6M' then 6 else 3 end);
    if window_size=3 then
      select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date) into q1,q2,q3 from core.v_train_demand_month_grid where item_id=p_item_id and period between (p_period-interval '3 months')::date and (p_period-interval '1 month')::date;
      if q1 is null or q2 is null or q3 is null then return null; end if;
      return (q1+q2+q3)/3;
    end if;
    select max(quantity) filter(where period=(p_period-interval '1 month')::date),max(quantity) filter(where period=(p_period-interval '2 months')::date),max(quantity) filter(where period=(p_period-interval '3 months')::date),max(quantity) filter(where period=(p_period-interval '4 months')::date),max(quantity) filter(where period=(p_period-interval '5 months')::date),max(quantity) filter(where period=(p_period-interval '6 months')::date) into q1,q2,q3,q4,q5,q6 from core.v_train_demand_month_grid where item_id=p_item_id and period between (p_period-interval '6 months')::date and (p_period-interval '1 month')::date;
    if q1 is null or q2 is null or q3 is null or q4 is null or q5 is null or q6 is null then return null; end if;
    return (q1+q2+q3+q4+q5+q6)/6;
  end if;
end; $$;
revoke all on function core.baseline_point(text,text,date,jsonb) from public,anon,authenticated;

create or replace function core.run_baseline_forecast()
returns table(run_id uuid,status text,message text)
language plpgsql security definer set search_path=core,public as $$
declare setting core.forecast_setting%rowtype; current_run uuid; snapshot timestamptz:=now(); actor uuid:=auth.uid(); started timestamptz:=clock_timestamp();
begin
  if not core.is_admin() then raise exception 'forecast execution requires ADMIN' using errcode='42501'; end if;
  select * into setting from core.forecast_setting where setting_id='default';
  if setting.train_start is null or setting.train_end is null or setting.granularity<>'month' then raise exception 'monthly forecast setting is incomplete'; end if;
  insert into core.forecast_run(status,granularity,train_start,train_end,horizon,data_snapshot_at,triggered_by,triggered_email,started_at) values('RUNNING',setting.granularity,setting.train_start,setting.train_end,setting.forecast_horizon,snapshot,actor,(select email from auth.users where id=actor),started) returning forecast_run.run_id into current_run;
  insert into core.model_version(run_id,model_id,version,parameters,definition,created_by) select current_run,model_id,version,parameters,jsonb_build_object('model_id',model_id,'model_name',model_name,'family',family,'engine',engine,'applicable_demand_type',applicable_demand_type,'description',description),actor from core.model_config where enabled=true and engine='SQL';
  create temporary table tmp_forecast_models on commit drop as select mc.*,mv.version_id from core.model_config mc join core.model_version mv on mv.model_id=mc.model_id and mv.run_id=current_run where mc.enabled=true and mc.engine='SQL';
  create temporary table tmp_grid on commit drop as select * from core.v_train_demand_month_grid;
  create temporary table tmp_fit on commit drop as select g.item_id,g.period,m.model_id,g.quantity as actual,core.baseline_point(m.model_id,g.item_id,g.period,m.parameters) as fitted from tmp_grid g cross join tmp_forecast_models m where exists(select 1 from analytics.v_sku_demand_profile dp where dp.item_id=g.item_id and dp.demand_type is not null and m.applicable_demand_type ? dp.demand_type);
  create temporary table tmp_sigma on commit drop as select item_id,model_id,stddev_samp(actual-fitted) as sigma from tmp_fit where actual is not null and fitted is not null group by item_id,model_id;
  create temporary table tmp_future on commit drop as select i.item_id,(setting.train_end+make_interval(months=>x.n))::date as period,m.model_id,m.version_id,m.version,m.parameters from (select distinct item_id from tmp_grid) i cross join generate_series(1,setting.forecast_horizon) x(n) cross join tmp_forecast_models m where exists(select 1 from analytics.v_sku_demand_profile dp where dp.item_id=i.item_id and dp.demand_type is not null and m.applicable_demand_type ? dp.demand_type);
  insert into core.forecast_result(run_id,model_id,model_version_id,model_version,item_id,period,predicted_qty,p50,p80,p90,sigma,basis,reason_code) select current_run,f.model_id,f.version_id,f.version,f.item_id,f.period,p.point,p.point,p.point+0.8416*s.sigma,p.point+1.2816*s.sigma,s.sigma,'SQL_BASELINE',case when p.point is null then 'INSUFFICIENT_HISTORY' end from tmp_future f cross join lateral(select core.baseline_point(f.model_id,f.item_id,f.period,f.parameters) as point) p left join tmp_sigma s on s.item_id=f.item_id and s.model_id=f.model_id where p.point is not null;
  update core.forecast_run r set status='SUCCESS',models=(select coalesce(jsonb_agg(model_id order by model_id),'[]'::jsonb) from tmp_forecast_models),n_models=(select count(*) from tmp_forecast_models),n_items=(select count(distinct item_id) from core.forecast_result where forecast_result.run_id=current_run),n_rows=(select count(*) from core.forecast_result where forecast_result.run_id=current_run),finished_at=clock_timestamp(),duration_ms=(extract(epoch from(clock_timestamp()-started))*1000)::bigint,message='Baseline Forecast 완료' where r.run_id=current_run;
  return query select r.run_id,r.status,r.message from core.forecast_run r where r.run_id=current_run;
exception when others then
  if current_run is not null then update core.forecast_run set status='FAILED',finished_at=clock_timestamp(),duration_ms=(extract(epoch from(clock_timestamp()-started))*1000)::bigint,message=sqlerrm where forecast_run.run_id=current_run; return query select r.run_id,r.status,r.message from core.forecast_run r where r.run_id=current_run; else raise; end if;
end; $$;
revoke all on function core.run_baseline_forecast() from public,anon;
grant execute on function core.run_baseline_forecast() to authenticated;

create or replace view analytics.v_model_config as select model_id,model_name,family,engine,version,enabled,is_default,applicable_demand_type,parameters,description,updated_at,updated_by from core.model_config;
create or replace view analytics.v_forecast_run as select r.*,exists(select 1 from core.v_train_demand d where d.loaded_at>r.data_snapshot_at) as is_stale,u.email as executor_email from core.forecast_run r left join core.app_user u on u.user_id=r.triggered_by;
create or replace view analytics.v_forecast_result as select run_id,model_id,model_version_id,model_version,item_id,period,predicted_qty,p50,p80,p90,sigma,basis,reason_code from core.forecast_result;
create or replace view analytics.v_forecast_run_kpi as select run_id,count(*)::integer as n_rows,count(distinct item_id)::integer as n_items,count(distinct model_id)::integer as n_models,count(*) filter(where p50 is not null)::integer as n_p50,count(*) filter(where p80 is not null)::integer as n_p80,count(*) filter(where p90 is not null)::integer as n_p90 from core.forecast_result group by run_id;

alter table core.model_config enable row level security;
alter table core.model_version enable row level security;
alter table core.forecast_run enable row level security;
alter table core.forecast_result enable row level security;
revoke all on core.model_config,core.model_version,core.forecast_run,core.forecast_result from anon,authenticated;
grant usage on schema core,analytics to authenticated;
grant select,update on core.model_config to authenticated;
grant select on analytics.v_model_config,analytics.v_forecast_run,analytics.v_forecast_result,analytics.v_forecast_run_kpi to authenticated;
drop policy if exists model_config_select on core.model_config;
create policy model_config_select on core.model_config for select to authenticated using(true);
drop policy if exists model_config_admin_update on core.model_config;
create policy model_config_admin_update on core.model_config for update to authenticated using(core.is_admin()) with check(core.is_admin());
revoke all on analytics.v_model_config,analytics.v_forecast_run,analytics.v_forecast_result,analytics.v_forecast_run_kpi from anon;

-- 실행 row를 먼저 확정한 뒤 내부 블록만 예외 처리해 FAILED 이력을 보존한다.
create or replace function core.run_baseline_forecast()
returns table(run_id uuid,status text,message text)
language plpgsql security definer set search_path=core,public as $$
declare setting core.forecast_setting%rowtype; current_run uuid; snapshot timestamptz:=now(); actor uuid:=auth.uid(); started timestamptz:=clock_timestamp();
begin
  if not core.is_admin() then raise exception 'forecast execution requires ADMIN' using errcode='42501'; end if;
  select * into setting from core.forecast_setting where setting_id='default';
  if setting.train_start is null or setting.train_end is null or setting.granularity<>'month' then raise exception 'monthly forecast setting is incomplete'; end if;
  insert into core.forecast_run(status,granularity,train_start,train_end,horizon,data_snapshot_at,triggered_by,triggered_email,started_at) values('RUNNING',setting.granularity,setting.train_start,setting.train_end,setting.forecast_horizon,snapshot,actor,(select email from auth.users where id=actor),started) returning forecast_run.run_id into current_run;
  begin
    insert into core.model_version(run_id,model_id,version,parameters,definition,created_by) select current_run,model_id,version,parameters,jsonb_build_object('model_id',model_id,'model_name',model_name,'family',family,'engine',engine,'applicable_demand_type',applicable_demand_type,'description',description),actor from core.model_config where enabled=true and engine='SQL';
    create temporary table tmp_forecast_models on commit drop as select mc.*,mv.version_id from core.model_config mc join core.model_version mv on mv.model_id=mc.model_id and mv.run_id=current_run where mc.enabled=true and mc.engine='SQL';
    create temporary table tmp_grid on commit drop as select * from core.v_train_demand_month_grid;
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
