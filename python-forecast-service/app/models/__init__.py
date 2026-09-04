from .base import ForecastModel
from .simple import CrostonModel, ExponentialSmoothingModel, HoltModel, HoltWintersModel, OptionalLibraryModel, SBAModel, TSBModel

MODEL_REGISTRY = {m.model_id: m for m in [ExponentialSmoothingModel(), HoltModel(), HoltWintersModel(), CrostonModel(), SBAModel(), TSBModel(), OptionalLibraryModel("PY_SARIMA", "SARIMA", "statsmodels"), OptionalLibraryModel("PY_PROPHET", "PROPHET", "prophet"), OptionalLibraryModel("PY_XGBOOST", "MACHINE_LEARNING", "xgboost"), OptionalLibraryModel("PY_LIGHTGBM", "MACHINE_LEARNING", "lightgbm")]}

def list_models() -> list[dict]:
    return [{"model_id": m.model_id, "family": m.family, "engine": m.engine, "version": m.version, "applicable_demand_type": list(m.applicable_demand_type)} for m in MODEL_REGISTRY.values()]
