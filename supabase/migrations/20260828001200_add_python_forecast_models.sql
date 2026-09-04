-- STEP 8: Python 모델은 기존 Forecast Result/Backtest 후보와 같은 registry를 사용한다.
insert into core.model_config(model_id,model_name,family,engine,version,enabled,is_default,applicable_demand_type,parameters,description) values
 ('PY_EXPONENTIAL_SMOOTHING','Exponential Smoothing','EXPONENTIAL_SMOOTHING','PYTHON','1.0.0',true,false,'["SMOOTH","ERRATIC","INTERMITTENT","LUMPY"]','{"alpha":0.3}'::jsonb,'Python 지수평활'),
 ('PY_HOLT','Holt','HOLT','PYTHON','1.0.0',true,false,'["SMOOTH","ERRATIC","INTERMITTENT","LUMPY"]','{"alpha":0.3,"beta":0.1}'::jsonb,'Python Holt 추세모델'),
 ('PY_HOLT_WINTERS','Holt-Winters','HOLT_WINTERS','PYTHON','1.0.0',true,false,'["SMOOTH","ERRATIC"]','{"seasonal_period":12}'::jsonb,'Python 계절·추세 모델'),
 ('PY_CROSTON','Croston','CROSTON','PYTHON','1.0.0',true,false,'["INTERMITTENT","LUMPY"]','{"alpha":0.1}'::jsonb,'간헐수요 Croston'),
 ('PY_SBA','SBA','SBA','PYTHON','1.0.0',true,false,'["INTERMITTENT","LUMPY"]','{"alpha":0.1,"bias_correction":0.1}'::jsonb,'간헐수요 SBA 보정'),
 ('PY_TSB','TSB','TSB','PYTHON','1.0.0',true,false,'["INTERMITTENT","LUMPY"]','{"alpha":0.1,"beta":0.1}'::jsonb,'간헐수요 TSB'),
 ('PY_SARIMA','SARIMA','SARIMA','PYTHON','1.0.0',false,false,'["SMOOTH","ERRATIC"]','{}'::jsonb,'statsmodels 선택 의존성'),
 ('PY_PROPHET','Prophet','PROPHET','PYTHON','1.0.0',false,false,'["SMOOTH","ERRATIC"]','{}'::jsonb,'Prophet 선택 의존성'),
 ('PY_XGBOOST','XGBoost','MACHINE_LEARNING','PYTHON','1.0.0',false,false,'["SMOOTH","ERRATIC","INTERMITTENT","LUMPY"]','{}'::jsonb,'XGBoost 선택 의존성'),
 ('PY_LIGHTGBM','LightGBM','MACHINE_LEARNING','PYTHON','1.0.0',false,false,'["SMOOTH","ERRATIC","INTERMITTENT","LUMPY"]','{}'::jsonb,'LightGBM 선택 의존성')
on conflict (model_id) do update set model_name=excluded.model_name,family=excluded.family,engine=excluded.engine,version=excluded.version,applicable_demand_type=excluded.applicable_demand_type,parameters=excluded.parameters,description=excluded.description;
