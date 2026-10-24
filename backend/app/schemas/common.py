"""Common/shared Pydantic schemas."""

from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Generic paginated response envelope."""

    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class Message(BaseModel):
    message: str


class KeyValue(BaseModel):
    name: str
    value: float


class TimeSeriesPoint(BaseModel):
    label: str
    value: float


def build_page(items: list, total: int, page: int, page_size: int) -> dict:
    pages = (total + page_size - 1) // page_size if page_size else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
