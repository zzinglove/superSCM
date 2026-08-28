-- 성능 결과에 실행 식별자를 두 이름으로 제공한다.
create or replace view analytics.v_model_performance as
select p.*, p.backtest_run_id as run_id
from core.model_performance p;
revoke all on function core.run_backtest(uuid) from public,anon;
grant execute on function core.run_backtest(uuid) to authenticated;
revoke all on function core.set_manual_champion(text,text,text) from public,anon;
grant execute on function core.set_manual_champion(text,text,text) to authenticated;
