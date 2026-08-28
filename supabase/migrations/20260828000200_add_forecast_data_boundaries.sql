create schema if not exists raw;
create schema if not exists core;
create schema if not exists analytics;

-- 기존 raw 적재 테이블은 삭제하지 않고 공통 적재 메타데이터만 확장한다.
do $$
declare table_name text;
begin
  foreach table_name in ARRAY ARRAY['shipment_log','usage_history','supplier_master','item_master','inventory','purchase_order','goods_receipt','forecast'] loop
    if to_regclass(format('raw.%I', table_name)) is not null then
      execute format('alter table raw.%I add column if not exists batch_id uuid', table_name);
      execute format('alter table raw.%I add column if not exists source_type text', table_name);
      execute format('alter table raw.%I add column if not exists loaded_at timestamptz default now()', table_name);
      execute format('alter table raw.%I add column if not exists source_record_id text', table_name);
    end if;
  end loop;
end;
$$;

create table if not exists raw.business_event (
  event_id text primary key, event_type text not null, event_date date, item_id text,
  quantity numeric, customer_id text, note text, batch_id uuid, source_type text,
  loaded_at timestamptz default now(), source_record_id text
);

create table if not exists raw.sales_order (
  sales_order_id text primary key, order_date date, item_id text, quantity numeric,
  customer_id text, requested_date date, status text, unit_price numeric, currency text,
  batch_id uuid, source_type text, loaded_at timestamptz default now(), source_record_id text
);

create table if not exists raw.item_substitute (
  item_id text not null, substitute_item_id text not null, substitution_ratio numeric not null default 1,
  priority integer, valid_from date, valid_to date, batch_id uuid, source_type text,
  loaded_at timestamptz default now(), source_record_id text,
  primary key (item_id, substitute_item_id)
);

create table if not exists core.policy_config (
  config_key text primary key, service_level numeric, review_period_days integer,
  safety_buffer_days integer, config_value jsonb not null default '{}'::jsonb,
  description text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists core.outlier_rule (
  rule_id text primary key, rule_name text not null, rule_type text not null,
  threshold numeric, exclude_project_demand boolean not null default false,
  exclude_returns boolean not null default false, exclude_duplicates boolean not null default false,
  active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.item_policy (
  item_id text primary key, moq numeric, pack_size numeric, item_grade text,
  service_level numeric, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists core.forecast_setting (
  setting_id text primary key default 'default', train_start date, train_end date,
  test_start date, test_end date, granularity text not null default 'day',
  updated_by uuid references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forecast_setting_singleton check (setting_id = 'default'),
  constraint forecast_setting_train_order check (train_start is null or train_end is null or train_start <= train_end),
  constraint forecast_setting_test_order check (test_start is null or test_end is null or test_start <= test_end)
);

insert into core.forecast_setting(setting_id) values ('default') on conflict (setting_id) do nothing;
create index if not exists business_event_item_date_idx on raw.business_event(item_id, event_date);
create index if not exists sales_order_item_date_idx on raw.sales_order(item_id, order_date);
create index if not exists item_substitute_substitute_idx on raw.item_substitute(substitute_item_id);
create index if not exists usage_history_use_date_idx on raw.usage_history(use_date);

create or replace function core.set_forecast_data_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

do $$
declare table_name text;
begin
  foreach table_name in ARRAY ARRAY['policy_config','outlier_rule','item_policy','forecast_setting'] loop
    execute format('drop trigger if exists %I on core.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on core.%I for each row execute function core.set_forecast_data_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

create or replace view core.v_train_demand as
select u.usage_id, u.item_id, u.use_date, u.qty, u.warehouse, u.note, u.batch_id, u.source_type, u.loaded_at, u.source_record_id
from raw.usage_history u cross join core.forecast_setting s
where s.setting_id = 'default' and s.train_start is not null and s.train_end is not null
  and u.use_date between s.train_start and s.train_end;

create or replace view core.v_test_actual as
select u.usage_id, u.item_id, u.use_date, u.qty, u.warehouse, u.note, u.batch_id, u.source_type, u.loaded_at, u.source_record_id
from raw.usage_history u cross join core.forecast_setting s
where s.setting_id = 'default' and s.test_start is not null and s.test_end is not null
  and u.use_date between s.test_start and s.test_end;

-- Demand Profile이 raw를 직접 읽지 않도록 학습 전용 view를 사용한다.
create or replace view core.v_usage_effective as
with calc as (
  select upper(regexp_replace(v.item_id, '[\s\-_]', '', 'g')) as item_id,
         count(*) as valid_days, round(avg(v.qty), 2) as daily_usage_avg,
         round(stddev_samp(v.qty), 2) as daily_usage_sd
  from core.v_train_demand v
  where v.qty >= 0 and coalesce(v.note, '') not ilike '%프로젝트%'
  group by upper(regexp_replace(v.item_id, '[\s\-_]', '', 'g'))
)
select c.item_id, coalesce(p.valid_days, c.valid_days) as valid_days,
       coalesce(p.daily_usage_avg, c.daily_usage_avg) as daily_usage_avg,
       coalesce(p.daily_usage_sd, c.daily_usage_sd) as daily_usage_sd,
       round(coalesce(p.daily_usage_avg, c.daily_usage_avg), 2) as usage_used,
       round(coalesce(p.daily_usage_sd, c.daily_usage_sd) / nullif(coalesce(p.daily_usage_avg, c.daily_usage_avg), 0), 2) as cv,
       case when p.item_id is not null then '확정값' else '학습기간 정제 기준' end as source
from calc c left join core.usage_profile p on p.item_id = c.item_id;

create or replace view analytics.v_data_coverage as
with span as (select min(use_date) as data_start, max(use_date) as data_end, count(*) as total_rows from raw.usage_history),
counts as (
  select count(*) filter (where u.use_date between s.train_start and s.train_end) as train_row_count,
         count(*) filter (where u.use_date between s.test_start and s.test_end) as test_row_count
  from raw.usage_history u cross join core.forecast_setting s where s.setting_id = 'default'
)
select d.data_start, d.data_end, s.train_start, s.train_end, s.test_start, s.test_end, s.granularity,
       d.total_rows, c.train_row_count, c.test_row_count,
       (s.train_start is not null and s.train_end is not null and d.data_start <= s.train_start and d.data_end >= s.train_end) as train_window_ok,
       (s.test_start is not null and s.test_end is not null and d.data_start <= s.test_start and d.data_end >= s.test_end) as test_window_ok,
       (s.train_end is null or s.test_start is null or s.train_end < s.test_start) as split_order_ok
from span d cross join core.forecast_setting s cross join counts c where s.setting_id = 'default';

alter table raw.business_event enable row level security;
alter table raw.sales_order enable row level security;
alter table raw.item_substitute enable row level security;
alter table core.policy_config enable row level security;
alter table core.outlier_rule enable row level security;
alter table core.item_policy enable row level security;
alter table core.forecast_setting enable row level security;

-- raw 원본은 ADMIN만 조회·변경한다. USER는 통제된 core/analytics view만 사용한다.
do $$
declare table_name text;
begin
  foreach table_name in ARRAY ARRAY['shipment_log','usage_history','supplier_master','item_master','inventory','purchase_order','goods_receipt','forecast','business_event','sales_order','item_substitute'] loop
    if to_regclass(format('raw.%I', table_name)) is not null then
      execute format('alter table raw.%I enable row level security', table_name);
      execute format('revoke all on raw.%I from anon', table_name);
      execute format('grant select, insert, update, delete on raw.%I to authenticated', table_name);
      execute format('drop policy if exists %I on raw.%I', 'raw_' || table_name || '_admin', table_name);
      execute format('create policy %I on raw.%I for all to authenticated using (core.is_admin()) with check (core.is_admin())', 'raw_' || table_name || '_admin', table_name);
    end if;
  end loop;
end;
$$;
do $$
declare table_name text;
begin
  foreach table_name in ARRAY ARRAY['policy_config','outlier_rule','item_policy','forecast_setting'] loop
    execute format('revoke all on core.%I from anon', table_name);
    execute format('grant select, insert, update, delete on core.%I to authenticated', table_name);
    execute format('drop policy if exists %I on core.%I', 'core_' || table_name || '_select', table_name);
    execute format('create policy %I on core.%I for select to authenticated using (true)', 'core_' || table_name || '_select', table_name);
    execute format('drop policy if exists %I on core.%I', 'core_' || table_name || '_admin_write', table_name);
    execute format('create policy %I on core.%I for all to authenticated using (core.is_admin()) with check (core.is_admin())', 'core_' || table_name || '_admin_write', table_name);
  end loop;
end;
$$;

grant select on core.v_train_demand, core.v_test_actual to authenticated;
grant select on analytics.v_data_coverage to authenticated;
revoke all on core.v_train_demand, core.v_test_actual, analytics.v_data_coverage from anon;
