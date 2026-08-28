# STEP 5 SKU Demand Profile Design

## Source boundary
Demand Profile reads only `core.v_train_demand`. It never reads `raw.usage_history` or `core.v_test_actual`. The train/test dates come from `core.forecast_setting`.

## Monthly grid
A month series spanning train_start through train_end is cross joined with SKU IDs from the train view and item master. Missing records are represented as zero-demand periods, while rows containing only null source quantities remain null and are flagged separately.

## Metrics
SQL calculates ADI, nonzero-period CV/CV², zero-demand rate, linear trend per month, recent three-month change, earliest peak month on ties, and seasonality. Seasonality is null with INSUFFICIENT_PERIODS until at least 24 train months exist. Demand type uses the exact Syntetos-Boylan-Croston thresholds.

## API and UI
A server read model queries analytics views. The protected route is /user/analysis/demand-profile, while /analysis/demand-profile redirects there. The UI filters persisted rows and uses shared Badge and EmptyValue components; it does not calculate metrics.

## STEP 6 contract
The output demand_type values are exactly SMOOTH, INTERMITTENT, ERRATIC, LUMPY. INTERMITTENT and LUMPY are the Croston candidates.
