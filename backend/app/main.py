"""
CrimeSense AI — FastAPI application entry point.

Wires middleware, the versioned API router, and a health check. Business logic
lives in the service layer; this module only assembles the app.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
log = get_logger("crimesense")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Crime Intelligence & Predictive Analytics Platform",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME, "environment": settings.ENVIRONMENT}


@app.get("/", tags=["system"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@app.on_event("startup")
def on_startup():
    log.info("=" * 56)
    log.info("  CrimeSense AI API — %s", settings.ENVIRONMENT)
    log.info("  Docs: /docs   API: %s", settings.API_V1_PREFIX)
    log.info("=" * 56)
