"""Aggregates all v1 endpoint routers under a single APIRouter."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    analytics,
    auth,
    crimes,
    fir_parser,
    incidents,
    models,
    network,
    reference,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(incidents.router)
api_router.include_router(crimes.router)
api_router.include_router(alerts.router)
api_router.include_router(analytics.router)
api_router.include_router(models.router)
api_router.include_router(fir_parser.router)
api_router.include_router(network.router)
api_router.include_router(reference.router)
