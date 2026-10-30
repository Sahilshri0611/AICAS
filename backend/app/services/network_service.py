"""
Suspect & incident network analysis — Palantir-style link intelligence.

Builds a graph of Suspect, Incident, Location, and Vehicle nodes and the
relationships between them (same suspect, same vehicle, same location, similar MO),
then computes degree and betweenness centrality (Kingpin detection),
connected components, clusters, suspect dossiers, and shortest-path links.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Optional

import networkx as nx
from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.models.crime import Incident, Suspect
from app.models.enums import EdgeType, NodeType
from app.services.area_ref import area_name


class NetworkService:
    def __init__(self, db: Session):
        self.db = db

    def _load_incidents(self, limit: int) -> list[Incident]:
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
                meta={
                    "crime_type": inc.primary_type,
                    "date": inc.occurred_at.strftime("%Y-%m-%d") if inc.occurred_at else "—",
                    "status": inc.status,
                    "area": area_name(inc.community_area),
                },
            )

            # Location node
            loc = area_name(inc.community_area)
            loc_node = f"L:{loc}"
            if not g.has_node(loc_node):
                g.add_node(loc_node, label=loc, type=NodeType.LOCATION.value, meta={"station": loc})
            g.add_edge(inc_node, loc_node, type=EdgeType.SAME_LOCATION.value, weight=1.0)

            # Suspect nodes + edges
            for s in inc.suspects:
                s_node = f"S:{s.id}"
                if not g.has_node(s_node):
                    g.add_node(
                        s_node,
                        label=s.name,
                        type=NodeType.SUSPECT.value,
                        meta={
                            "alias": s.alias,
                            "vehicle": s.vehicle,
                            "age": s.age,
                            "gender": s.gender,
                            "description": s.description,
                        },
                    )
                g.add_edge(inc_node, s_node, type=EdgeType.SAME_SUSPECT.value, weight=2.5)

                # Vehicle node + edge
                if s.vehicle:
                    v_clean = s.vehicle.strip()
                    v_node = f"V:{v_clean}"
                    if not g.has_node(v_node):
                        g.add_node(
                            v_node,
                            label=v_clean,
                            type="Vehicle",
                            meta={"plate": v_clean, "owner": s.name},
                        )
                    g.add_edge(s_node, v_node, type=EdgeType.SAME_VEHICLE.value, weight=2.0)
                    g.add_edge(inc_node, v_node, type=EdgeType.SAME_VEHICLE.value, weight=1.5)
                    by_vehicle[v_clean.lower()].append(s_node)

            by_area_type[(inc.community_area, inc.primary_type)].append(inc_node)

        # Same-vehicle edges between suspects sharing a vehicle
        for _v, nodes in by_vehicle.items():
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    g.add_edge(nodes[i], nodes[j], type=EdgeType.SAME_VEHICLE.value, weight=2.0)

        # Similar-MO edges: incidents of same type in same area
        if similar_mo:
            for (_key, nodes) in by_area_type.items():
                for i in range(len(nodes)):
                    for j in range(i + 1, min(i + 4, len(nodes))):
                        g.add_edge(nodes[i], nodes[j], type=EdgeType.SIMILAR_MO.value, weight=0.5)

        return self._serialize(g)

    def _serialize(self, g: nx.Graph) -> dict:
        if g.number_of_nodes() == 0:
            return {
                "nodes": [],
                "edges": [],
                "stats": {
                    "node_count": 0,
                    "edge_count": 0,
                    "component_count": 0,
                    "largest_component_size": 0,
                    "isolated_nodes": 0,
                    "top_central_nodes": [],
                    "kingpins": [],
                },
            }

        deg_centrality = nx.degree_centrality(g)

        # Compute betweenness centrality for Kingpin detection (capped for speed if large)
        if g.number_of_nodes() <= 350:
            betweenness = nx.betweenness_centrality(g)
        else:
            betweenness = nx.betweenness_centrality(g, k=min(60, g.number_of_nodes()))

        components = list(nx.connected_components(g))
        comp_index: dict[str, int] = {}
        for idx, comp in enumerate(components):
            for n in comp:
                comp_index[n] = idx

        nodes = []
        for n, data in g.nodes(data=True):
            deg = g.degree(n)
            cent = deg_centrality.get(n, 0.0)
            btw = betweenness.get(n, 0.0)
            nodes.append({
                "id": n,
                "label": data.get("label", n),
                "type": data.get("type"),
                "degree": deg,
                "centrality": round(cent, 4),
                "betweenness": round(btw, 4),
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
        suspect_nodes = [n for n in nodes if n["type"] == NodeType.SUSPECT.value]
        # Prioritize suspects so commanders see key persons of interest rather than static police stations
        if suspect_nodes:
            top_central = sorted(suspect_nodes, key=lambda x: (x.get("betweenness", 0), x.get("degree", 0)), reverse=True)[:10]
        else:
            top_central = sorted(nodes, key=lambda x: x["centrality"], reverse=True)[:10]

        # Kingpins: suspects with high betweenness centrality (brokers linking clusters)
        kingpins = sorted(suspect_nodes, key=lambda x: x.get("betweenness", 0), reverse=True)[:6]

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
                "kingpins": kingpins,
            },
        }

    def dossier(self, suspect_id: int) -> dict:
        """Complete suspect intelligence dossier."""
        suspect = self.db.get(Suspect, suspect_id)
        if not suspect:
            raise HTTPException(404, "Suspect not found")

        # Linked incidents
        incidents_query = (
            select(Incident)
            .join(Incident.suspects)
            .where(Suspect.id == suspect_id)
            .order_by(desc(Incident.occurred_at))
        )
        incidents = list(self.db.scalars(incidents_query).all())

        # Known associates (other suspects sharing incidents)
        associate_ids = set()
        for inc in incidents:
            for s in inc.suspects:
                if s.id != suspect_id:
                    associate_ids.add(s.id)

        associates = []
        if associate_ids:
            assocs = self.db.scalars(
                select(Suspect).where(Suspect.id.in_(list(associate_ids)[:15]))
            ).all()
            for a in assocs:
                associates.append({
                    "id": a.id,
                    "name": a.name,
                    "alias": a.alias,
                    "vehicle": a.vehicle,
                })

        incident_summaries = [
            {
                "id": inc.id,
                "crime_id": inc.crime_id,
                "primary_type": inc.primary_type,
                "occurred_at": inc.occurred_at.strftime("%Y-%m-%d %H:%M") if inc.occurred_at else "—",
                "area": area_name(inc.community_area),
                "risk_level": inc.risk_level,
                "status": inc.status,
                "description": inc.description,
            }
            for inc in incidents
        ]

        # Calculate threat score
        threat_score = min(1.0, len(incidents) * 0.25 + (0.3 if suspect.vehicle else 0.0))

        return {
            "suspect": {
                "id": suspect.id,
                "name": suspect.name,
                "alias": suspect.alias,
                "gender": suspect.gender or "Male",
                "age": suspect.age,
                "vehicle": suspect.vehicle,
                "description": suspect.description,
                "threat_score": round(threat_score, 2),
                "threat_level": "Critical" if threat_score >= 0.7 else "High" if threat_score >= 0.4 else "Moderate",
            },
            "total_incidents": len(incidents),
            "incidents": incident_summaries,
            "associates": associates,
        }

    def find_path(self, source_id: str, target_id: str, limit: int = 250) -> dict:
        """Find the shortest connecting chain between two entities."""
        data = self.build(limit=limit)
        g = nx.Graph()
        for edge in data["edges"]:
            g.add_edge(edge["source"], edge["target"], type=edge.get("type"))

        if not g.has_node(source_id) or not g.has_node(target_id):
            return {"connected": False, "path": [], "length": 0}

        try:
            path = nx.shortest_path(g, source=source_id, target=target_id)
            node_map = {n["id"]: n for n in data["nodes"]}
            detailed_path = [node_map.get(node_id, {"id": node_id, "label": node_id}) for node_id in path]
            return {"connected": True, "path": detailed_path, "length": len(path) - 1}
        except nx.NetworkXNoPath:
            return {"connected": False, "path": [], "length": 0}
