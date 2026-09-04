from __future__ import annotations

import os
from typing import Any

import httpx


class RepositoryError(RuntimeError): pass


class SupabaseRepository:
    def __init__(self, url: str | None = None, service_key: str | None = None):
        self.url = (url or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.key = service_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key: raise RepositoryError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        self.headers = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": "application/json", "Prefer": "return=representation"}

    def _request(self, method: str, path: str, payload: Any = None, params: dict[str, str] | None = None) -> Any:
        try:
            response = httpx.request(method, f"{self.url}/rest/v1/{path}", headers=self.headers, json=payload, params=params, timeout=30)
            response.raise_for_status(); return response.json() if response.content else None
        except (httpx.HTTPError, ValueError) as exc: raise RepositoryError(str(exc)) from exc

    def create_forecast_run(self, row: dict[str, Any]) -> dict[str, Any]: return (self._request("POST", "core.forecast_run", row) or [row])[0]
    def create_model_version(self, row: dict[str, Any]) -> dict[str, Any]: return (self._request("POST", "core.model_version", row) or [row])[0]
    def insert_results(self, rows: list[dict[str, Any]]) -> None:
        if rows: self._request("POST", "core.forecast_result", rows)
    def update_forecast_run(self, run_id: str, row: dict[str, Any]) -> None:
        self._request("PATCH", "core.forecast_run", row, {"run_id": f"eq.{run_id}"})
    def fetch_train_grid(self) -> list[dict[str, Any]]:
        return self._request("GET", "core.v_train_demand_month_grid", params={"select": "item_id,period,quantity", "order": "item_id,period"}) or []
    def run_backtest(self, forecast_run_id: str) -> dict[str, Any]:
        result = self._request("POST", "rpc/run_backtest", {"p_forecast_run_id": forecast_run_id})
        return result[0] if isinstance(result, list) else result
