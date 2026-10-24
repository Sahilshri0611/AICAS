"""
Suspect & incident network analysis.

Builds a graph of Suspect / Incident / Location nodes and the relationships
between them (same suspect, same vehicle, same location, similar MO), then
computes degree centrality, connected components and clusters with networkx.
"""

from __future__ import annotations

from collections import defaultdict

import networkx as nx
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.models.crime import Incident, Suspect
from app.models.enums import EdgeType, NodeType
from app.services.area_ref import area_name


class NetworkService:
    def __init__(self, db: Session):
        self.db = db

    def _load_incidents(self, limit: int) -> list[Incident]:
        # Prefer FIR/manual incidents (they carry suspects), then fill with recent seed.
        stmt = (
            select(Incident)
            .options(selectinload(Incident.suspects))
            .order_by(desc(Incident.source != "seed"), desc(Incident.occurred_at))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def build(self, limit: int = 250, similar_mo: bool = True) -> dict:
        incidents = self._load_incidents(limit)
        g = nx.Graph()

        by_vehicle: dict[str, list[str]] = defaultdict(list)
        by_area_type: dict[tuple, list[str]] = defaultdict(list)

        for inc in incidents:
            inc_node = f"I:{inc.crime_id}"
            g.add_node(
                inc_node,
                label=inc.crime_id,
                type=NodeType.INCIDENT.value,
                risk_level=inc.risk_level,
                meta={"crime_type": inc.primary_type, "date": inc.occurred_at.strftime("%Y-%m-%d")},
            )

            # Location node
            loc = area_name(inc.community_area)
            loc_node = f"L:{loc}"
            if not g.has_node(loc_node):
                g.add_node(loc_node, label=loc, type=NodeType.LOCATION.value, meta={})
            g.add_edge(inc_node, loc_node, type=EdgeType.SAME_LOCATION.value, weight=1.0)

            # Suspect nodes + edges
            for s in inc.suspects:
                s_node = f"S:{s.id}"
                if not g.has_node(s_node):
                    g.add_node(
                        s_node, label=s.name, type=NodeType.SUSPECT.value,
                        meta={"alias": s.alias, "vehicle": s.vehicle},
                    )
                g.add_edge(inc_node, s_node, type=EdgeType.SAME_SUSPECT.value, weight=2.0)
                if s.vehicle:
                    by_vehicle[s.vehicle.strip().lower()].append(s_node)

            by_area_type[(inc.community_area, inc.primary_type)].append(inc_node)

        # Same-vehicle edges between suspects sharing a vehicle
        for _v, nodes in by_vehicle.items():
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    g.add_edge(nodes[i], nodes[j], type=EdgeType.SAME_VEHICLE.value, weight=1.5)

        # Similar-MO edges: incidents of same type in same area
        if similar_mo:
            for (_key, nodes) in by_area_type.items():
                for i in range(len(nodes)):
                    for j in range(i + 1, min(i + 4, len(nodes))):  # cap fan-out
                        g.add_edge(nodes[i], nodes[j], type=EdgeType.SIMILAR_MO.value, weight=0.5)

        return self._serialize(g)

    def _serialize(self, g: nx.Graph) -> dict:
        if g.number_of_nodes() == 0:
            return {
                "nodes": [], "edges": [],
                "stats": {
                    "node_count": 0, "edge_count": 0, "component_count": 0,
                    "largest_component_size": 0, "isolated_nodes": 0,
                    "top_central_nodes": [],
                },
            }

        centrality = nx.degree_centrality(g)
        components = list(nx.connected_components(g))
        comp_index: dict[str, int] = {}
        for idx, comp in enumerate(components):
            for n in comp:
                comp_index[n] = idx

        nodes = []
        for n, data in g.nodes(data=True):
            nodes.append({
                "id": n,
                "label": data.get("label", n),
                "type": data.get("type"),
                "degree": g.degree(n),
                "centrality": round(centrality.get(n, 0.0), 4),
                "component": comp_index.get(n, 0),
                "risk_level": data.get("risk_level"),
                "meta": data.get("meta") or {},
            })

        edges = [
            {"source": u, "target": v, "type": d.get("type"), "weight": d.get("weight", 1.0)}
            for u, v, d in g.edges(data=True)
        ]

        largest = max((len(c) for c in components), default=0)
        isolated = sum(1 for n in g.nodes if g.degree(n) == 0)
        top_central = sorted(nodes, key=lambda x: x["centrality"], reverse=True)[:8]

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "node_count": g.number_of_nodes(),
                "edge_count": g.number_of_edges(),
                "component_count": len(components),
                "largest_component_size": largest,
                "isolated_nodes": isolated,
                "top_central_nodes": top_central,
            },
        }
