from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .base import ForecastModel


def _sigma(values: pd.Series) -> float:
    return float(values.std(ddof=1)) if len(values) > 1 else 0.0


class ExponentialSmoothingModel(ForecastModel):
    model_id, family = "PY_EXPONENTIAL_SMOOTHING", "EXPONENTIAL_SMOOTHING"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        y = self._series(train_df); alpha = float(params.get("alpha", 0.3)); level = float(y.iloc[0])
        for value in y.iloc[1:]: level = alpha * float(value) + (1 - alpha) * level
        return self._result(train_df, [level] * horizon, _sigma(y - level))


class HoltModel(ForecastModel):
    model_id, family = "PY_HOLT", "HOLT"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        y = self._series(train_df); alpha = float(params.get("alpha", 0.3)); beta = float(params.get("beta", 0.1))
        level, trend = float(y.iloc[0]), float(y.iloc[1] - y.iloc[0]) if len(y) > 1 else 0.0
        for value in y.iloc[1:]:
            old = level; level = alpha * float(value) + (1-alpha) * (level + trend); trend = beta * (level-old) + (1-beta) * trend
        return self._result(train_df, [level + (i+1)*trend for i in range(horizon)], _sigma(y.diff().dropna()))


class HoltWintersModel(ForecastModel):
    model_id, family = "PY_HOLT_WINTERS", "HOLT_WINTERS"

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        season = int(params.get("seasonal_period", 12)); y = self._series(train_df)
        try:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
            if len(y) >= season * 2: values = ExponentialSmoothing(y, trend="add", seasonal="add", seasonal_periods=season).fit(optimized=True).forecast(horizon).tolist()
            else: values = [float(y.mean())] * horizon
        except ImportError:
            values = [float(y.iloc[-season:].mean())] * horizon
        return self._result(train_df, values, _sigma(y))


class IntermittentModel(ForecastModel):
    def _croston(self, y: pd.Series, alpha: float) -> float:
        nonzero = [(i, float(v)) for i, v in enumerate(y) if v > 0]
        if not nonzero: return 0.0
        demand, interval = nonzero[0][1], float(nonzero[0][0] + 1); last = nonzero[0][0]
        for index, value in nonzero[1:]:
            gap = index - last
            demand = alpha * value + (1-alpha) * demand; interval = alpha * gap + (1-alpha) * interval; last = index
        return demand / max(interval, 1.0)

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        y = self._series(train_df); point = self._croston(y, float(params.get("alpha", 0.1)))
        return self._result(train_df, [point] * horizon, _sigma(y[y > 0]))


class CrostonModel(IntermittentModel):
    model_id, family = "PY_CROSTON", "CROSTON"
    applicable_demand_type = ("INTERMITTENT", "LUMPY")


class SBAModel(IntermittentModel):
    model_id, family = "PY_SBA", "SBA"
    applicable_demand_type = ("INTERMITTENT", "LUMPY")

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        result = super().forecast(train_df, horizon, params)
        result[["predicted_qty", "p50", "p80", "p90"]] *= (1 - float(params.get("bias_correction", 0.1)))
        return result


class TSBModel(IntermittentModel):
    model_id, family = "PY_TSB", "TSB"
    applicable_demand_type = ("INTERMITTENT", "LUMPY")

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        y = self._series(train_df); a = float(params.get("alpha", 0.1)); b = float(params.get("beta", 0.1)); prob = 1.0 if y.iloc[0] > 0 else 0.0; size = float(y[y > 0].iloc[0]) if (y > 0).any() else 0.0
        for value in y.iloc[1:]:
            occurrence = 1.0 if value > 0 else 0.0; prob = b * occurrence + (1-b) * prob
            if occurrence: size = a * float(value) + (1-a) * size
        return self._result(train_df, [prob * size] * horizon, _sigma(y[y > 0]))


class OptionalLibraryModel(ForecastModel):
    def __init__(self, model_id: str, family: str, package: str, applicable: tuple[str, ...] = ("SMOOTH", "ERRATIC", "INTERMITTENT", "LUMPY")):
        self.model_id, self.family, self.package, self.applicable_demand_type = model_id, family, package, applicable

    def forecast(self, train_df: pd.DataFrame, horizon: int, params: dict[str, Any]) -> pd.DataFrame:
        if train_df.empty or horizon <= 0: return self._empty(max(horizon, 0))
        try: __import__(self.package)
        except ImportError: return self._empty(horizon, f"OPTIONAL_DEPENDENCY_MISSING:{self.package}")
        # Adapters are deliberately isolated; production deployments can provide package-specific fitting here.
        return ExponentialSmoothingModel().forecast(train_df, horizon, params)
