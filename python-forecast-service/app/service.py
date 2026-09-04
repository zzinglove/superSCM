from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from .models import MODEL_REGISTRY
from .repository import SupabaseRepository


class ForecastService:
    def __init__(self, repository: SupabaseRepository): self.repository = repository

    def run(self, model_ids: list[str], train_rows: list[dict[str, Any]] | None, horizon: int, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if horizon <= 0 or horizon > 120: raise ValueError("horizon must be between 1 and 120")
        rows = train_rows if train_rows is not None else self.repository.fetch_train_grid()
        frame = pd.DataFrame(rows)
        required = {"item_id", "period", "quantity"}
        if not required.issubset(frame.columns): raise ValueError("train rows require item_id, period, quantity")
        unknown = [model_id for model_id in model_ids if model_id not in MODEL_REGISTRY]
        if unknown: raise ValueError(f"unknown model_id: {', '.join(unknown)}")
        run_id = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat(); params = params or {}
        self.repository.create_forecast_run({"run_id": run_id, "status": "RUNNING", "granularity": "month", "horizon": horizon, "data_snapshot_at": now, "started_at": now, "models": model_ids})
        try:
            result_rows = []
            for model_id in model_ids:
                model = MODEL_REGISTRY[model_id]; version = model.version
                self.repository.create_model_version({"run_id": run_id, "model_id": model_id, "version": version, "parameters": params.get(model_id, {}), "definition": {"model_id": model_id, "family": model.family, "engine": "PYTHON", "applicable_demand_type": list(model.applicable_demand_type)}})
                for item_id, group in frame.groupby("item_id"):
                    demand_type = str(group["demand_type"].iloc[0]) if "demand_type" in group and pd.notna(group["demand_type"].iloc[0]) else None
                    if demand_type and demand_type not in model.applicable_demand_type: continue
                    forecast = model.forecast(group, horizon, params.get(model_id, {}))
                    for row in forecast.to_dict("records"):
                        if row["period"] is None: continue
                        result_rows.append({"run_id": run_id, "model_id": model_id, "model_version": version, "item_id": str(item_id), "period": pd.Timestamp(row["period"]).date().isoformat(), "predicted_qty": row["predicted_qty"], "p50": row["p50"], "p80": row["p80"], "p90": row["p90"], "sigma": row["sigma"], "basis": "PYTHON_MODEL", "reason_code": row["reason_code"]})
            self.repository.insert_results(result_rows)
            self.repository.update_forecast_run(run_id, {"status": "SUCCESS", "finished_at": datetime.now(timezone.utc).isoformat(), "n_models": len(model_ids), "n_items": len(frame["item_id"].unique()), "n_rows": len(result_rows), "message": "Python Forecast 완료"})
            return {"run_id": run_id, "status": "SUCCESS", "n_rows": len(result_rows), "model_ids": model_ids}
        except Exception as exc:
            try: self.repository.update_forecast_run(run_id, {"status": "FAILED", "finished_at": datetime.now(timezone.utc).isoformat(), "message": str(exc)[:1000]})
            finally: raise
