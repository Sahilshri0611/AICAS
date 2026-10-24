"""
Feature engineering for the ML pipeline.

Pulls incident rows out of the database into a pandas DataFrame and derives
the spatio-temporal features used by the hotspot classifier and the
volume/risk forecasters.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.repositories.incident_repo import IncidentRepository

_WEEKDAY_IDX = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6,
}


def load_frame(db: Session, limit: int = 50000) -> pd.DataFrame:
    """Load incidents into a DataFrame with engineered columns."""
    repo = IncidentRepository(db)
    rows = repo.all_for_ml(limit=limit)
    df = pd.DataFrame(
        rows,
        columns=[
            "primary_type", "community_area", "district", "latitude", "longitude",
            "hour", "day_of_week", "month", "occurred_at", "risk_score",
            "arrest", "domestic",
        ],
    )
    if df.empty:
        return df

    df["community_area"] = df["community_area"].fillna(0).astype(int)
    df["district"] = df["district"].fillna(0).astype(int)
    df["hour"] = df["hour"].fillna(12).astype(int)
    df["month"] = df["month"].fillna(1).astype(int)
    df["weekday"] = df["day_of_week"].map(_WEEKDAY_IDX).fillna(0).astype(int)
    df["is_weekend"] = df["weekday"].isin([5, 6]).astype(int)
    df["is_night"] = ((df["hour"] >= 22) | (df["hour"] <= 5)).astype(int)
    df["occurred_at"] = pd.to_datetime(df["occurred_at"])
    df["date"] = df["occurred_at"].dt.date
    df["arrest"] = df["arrest"].fillna(False).astype(int)
    df["domestic"] = df["domestic"].fillna(False).astype(int)
    return df


def hotspot_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Build the supervised dataset for hotspot classification.

    Each sample is an (area, weekday, hour-bucket) cell. The target is whether
    that cell's incident volume falls in the top quartile (a "hotspot").
    """
    df = df.copy()
    df["hour_bucket"] = (df["hour"] // 4)  # 0..5 four-hour blocks
    grouped = (
        df.groupby(["community_area", "weekday", "hour_bucket"])
        .agg(
            count=("risk_score", "size"),
            avg_risk=("risk_score", "mean"),
            night_ratio=("is_night", "mean"),
            weekend=("is_weekend", "max"),
        )
        .reset_index()
    )
    if grouped.empty:
        return grouped, pd.Series(dtype=int)

    threshold = grouped["count"].quantile(0.75)
    y = (grouped["count"] >= threshold).astype(int)
    x = grouped[
        ["community_area", "weekday", "hour_bucket", "avg_risk", "night_ratio", "weekend"]
    ]
    return x, y


def daily_series(df: pd.DataFrame) -> pd.Series:
    """Daily incident counts as a time-indexed series."""
    s = df.groupby("date").size()
    s.index = pd.to_datetime(s.index)
    return s.sort_index().asfreq("D", fill_value=0)


def area_risk_table(df: pd.DataFrame) -> pd.DataFrame:
    """Per-area aggregated risk statistics."""
    return (
        df.groupby("community_area")
        .agg(
            count=("risk_score", "size"),
            avg_risk=("risk_score", "mean"),
            recent_risk=("risk_score", lambda s: s.tail(50).mean()),
        )
        .reset_index()
    )
