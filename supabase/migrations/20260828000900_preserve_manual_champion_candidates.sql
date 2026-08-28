-- 수동 Champion도 최신 Backtest의 전체 후보 성능을 함께 보존한다.
create or replace function core.set_manual_champion(p_item_id text,p_model_id text,p_reason text)
returns table(champion_id bigint,status text)
language plpgsql security definer set search_path=core,public as $function$
declare actor uuid:=auth.uid(); p core.model_performance%rowtype; cid bigint; candidates jsonb;
begin
  if not core.is_admin() then raise exception 'manual champion requires ADMIN' using errcode='42501'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'manual champion reason is required'; end if;
  select * into p from core.model_performance where item_id=p_item_id and model_id=p_model_id and calculation_status='SUCCESS' order by calculated_at desc limit 1;
  if p.performance_id is null then raise exception 'no valid performance found for item/model'; end if;
  select jsonb_agg(jsonb_build_object('model_id',x.model_id,'model_version',x.model_version,'wape',x.wape,'mape',x.mape,'bias',x.bias,'rmse',x.rmse,'mae',x.mae,'rank',x.rank,'calculation_status',x.calculation_status,'reason_code',x.reason_code) order by x.rank nulls last,x.model_id) into candidates
  from core.model_performance x where x.backtest_run_id=p.backtest_run_id and x.item_id=p_item_id;
  insert into core.champion_model(item_id,champion_model_id,model_version,champion_metric,champion_metric_value,wape,mape,bias,rmse,candidate_performance,selection_reason,selection_method,reason_code,selected_by)
    select p.item_id,p.model_id,p.model_version,s.champion_metric,case when s.champion_metric='WAPE' then p.wape when s.champion_metric='MAPE' then p.mape when s.champion_metric='RMSE' then p.rmse when s.champion_metric='MAE' then p.mae when s.champion_metric='ABS_BIAS' then abs(p.bias) end,p.wape,p.mape,p.bias,p.rmse,coalesce(candidates,'[]'::jsonb),p_reason,'MANUAL',null,actor from core.forecast_setting s returning champion_model.champion_id into cid;
  insert into core.audit_log(actor,action,target_type,target_id,before,after) values(actor,'CHAMPION_MANUALLY_CHANGED','champion_model',p_item_id,jsonb_build_object('model_id',(select champion_model_id from core.champion_model where item_id=p_item_id and champion_id<>cid order by selected_at desc limit 1)),jsonb_build_object('model_id',p_model_id,'reason',p_reason,'champion_id',cid));
  return query select cid,'SUCCESS'::text;
end; $function$;
revoke all on function core.set_manual_champion(text,text,text) from public,anon;
grant execute on function core.set_manual_champion(text,text,text) to authenticated;
