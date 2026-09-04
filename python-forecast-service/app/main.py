from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .models import list_models
from .repository import RepositoryError, SupabaseRepository
from .service import ForecastService

app = FastAPI(title="STEP 8 Python Forecast Service", version="1.0.0")


class ForecastRequest(BaseModel):
    model_ids: list[str] = Field(min_length=1)
    horizon: int = Field(default=3, ge=1, le=120)
    params: dict[str, dict[str, Any]] = Field(default_factory=dict)
    train_rows: list[dict[str, Any]] | None = None


class BacktestRequest(BaseModel): forecast_run_id: str


def service() -> ForecastService:
    return ForecastService(SupabaseRepository())


@app.get("/health")
def health(): return {"status": "ok", "service": "python-forecast-service"}


@app.get("/models")
def models(): return {"models": list_models()}


@app.post("/forecast/run")
def forecast_run(request: ForecastRequest):
    try: return service().run(request.model_ids, request.train_rows, request.horizon, request.params)
    except (ValueError, RepositoryError) as exc: raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc: raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/backtest/run")
def backtest_run(request: BacktestRequest):
    try: return service().repository.run_backtest(request.forecast_run_id)
    except RepositoryError as exc: raise HTTPException(status_code=502, detail=str(exc)) from exc
