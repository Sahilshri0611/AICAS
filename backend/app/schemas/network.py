"""Suspect / incident network-graph schemas."""

from typing import Any, List, Optional
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str            # Suspect | Incident | Location | Vehicle
    degree: int = 0
    centrality: float = 0.0
    betweenness: float = 0.0
    component: int = 0
    risk_level: Optional[str] = None
    meta: Optional[dict] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str            # relationship type
    weight: float = 1.0


class NetworkStats(BaseModel):
    node_count: int
    edge_count: int
    component_count: int
    largest_component_size: int
    isolated_nodes: int
    top_central_nodes: List[GraphNode]
    kingpins: List[GraphNode] = []


class NetworkGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: NetworkStats


class SuspectDossier(BaseModel):
    suspect: dict
    total_incidents: int
    incidents: List[dict]
    associates: List[dict]


class PathResult(BaseModel):
    connected: bool
    path: List[dict] = []
    length: int = 0
