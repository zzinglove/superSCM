from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import pandas as pd


FORECAST_COLUMNS = ["period", "predicted_qty", "p50", "p80", "p90", "sigma", "reason_code"]


class ForecastModel(ABC):
    model_id: str
    version: str = "1.0.0"
    family: str
    engine: str = "PYTHON"
    applicable_demand_type: tuple[str, ...] = ("SMOOTH", "ERRATIC", "INTERMITTENT", "LUMPY")

    @abstractmethod
    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        """Return one row per future period using training data only."""

    def _empty(self, horizon: int, reason: str = "NO_TRAIN_DATA") -> pd.DataFrame:
        return pd.DataFrame({
            "period": [None] * horizon,
            "predicted_qty": [None] * horizon,
            "p50": [None] * horizon,
            "p80": [None] * horizon,
            "p90": [None] * horizon,
            "sigma": [None] * horizon,
            "reason_code": [reason] * horizon,
        }, columns=FORECAST_COLUMNS)

    @staticmethod
    def _periods(train_df: pd.DataFrame, horizon: int) -> list[pd.Timestamp]:
        last = pd.to_datetime(train_df["period"]).max()
        return list(pd.date_range(last + pd.offsets.MonthBegin(1), periods=horizon, freq="MS"))

    @staticmethod
    def _series(train_df: pd.DataFrame) -> pd.Series:
        frame = train_df.copy()
        frame["period"] = pd.to_datetime(frame["period"])
        frame["quantity"] = pd.to_numeric(frame["quantity"], errors="coerce")
        return frame.sort_values("period").set_index("period")["quantity"].fillna(0.0)

    def _result(self, train_df: pd.DataFrame, values: list[float], sigma: float = 0.0) -> pd.DataFrame:
        periods = self._periods(train_df, len(values))
        values = [max(0.0, float(v)) for v in values]
        return pd.DataFrame({
            "period": periods, "predicted_qty": values, "p50": values,
            "p80": [v + 0.8416 * sigma for v in values],
            "p90": [v + 1.2816 * sigma for v in values],
            "sigma": [sigma] * len(values), "reason_code": [None] * len(values),
        }, columns=FORECAST_COLUMNS)
