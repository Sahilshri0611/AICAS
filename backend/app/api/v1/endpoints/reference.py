"""Reference data — Nagpur police stations / zones and the crime-head catalogue."""

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.services.area_ref import CITY_CENTER, CITY_NAME, ZONES, stations_payload
from app.services.crime_catalog import catalog_payload

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/geography")
def geography(_: User = Depends(get_current_user)):
    return {
        "city": CITY_NAME,
        "center": {"latitude": CITY_CENTER[0], "longitude": CITY_CENTER[1]},
        "zones": [{"id": z, "name": n} for z, n in ZONES.items()],
        "stations": stations_payload(),
    }


@router.get("/crime-heads")
def crime_heads(_: User = Depends(get_current_user)):
    return catalog_payload()
