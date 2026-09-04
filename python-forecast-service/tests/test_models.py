import pandas as pd

from app.models import MODEL_REGISTRY


def train(values):
    return pd.DataFrame({"period": pd.date_range("2025-01-01", periods=len(values), freq="MS"), "quantity": values})


def test_all_models_follow_common_contract():
    frame = train([10, 0, 12, 0, 11, 0, 13, 0])
    for model in MODEL_REGISTRY.values():
        result = model.forecast(frame, 3, {})
        assert list(result.columns) == ["period", "predicted_qty", "p50", "p80", "p90", "sigma", "reason_code"]
        assert len(result) == 3


def test_croston_family_is_limited_to_intermittent_demand():
    for model_id in ("PY_CROSTON", "PY_SBA", "PY_TSB"):
        assert set(MODEL_REGISTRY[model_id].applicable_demand_type) == {"INTERMITTENT", "LUMPY"}


def test_empty_training_data_is_not_filled_with_fake_forecast():
    result = MODEL_REGISTRY["PY_CROSTON"].forecast(pd.DataFrame(columns=["period", "quantity"]), 2, {})
    assert result["predicted_qty"].isna().all()
    assert result["reason_code"].eq("NO_TRAIN_DATA").all()
