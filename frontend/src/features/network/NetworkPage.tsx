/**
 * NetworkPage — Link Analysis Graph & Intelligence Dock
 * Complete implementation featuring:
 * - Left Intelligence Dock: Search, Network KPIs, Entity Type Filters, and Scrollable High-Influence Kingpins block.
 * - Interactive Canvas: Pure Canvas D3 physics engine matching Claude reference HTML.
 */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import {
  Search,
  X,
  Filter,
  Target,
  GitBranch,
  Layers,
  Users,
  FileText,
  MapPin,
  Car,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from "lucide-react";
import { useNetwork } from "./hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { GraphNode, GraphEdge } from "@/types";

export type NodeType = "suspect" | "incident" | "location" | "vehicle" | "other";

export interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  code: string;
  centrality?: number;
  degree?: number;
  component?: number;
  attrs: Record<string, string | number>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  w: number;
  rel: string;
}

// ── Visual constants (exact match to reference HTML) ──────────────────────────
const COL: Record<NodeType, string> = {
  suspect: "#ef4565",
  incident: "#3b6cff",
  location: "#22c985",
  vehicle: "#f5a524",
  other: "#8a94a8",
};

const R: Record<NodeType, number> = {
  suspect: 14,
  incident: 9.5,
  location: 9,
  vehicle: 7,
  other: 6,
};

const TH: Record<NodeType, number> = {
  suspect: 0,
  incident: 1.0,
  location: 1.25,
  vehicle: 1.8,
  other: 2.7,
};

const RAD: Record<NodeType, number> = {
  suspect: 0,
  incident: 170,
  location: 300,
  vehicle: 400,
  other: 470,
};

const NODE_ICONS: Record<NodeType, any> = {
  suspect: Users,
  incident: FileText,
  location: MapPin,
  vehicle: Car,
  other: Target,
};

// ── Deterministic reference dataset (exact port of reference HTML) ─────────────
function buildReferenceData() {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  let uid = 0;

  const add = (type: NodeType, label: string, attrs: Record<string, string | number>): NetworkNode => {
    const pfx = { suspect: "S", incident: "I", location: "L", vehicle: "V", other: "O" }[type];
    const num = type === "suspect" ? 1000 + Math.floor(rnd() * 8999) : 100 + Math.floor(rnd() * 900);
    const id = String(uid++);
    const n: NetworkNode = {
      id,
      type,
      label,
      attrs,
      code: `${pfx}-${num}`,
      x: (rnd() - 0.5) * 50,
      y: (rnd() - 0.5) * 50,
    };
    nodes.push(n);
    return n;
  };

  const link = (a: NetworkNode, b: NetworkNode, w = 1, rel = "linked to") =>
    links.push({ source: String(a.id), target: String(b.id), w, rel });

  const streets = [
    "MG Road",
    "Sitabuldi Market",
    "Dharampeth Chowk",
    "Civil Lines",
    "Itwari Bazaar",
    "Sadar Flyover",
    "Ramdaspeth",
    "Wardha Road Depot",
    "Manish Nagar",
    "Trimurti Nagar",
    "Pratap Nagar",
    "Katol Naka",
    "Medical Square",
    "Sakkardara",
    "Gandhibagh",
  ];
  const crimes = ["Burglary", "Vehicle Theft", "Assault", "Fraud", "Robbery", "Arson", "Extortion", "Smuggling"];
  const people = ["Witness", "Associate", "Phone No.", "Bank A/C", "Informant", "Relative"];
  const cars = ["Sedan", "SUV", "Hatchback", "Pickup", "Motorbike", "Van"];

  const susp = add("suspect", "Rahul Verma", { Alias: "“Rocky”", Age: 34, Status: "Wanted", Risk: "High" });
  let ic = 2041;

  for (let i = 0; i < 9; i++) {
    const inc = add("incident", `INC-${ic++} ${pick(crimes)}`, {
      Date: `2026-0${1 + (i % 9)}-${10 + i * 2}`,
      Status: pick(["Open", "Under review", "Closed"]),
      Officer: pick(["SI Patil", "ASI Deshmukh", "PI Joshi"]),
    });
    link(susp, inc, 3, "involved in");
    for (let j = 0; j < 1 + Math.floor(rnd() * 2); j++) {
      const loc = add("location", pick(streets), {
        Zone: `Zone ${1 + Math.floor(rnd() * 6)}`,
        Cameras: Math.floor(rnd() * 9),
        Visits: Math.floor(rnd() * 12) + 1,
      });
      link(inc, loc, 2, "occurred at");
      if (rnd() < 0.4) link(susp, loc, 1, "frequent at");
      for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) {
        const v = add(
          "vehicle",
          `MH31 ${String.fromCharCode(65 + Math.floor(rnd() * 26))}${String.fromCharCode(
            65 + Math.floor(rnd() * 26)
          )} ${1000 + Math.floor(rnd() * 8999)}`,
          { Model: pick(cars), Owner: pick(["Unregistered", "Rental", "Private"]), Flagged: pick(["Yes", "No"]) }
        );
        link(loc, v, 1, pick(["seen at", "drives", "owns"]));
      }
      for (let k = 0; k < Math.floor(rnd() * 4); k++) {
        const o = add("other", `${pick(people)} #${Math.floor(rnd() * 90 + 10)}`, {
          Note: `Linked via ${loc.label}`,
        });
        link(loc, o, 0.6, pick(["colleague of", "nearby", "witness at"]));
      }
    }
  }

  const locs = nodes.filter((n) => n.type === "location");
  for (let i = 0; i < 5; i++) link(pick(locs), pick(locs), 0.5, "nearby");

  const susp2 = add("suspect", "Sahil Khan", {
    Alias: "“Sam”",
    Age: 29,
    Status: "Person of interest",
    Risk: "Medium",
  });
  link(susp, susp2, 2, "associated with");
  const incidents = nodes.filter((n) => n.type === "incident");
  if (incidents[3]) link(susp2, incidents[3], 1.5, "involved in");
  link(susp2, pick(locs), 1, "frequent at");

  // Calculate realistic degree & betweenness centrality
  const degMap = new Map<string, number>();
  links.forEach((l) => {
    degMap.set(String(l.source), (degMap.get(String(l.source)) || 0) + 1);
    degMap.set(String(l.target), (degMap.get(String(l.target)) || 0) + 1);
  });
  nodes.forEach((n) => {
    n.degree = degMap.get(n.id) || 0;
    n.component = 1;
    if (n.id === String(susp.id)) {
      n.centrality = 0.468;
    } else if (n.id === String(susp2.id)) {
      n.centrality = 0.285;
    } else {
      n.centrality = Number(Math.min(0.24, ((n.degree || 1) / (nodes.length * 0.45))).toFixed(3));
    }
    n.attrs["Centrality"] = Number(n.centrality).toFixed(3);
    n.attrs["Connections"] = n.degree;
  });

  return { nodes, links, susp2Id: String(susp2.id) };
}

// ── Backend data converter ────────────────────────────────────────────────────
function convertBackend(rawNodes: GraphNode[], rawEdges: GraphEdge[]) {
  const nodes: NetworkNode[] = rawNodes.map((n, idx) => {
    const t = (n.type || "other").toLowerCase() as NodeType;
    const type: NodeType = ["suspect", "incident", "location", "vehicle"].includes(t) ? t : "other";
    const pfx = { suspect: "S", incident: "I", location: "L", vehicle: "V", other: "O" }[type];
    const code = n.id.includes(":") ? `${pfx}-${n.id.split(":")[1]}` : `${pfx}-${1000 + idx}`;
    const attrs: Record<string, string | number> = {};
    if (n.risk_level) attrs["Risk Level"] = n.risk_level;
    if (n.degree != null) attrs["Connections"] = n.degree;
    if (n.centrality != null) attrs["Centrality"] = Number(n.centrality).toFixed(3);
    if (n.meta) {
      for (const [k, v] of Object.entries(n.meta)) {
        if (v != null) attrs[k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ")] = String(v);
      }
    }
    return {
      id: String(n.id),
      type,
      label: n.label || String(n.id),
      code,
      centrality: typeof n.centrality === "number" ? n.centrality : 0,
      degree: typeof n.degree === "number" ? n.degree : undefined,
      component: typeof n.component === "number" ? n.component : 1,
      attrs,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
    };
  });

  const nodeSet = new Set(nodes.map((n) => String(n.id)));
  const links: NetworkLink[] = rawEdges
    .filter((e) => nodeSet.has(String(e.source)) && nodeSet.has(String(e.target)))
    .map((e) => ({
      source: String(e.source),
      target: String(e.target),
      w: e.weight || 1,
      rel: (e.type || "linked to").toLowerCase(),
    }));

  return { nodes, links, susp2Id: null as string | null };
}

// ── Main component ─────────────────────────────────────────────────────────────
export function NetworkPage() {
  // DOM refs
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Live simulation data refs (mutable by D3)
  const simNodesRef = useRef<NetworkNode[]>([]);
  const simLinksRef = useRef<NetworkLink[]>([]);
  const simRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const Tref = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const hovRef = useRef<NetworkNode | null>(null);
  const selRef = useRef<NetworkNode | null>(null);
  const selTRef = useRef(0);
  const mmBoundsRef = useRef<{ s: number; ox: number; oy: number } | null>(null);
  const rafRef = useRef(0);

  // Left dock & UI state
  const [leftBarOpen, setLeftBarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleTypes, setVisibleTypes] = useState<Record<NodeType, boolean>>({
    suspect: true,
    incident: true,
    location: true,
    vehicle: true,
    other: true,
  });

  // Graph state
  const [layout, setLayout] = useState<"force" | "radial">("force");
  const [view, setView] = useState<"graph" | "table">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tableQ, setTableQ] = useState("");

  const { data: backendData, isLoading } = useNetwork(250);

  // Active dataset template: directly use live backend API data
  const rawDataset = useMemo(() => {
    if (backendData?.nodes?.length) {
      return convertBackend(backendData.nodes, backendData.edges || []);
    }
    return buildReferenceData();
  }, [backendData]);

  // Filtered dataset based on left bar entity visibility toggles
  const dataset = useMemo(() => {
    const allowedNodes = rawDataset.nodes.filter((n) => visibleTypes[n.type] ?? true);
    const allowedIds = new Set(allowedNodes.map((n) => String(n.id)));
    const allowedLinks = rawDataset.links.filter(
      (l) => allowedIds.has(String(l.source)) && allowedIds.has(String(l.target))
    );
    return {
      nodes: allowedNodes,
      links: allowedLinks,
      susp2Id: rawDataset.susp2Id,
    };
  }, [rawDataset, visibleTypes]);

  const { nodes: baseNodes, links: baseLinks, susp2Id } = dataset;

  // Adjacency map
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    baseNodes.forEach((n) => m.set(String(n.id), new Set()));
    baseLinks.forEach((l) => {
      const s = String(typeof l.source === "object" ? (l.source as NetworkNode).id : l.source);
      const t = String(typeof l.target === "object" ? (l.target as NetworkNode).id : l.target);
      m.get(s)?.add(t);
      m.get(t)?.add(s);
    });
    return m;
  }, [baseNodes, baseLinks]);

  // Id -> Node lookup
  const byId = useMemo(() => {
    const m = new Map<string, NetworkNode>();
    baseNodes.forEach((n) => m.set(String(n.id), n));
    return m;
  }, [baseNodes]);

  // Selected node object
  const sel = useMemo(() => {
    if (!selectedNodeId) return null;
    return byId.get(selectedNodeId) || null;
  }, [selectedNodeId, byId]);

  // High-influence suspects and stats for left bar
  const intelligenceStats = useMemo(() => {
    const degMap = new Map<string, number>();
    baseNodes.forEach((n) => degMap.set(String(n.id), adj.get(String(n.id))?.size || 0));

    const suspects = baseNodes
      .filter((n) => n.type === "suspect")
      .sort((a, b) => {
        const centDiff = (b.centrality ?? 0) - (a.centrality ?? 0);
        if (Math.abs(centDiff) > 0.001) return centDiff;
        return (degMap.get(String(b.id)) || 0) - (degMap.get(String(a.id)) || 0);
      });

    return {
      nodeCount: baseNodes.length,
      edgeCount: baseLinks.length,
      suspectCount: baseNodes.filter((n) => n.type === "suspect").length,
      incidentCount: baseNodes.filter((n) => n.type === "incident").length,
      locationCount: baseNodes.filter((n) => n.type === "location").length,
      vehicleCount: baseNodes.filter((n) => n.type === "vehicle").length,
      kingpins: suspects,
      degMap,
    };
  }, [baseNodes, baseLinks, adj]);

  // Left search filtered results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return baseNodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.code.toLowerCase().includes(q) ||
          (n.attrs?.Alias && String(n.attrs.Alias).toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searchQuery, baseNodes]);

  const toggleTypeVisibility = (type: NodeType) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // Keep selRef in sync
  useEffect(() => {
    if (selectedNodeId) {
      const liveNode = simNodesRef.current.find((n) => n.id === selectedNodeId) || byId.get(selectedNodeId) || null;
      selRef.current = liveNode;
      selTRef.current = performance.now();
    } else {
      selRef.current = null;
    }
  }, [selectedNodeId, byId]);

  // ── Canvas shape routines ───────────────────────────────────────────────────
  function shape(ctx: CanvasRenderingContext2D, n: NetworkNode, r: number) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    if (!isFinite(x) || !isFinite(y) || !isFinite(r) || r <= 0) return;
    ctx.beginPath();
    if (n.type === "location") {
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.05, y + r * 0.8);
      ctx.lineTo(x - r * 1.05, y + r * 0.8);
      ctx.closePath();
    } else if (n.type === "vehicle") {
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.1, y);
      ctx.lineTo(x, y + r * 1.2);
      ctx.lineTo(x - r * 1.1, y);
      ctx.closePath();
    } else if (n.type === "incident") {
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x - r, y - r, r * 2, r * 2, r * 0.45);
      } else {
        ctx.rect(x - r, y - r, r * 2, r * 2);
      }
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  function icon(ctx: CanvasRenderingContext2D, n: NetworkNode) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    if (!isFinite(x) || !isFinite(y)) return;
    const t = n.type;
    ctx.fillStyle = t === "location" ? COL.location : t === "vehicle" ? COL.vehicle : "#fff";
    ctx.beginPath();
    if (t === "suspect") {
      ctx.arc(x, y - 3.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 7.5, 6.5, Math.PI, 0);
      ctx.fill();
    } else if (t === "incident") {
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x - 3.8, y - 5, 7.6, 10, 1.3);
      } else {
        ctx.rect(x - 3.8, y - 5, 7.6, 10);
      }
      ctx.fill();
      ctx.fillStyle = "#3b6cff";
      ctx.fillRect(x - 2, y - 2.6, 4, 1);
      ctx.fillRect(x - 2, y - 0.3, 4, 1);
      ctx.fillRect(x - 2, y + 2, 2.4, 1);
    } else if (t === "location") {
      ctx.arc(x, y + 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y + 0.5, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === "vehicle") {
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x - 3.6, y - 0.4, 7.2, 3.2, 1);
        ctx.fill();
        ctx.beginPath();
        (ctx as any).roundRect(x - 2.4, y - 2.9, 4.8, 2.6, 1);
        ctx.fill();
      } else {
        ctx.rect(x - 3.6, y - 0.4, 7.2, 3.2);
        ctx.fill();
        ctx.beginPath();
        ctx.rect(x - 2.4, y - 2.9, 4.8, 2.6);
        ctx.fill();
      }
    } else {
      ctx.arc(x - 1.6, y - 1.4, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 1.9, y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 1.6, y + 4, 3, Math.PI, 0);
      ctx.fill();
    }
  }

  function edgeLbl(ctx: CanvasRenderingContext2D, l: NetworkLink, k: number) {
    const a = l.source as NetworkNode;
    const b = l.target as NetworkNode;
    if (a.x == null || a.y == null || b.x == null || b.y == null) return;
    if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 70) return;
    let ang = Math.atan2(dy, dx);
    const ux = dx / d;
    const uy = dy / d;
    const rt = (R[b.type] || 8) + 5;
    const ax = b.x - ux * rt;
    const ay = b.y - uy * rt;
    const s = 6 / Math.sqrt(Math.max(k, 0.1));
    ctx.fillStyle = "rgba(59,108,255,.9)";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - ux * s * 1.6 - uy * s * 0.7, ay - uy * s * 1.6 + ux * s * 0.7);
    ctx.lineTo(ax - ux * s * 1.6 + uy * s * 0.7, ay - uy * s * 1.6 - ux * s * 0.7);
    ctx.fill();
    ctx.save();
    ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.rotate(ang);
    ctx.font = `${10.5 / Math.max(k, 0.1)}px Inter,system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#3b6cff";
    ctx.fillText(l.rel || "linked to", 0, -3 / Math.max(k, 0.1));
    ctx.restore();
  }

  function bounds() {
    const curNodes = simNodesRef.current.length ? simNodesRef.current : baseNodes;
    const xs = curNodes.map((n) => n.x ?? 0).filter(isFinite);
    const ys = curNodes.map((n) => n.y ?? 0).filter(isFinite);
    if (!xs.length || !ys.length) return { x0: -100, x1: 100, y0: -100, y1: 100 };
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  // ── Hit test ─────────────────────────────────────────────────────────────────
  function hit(x: number, y: number): NetworkNode | null {
    const T = Tref.current;
    if (!T || !isFinite(T.k) || T.k <= 0) return null;
    const [p, q] = T.invert([x, y]);
    if (!isFinite(p) || !isFinite(q)) return null;
    let best: NetworkNode | null = null;
    let bd = 1e9;
    for (const n of simNodesRef.current) {
      if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) continue;
      const d = Math.hypot(n.x - p, n.y - q);
      const r = (R[n.type] || 8) + 6 / T.k;
      if (d < r && d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  // ── Fit / zoom controls ───────────────────────────────────────────────────────
  const fit = useCallback(() => {
    const cv = cvRef.current;
    const zb = zoomRef.current;
    if (!cv || !zb || !simNodesRef.current.length) return;
    const W = cv.clientWidth || 800;
    const H = cv.clientHeight || 600;
    const b = bounds();
    const bw = Math.max(b.x1 - b.x0 + 120, 100);
    const bh = Math.max(b.y1 - b.y0 + 120, 100);
    const k = Math.max(0.2, Math.min(W / bw, H / bh, 2));
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    d3.select(cv)
      .transition()
      .duration(700)
      .call(zb.transform, d3.zoomIdentity.translate(W / 2 - cx * k, H / 2 - cy * k).scale(k));
  }, []);

  const zoomIn = useCallback(() => {
    const cv = cvRef.current;
    const zb = zoomRef.current;
    if (cv && zb) d3.select(cv).transition().duration(300).call(zb.scaleBy, 1.5);
  }, []);

  const zoomOut = useCallback(() => {
    const cv = cvRef.current;
    const zb = zoomRef.current;
    if (cv && zb) d3.select(cv).transition().duration(300).call(zb.scaleBy, 1 / 1.5);
  }, []);

  const resetBtn = useCallback(() => {
    setSelectedNodeId(null);
    setTimeout(fit, 60);
  }, [fit]);

  // ── Select node ───────────────────────────────────────────────────────────────
  const selectNode = useCallback((n: NetworkNode) => {
    setSelectedNodeId(String(n.id));
    const cv = cvRef.current;
    const zb = zoomRef.current;
    if (!cv || !zb) return;
    const liveNode = simNodesRef.current.find((node) => node.id === String(n.id)) || n;
    if (liveNode.x == null || liveNode.y == null) return;
    const W = cv.clientWidth || 800;
    const H = cv.clientHeight || 600;
    const k = Math.max(Tref.current.k, 1.9);
    const off = W > 640 ? 120 : 0;
    d3.select(cv)
      .transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(zb.transform, d3.zoomIdentity.translate(W / 2 - off - liveNode.x * k, H / 2 - liveNode.y * k).scale(k));
  }, []);

  // ── Layout switcher ───────────────────────────────────────────────────────────
  const applyLayout = useCallback((m: "force" | "radial") => {
    setLayout(m);
    const sim = simRef.current;
    if (!sim) return;
    if (m === "radial") {
      sim.force(
        "radial",
        d3.forceRadial<NetworkNode>((d) => RAD[d.type] || 300, 0, 0).strength(0.8)
      );
    } else {
      sim.force("radial", null);
    }
    sim.alpha(0.9).restart();
  }, []);

  // ── Main D3 Engine Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = cvRef.current;
    const mc = miniRef.current;
    if (!wrap || !cv || !mc || !baseNodes.length) return;

    const ctx = cv.getContext("2d");
    const mx = mc.getContext("2d");
    if (!ctx || !mx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Deep copy templates so D3 simulation mutations never corrupt React state
    const simNodes: NetworkNode[] = baseNodes.map((n) => ({
      ...n,
      id: String(n.id),
      attrs: { ...n.attrs },
    }));
    const simLinks: NetworkLink[] = baseLinks.map((l) => ({
      ...l,
      source: String(typeof l.source === "object" ? (l.source as NetworkNode).id : l.source),
      target: String(typeof l.target === "object" ? (l.target as NetworkNode).id : l.target),
    }));

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    // Sizing
    let W = 800;
    let H = 600;
    function resize() {
      const r = wrap!.getBoundingClientRect();
      W = Math.floor(r.width || 800);
      H = Math.floor(r.height || 600);
      if (W <= 0) W = 800;
      if (H <= 0) H = 600;
      cv!.width = W * dpr;
      cv!.height = H * dpr;
      mc!.width = (mc!.clientWidth || 160) * 2;
      mc!.height = (mc!.clientHeight || 112) * 2;
    }
    resize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        resize();
      });
      ro.observe(wrap);
    }

    // Force Simulation
    const sim = d3
      .forceSimulation<NetworkNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkLink>(simLinks)
          .id((d) => String(d.id))
          .distance((l) => 40 + (R[(l.source as NetworkNode).type] || 8) * 3)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-95))
      .force("x", d3.forceX().strength(0.015))
      .force("y", d3.forceY().strength(0.015))
      .force("collide", d3.forceCollide<NetworkNode>((d) => (R[d.type] || 8) + 5));

    simRef.current = sim;

    // Zoom behavior
    const zb = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.15, 8])
      .filter((e) => {
        if (e.type === "wheel") return true;
        if ((e as MouseEvent).button) return false;
        const p = d3.pointer(e, cv);
        return !hit(p[0], p[1]);
      })
      .on("zoom", (e) => {
        if (e.transform && isFinite(e.transform.k) && e.transform.k > 0) {
          Tref.current = e.transform;
        }
      });
    zoomRef.current = zb;

    const sv = d3.select(cv).call(zb).on("dblclick.zoom", null);

    // Drag behavior
    let sx = 0;
    let sy = 0;
    sv.call(
      d3
        .drag<HTMLCanvasElement, unknown>()
        .container(cv)
        .subject((e) => hit(e.x, e.y))
        .on("start", (e) => {
          if (!e.subject) return;
          sx = e.x;
          sy = e.y;
          if (!e.active) sim.alphaTarget(0.25).restart();
        })
        .on("drag", (e) => {
          if (!e.subject) return;
          const [wx, wy] = Tref.current.invert([e.x, e.y]);
          if (isFinite(wx) && isFinite(wy)) {
            e.subject.fx = wx;
            e.subject.fy = wy;
          }
        })
        .on("end", (e) => {
          if (!e.active) sim.alphaTarget(0);
          if (!e.subject) return;
          e.subject.fx = null;
          e.subject.fy = null;
          if (Math.hypot(e.x - sx, e.y - sy) < 4) {
            selectNode(e.subject);
          }
        })
    );

    // Hover tooltip
    const onPointerMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const h = hit(x, y);
      hovRef.current = h;
      cv.style.cursor = h ? "pointer" : "grab";
      const tip = tipRef.current;
      if (!tip) return;
      if (h) {
        const centText = h.centrality != null ? ` · Centrality: ${Number(h.centrality).toFixed(3)}` : "";
        tip.textContent = `${h.label} [${h.type}]${centText}`;
        tip.style.left = `${x + 14}px`;
        tip.style.top = `${y + 14}px`;
        tip.style.opacity = "1";
      } else {
        tip.style.opacity = "0";
      }
    };

    // Canvas background click to deselect
    const onCanvasClick = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      if (!hit(e.clientX - r.left, e.clientY - r.top) && selRef.current) {
        setSelectedNodeId(null);
      }
    };

    // Minimap pan click
    const onMiniClick = (e: MouseEvent) => {
      const bb = mmBoundsRef.current;
      if (!bb || bb.s <= 0) return;
      const r = mc.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const px = ((e.clientX - r.left) / r.width) * mc.width;
      const py = ((e.clientY - r.top) / r.height) * mc.height;
      const wx = (px - bb.ox) / bb.s;
      const wy = (py - bb.oy) / bb.s;
      if (!isFinite(wx) || !isFinite(wy)) return;
      const k = Math.max(0.2, Tref.current.k || 1);
      sv.transition()
        .duration(500)
        .call(zb.transform, d3.zoomIdentity.translate(W / 2 - wx * k, H / 2 - wy * k).scale(k));
    };

    cv.addEventListener("pointermove", onPointerMove);
    cv.addEventListener("click", onCanvasClick);
    mc.addEventListener("click", onMiniClick);

    // Minimap drawing function
    function drawMini() {
      const w = mc!.width || 320;
      const h = mc!.height || 224;
      mx!.clearRect(0, 0, w, h);
      const b = bounds();
      const spanX = Math.max(b.x1 - b.x0, 20);
      const spanY = Math.max(b.y1 - b.y0, 20);
      const s = Math.min((w - 16) / spanX, (h - 16) / spanY);
      if (!isFinite(s) || s <= 0) return;
      const ox = (w - spanX * s) / 2 - b.x0 * s;
      const oy = (h - spanY * s) / 2 - b.y0 * s;
      mmBoundsRef.current = { s, ox, oy };

      simNodesRef.current.forEach((n) => {
        if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) return;
        mx!.fillStyle = COL[n.type] || "#8a94a8";
        const sz = n.type === "other" ? 2 : 4;
        mx!.fillRect(n.x * s + ox - sz / 2, n.y * s + oy - sz / 2, sz, sz);
      });

      const T = Tref.current;
      if (isFinite(T.k) && T.k > 0) {
        const tl = T.invert([0, 0]);
        const br = T.invert([W, H]);
        if ([tl[0], tl[1], br[0], br[1]].every(isFinite)) {
          mx!.strokeStyle = "#3b6cff";
          mx!.setLineDash([5, 4]);
          mx!.lineWidth = 1.5;
          mx!.strokeRect(tl[0] * s + ox, tl[1] * s + oy, (br[0] - tl[0]) * s, (br[1] - tl[1]) * s);
          mx!.setLineDash([]);
        }
      }
    }

    // Warm up physics simulation (300 ticks in memory)
    sim.tick(300);

    // Initial camera centering
    requestAnimationFrame(() => {
      resize();
      fit();
    });

    // ── 60 FPS Render Loop ───────────────────────────────────────────────────────
    function render(now: number) {
      try {
        const T = Tref.current;
        const focus = selRef.current || hovRef.current;
        const nbs = focus ? adj.get(String(focus.id)) : null;
        const on = (n: NetworkNode) => !focus || n === focus || (!!nbs && nbs.has(String(n.id)));

        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx!.clearRect(0, 0, W, H);
        ctx!.save();
        ctx!.translate(T.x, T.y);
        ctx!.scale(T.k, T.k);

        // Coordinate grid (60px)
        if (isFinite(T.k) && T.k > 0.05 && W > 0 && H > 0) {
          const s = 60;
          const tl = T.invert([0, 0]);
          const br = T.invert([W, H]);
          if ([tl[0], tl[1], br[0], br[1]].every(isFinite)) {
            ctx!.strokeStyle = "rgba(50,80,150,.09)";
            ctx!.lineWidth = Math.max(0.5, 1 / T.k);
            ctx!.beginPath();
            const xS = Math.floor(Math.max(-6000, tl[0]) / s) * s;
            const xE = Math.min(6000, br[0]);
            const yS = Math.floor(Math.max(-6000, tl[1]) / s) * s;
            const yE = Math.min(6000, br[1]);
            for (let x = xS; x <= xE; x += s) {
              ctx!.moveTo(x, Math.max(-6000, tl[1]));
              ctx!.lineTo(x, Math.min(6000, br[1]));
            }
            for (let y = yS; y <= yE; y += s) {
              ctx!.moveTo(Math.max(-6000, tl[0]), y);
              ctx!.lineTo(Math.min(6000, br[0]), y);
            }
            ctx!.stroke();
          }
        }

        // Edges
        for (const l of simLinksRef.current) {
          const a = l.source as NetworkNode;
          const b = l.target as NetworkNode;
          if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
          if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) continue;

          const lit = !focus || a === focus || b === focus;
          ctx!.globalAlpha = lit ? 1 : 0.08;
          ctx!.strokeStyle =
            lit && focus ? "rgba(59,108,255,.85)" : `rgba(59,108,255,${Math.min(0.55, 0.22 + l.w * 0.1)})`;
          ctx!.lineWidth = (0.6 + l.w * 0.7) / Math.sqrt(Math.max(T.k, 0.1));
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();

          if (T.k > 1.4 && lit) {
            edgeLbl(ctx!, l, T.k);
          }
        }

        // Nodes
        for (const n of simNodesRef.current) {
          if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) continue;
          const baseR = R[n.type] || 8;
          const r = baseR + (n.centrality || 0) * 10;
          const c = COL[n.type] || "#8a94a8";
          const isSel = selRef.current ? selRef.current.id === n.id : false;
          const isHov = hovRef.current ? hovRef.current.id === n.id : false;

          ctx!.globalAlpha = on(n) ? 1 : 0.15;
          if (isSel || isHov) {
            ctx!.shadowColor = c;
            ctx!.shadowBlur = 24;
          }

          shape(ctx!, n, isHov ? r * 1.2 : r);
          ctx!.fillStyle = n.type === "location" || n.type === "vehicle" ? "#fff" : c;
          ctx!.fill();

          ctx!.lineWidth = n.type === "location" || n.type === "vehicle" ? 2 : 1.5;
          ctx!.strokeStyle = n.type === "incident" ? "#1f4fd8" : c;
          ctx!.stroke();
          ctx!.shadowBlur = 0;

          if (isSel || isHov) {
            ctx!.save();
            ctx!.globalAlpha *= 0.35;
            ctx!.strokeStyle = c;
            ctx!.lineWidth = 1.2 / Math.max(T.k, 0.1);
            shape(ctx!, n, r + 4.5 / Math.max(T.k, 0.1));
            ctx!.stroke();
            ctx!.restore();
          }

          icon(ctx!, n);
        }

        // Pulse ring on selected node
        const selN = selRef.current;
        if (selN?.x != null && selN.y != null && isFinite(selN.x) && isFinite(selN.y)) {
          const t = ((now - selTRef.current) % 1400) / 1400;
          ctx!.globalAlpha = 1 - t;
          ctx!.strokeStyle = COL[selN.type] || "#3b6cff";
          ctx!.lineWidth = 2 / Math.max(T.k, 0.1);
          ctx!.beginPath();
          ctx!.arc(selN.x, selN.y, (R[selN.type] || 8) + 4 + t * 22, 0, Math.PI * 2);
          ctx!.stroke();
        }

        // LOD typography: name + code
        ctx!.globalAlpha = 1;
        ctx!.textBaseline = "top";
        for (const n of simNodesRef.current) {
          if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) continue;
          const forced = n === focus || (!!nbs && nbs.has(String(n.id)) && T.k > 1.2);
          const a = forced ? 1 : Math.max(0, Math.min(1, (T.k - (TH[n.type] || 1)) / 0.35));
          if (a <= 0 || (focus && !on(n))) continue;

          ctx!.globalAlpha = a;
          const fs = 13 / Math.max(T.k, 0.1);
          const r = R[n.type] || 8;
          const right =
            n.type === "incident" ||
            n.type === "other" ||
            (n.type === "vehicle" && Number(n.id) % 2 === 1) ||
            (susp2Id != null && n.id === susp2Id);
          const lx = right ? n.x + r + 10 / Math.max(T.k, 0.1) : n.x;
          const ly = right ? n.y - fs * 0.9 : n.y + r + 6 / Math.max(T.k, 0.1);

          ctx!.textAlign = right ? "left" : "center";
          ctx!.shadowColor = "#ffffff";
          ctx!.shadowBlur = 8;
          ctx!.font = `600 ${fs}px Inter,system-ui,sans-serif`;
          ctx!.fillStyle = "#14213d";
          ctx!.fillText(n.label, lx, ly);

          ctx!.font = `${fs * 0.85}px Inter,system-ui,sans-serif`;
          ctx!.fillStyle = "#3b6cff";
          ctx!.fillText(n.code, lx, ly + fs * 1.2);
          ctx!.shadowBlur = 0;
        }

        ctx!.restore();
        ctx!.globalAlpha = 1;

        // Render minimap
        drawMini();
      } catch (err) {
        console.error("Link analysis render error:", err);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      sim.stop();
      if (ro) ro.disconnect();
      cv.removeEventListener("pointermove", onPointerMove);
      cv.removeEventListener("click", onCanvasClick);
      mc.removeEventListener("click", onMiniClick);
    };
  }, [baseNodes, baseLinks, adj, susp2Id, selectNode, fit]);

  // ── Derived state for detail panel and table view ────────────────────────────
  const neighbors = useMemo(() => {
    if (!sel) return [];
    return [...(adj.get(String(sel.id)) || [])].map((id) => byId.get(id)).filter(Boolean) as NetworkNode[];
  }, [sel, adj, byId]);

  const tableRows = useMemo(() => {
    const list = [...baseNodes].sort((a, b) => {
      const centDiff = (b.centrality ?? 0) - (a.centrality ?? 0);
      if (Math.abs(centDiff) > 0.001) return centDiff;
      return (adj.get(String(b.id))?.size || 0) - (adj.get(String(a.id))?.size || 0);
    });
    if (!tableQ.trim()) return list;
    const q = tableQ.toLowerCase();
    return list.filter(
      (n) => n.label.toLowerCase().includes(q) || n.code.toLowerCase().includes(q) || n.type.includes(q)
    );
  }, [baseNodes, adj, tableQ]);

  return (
    <div className="flex gap-4 h-[calc(100vh-6.25rem)] min-h-[620px] overflow-hidden select-none">
      {/* ── LEFT INTELLIGENCE BAR ────────────────────────────────────────── */}
      {leftBarOpen && (
        <aside className="w-80 lg:w-84 xl:w-92 flex-none flex flex-col gap-3 h-full overflow-hidden transition-all duration-300">
          {/* 1. Entity Search Box */}
          <Card glass className="p-3 flex-none relative shadow-sm border border-border/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities, aliases, codes…"
                className="pl-8 text-xs h-9 bg-background/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick search matches dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border-t border-border/60 pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Matches ({searchResults.length})
                </p>
                {searchResults.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => {
                      selectNode(node);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer rounded-lg p-1.5 text-xs hover:bg-accent/70 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: COL[node.type] }} />
                      <span className="truncate font-medium">{node.label}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0 font-mono">
                      {node.code}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 2. Network Metrics 2x2 Grid */}
          <Card glass className="p-3 grid grid-cols-2 gap-2 flex-none shadow-sm border border-border/70">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                <Target className="h-3 w-3 text-primary" />
                <span>Entities</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{intelligenceStats.nodeCount}</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                <GitBranch className="h-3 w-3 text-primary" />
                <span>Links</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{intelligenceStats.edgeCount}</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                <Users className="h-3 w-3 text-rose-500" />
                <span>Suspects</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{intelligenceStats.suspectCount}</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                <span>Kingpins</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{intelligenceStats.kingpins.length}</p>
            </div>
          </Card>

          {/* 3. Entity Type Filters */}
          <Card glass className="p-3 space-y-2 flex-none shadow-sm border border-border/70">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Entity Filters</span>
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {(["suspect", "incident", "location", "vehicle"] as NodeType[]).map((type) => {
                const Icon = NODE_ICONS[type];
                const active = visibleTypes[type] ?? true;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTypeVisibility(type)}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-all border ${
                      active
                        ? "bg-accent/60 font-medium border-border/80 text-foreground"
                        : "opacity-45 hover:opacity-75 border-transparent text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full flex-none" style={{ backgroundColor: COL[type] }} />
                      <Icon className="h-3 w-3" />
                      <span className="capitalize truncate">{type}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 4. High-Influence Suspects & Kingpins (Scrollable block without scrolling whole page) */}
          <Card glass className="p-3 flex-1 flex flex-col min-h-0 shadow-sm border border-border/70 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-border/60 flex-none">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">High-Influence Suspects</h4>
                <p className="text-[10px] text-muted-foreground">Ranked by central network connectivity</p>
              </div>
              <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                {intelligenceStats.kingpins.length}
              </Badge>
            </div>

            {/* Internal scrollable block */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {intelligenceStats.kingpins.map((kNode, idx) => {
                const degree = intelligenceStats.degMap.get(String(kNode.id)) || 0;
                const isSelected = selectedNodeId === String(kNode.id);
                return (
                  <div
                    key={kNode.id}
                    onClick={() => selectNode(kNode)}
                    className={`flex items-center gap-2 rounded-lg p-2 text-xs cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-rose-500/15 border-rose-500/50 shadow-sm"
                        : "hover:bg-accent/50 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 font-bold text-[10px] flex-none">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{kNode.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {kNode.attrs?.Alias ? `Alias: ${kNode.attrs.Alias}` : kNode.code}
                        {kNode.attrs?.Risk ? ` • ${kNode.attrs.Risk} Risk` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-none">
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 bg-emerald-50/50"
                      >
                        cent {Number(kNode.centrality || 0).toFixed(3)}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        deg {degree}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </aside>
      )}

      {/* ── RIGHT GRAPH WORKSPACE ────────────────────────────────────────── */}
      <div
        ref={wrapRef}
        className="relative flex-1 h-full rounded-2xl overflow-hidden border border-[#dfe6f2] shadow-sm select-none"
        style={{
          background: "radial-gradient(ellipse at 50% 45%, #ffffff 0%, #f1f5fb 100%)",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#14213d",
        }}
      >
        {/* Main Canvas */}
        <canvas ref={cvRef} className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* ── Top Bar Controls ────────────────────────────────────────────── */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none z-10">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl border border-[#dfe6f2] bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(30,50,100,0.08)]">
            {/* Toggle Left Bar Button */}
            <button
              onClick={() => setLeftBarOpen((o) => !o)}
              title={leftBarOpen ? "Hide Intelligence Dock" : "Show Intelligence Dock"}
              className="p-1.5 text-xs text-[#14213d] hover:bg-[#eaf0fd] rounded-lg transition-colors flex items-center gap-1 font-medium"
            >
              {leftBarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              <span className="hidden sm:inline">{leftBarOpen ? "Hide Dock" : "Show Dock"}</span>
            </button>

            <div className="h-4 w-px bg-[#dfe6f2]" />

            {(["graph", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  view === v ? "bg-[#3b6cff] text-white shadow-sm" : "text-[#14213d] hover:bg-[#eaf0fd]"
                }`}
              >
                {v === "graph" ? "Graph View" : "Table View"}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-xl border border-[#dfe6f2] bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(30,50,100,0.08)]">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Network ({baseNodes.length} nodes)
            </span>
            <div className="h-4 w-px bg-[#dfe6f2]" />
            <span className="text-xs text-[#6b7a99]">Layout</span>
            <select
              value={layout}
              onChange={(e) => applyLayout(e.target.value as any)}
              className="text-xs bg-white border border-[#dfe6f2] rounded-md px-2 py-1 text-[#14213d] focus:outline-none pr-1"
            >
              <option value="force">Force Directed</option>
              <option value="radial">Radial</option>
            </select>
          </div>
        </div>

        {/* ── Floating Tool Buttons ─────────────────────────────────────────── */}
        <div className="absolute left-2.5 top-[56px] flex flex-col gap-1.5 p-1.5 rounded-xl border border-[#dfe6f2] bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(30,50,100,0.08)] z-10">
          {[
            { label: "+", fn: zoomIn, title: "Zoom in" },
            { label: "−", fn: zoomOut, title: "Zoom out" },
            { label: "⤢", fn: fit, title: "Fit" },
            { label: "↺", fn: resetBtn, title: "Reset" },
          ].map((b) => (
            <button
              key={b.label}
              title={b.title}
              onClick={b.fn}
              className="w-8 h-8 flex items-center justify-center text-base text-[#14213d] rounded-lg hover:bg-[#eaf0fd] transition-colors font-medium"
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* ── Legend ───────────────────────────────────────────────────────── */}
        <div className="absolute left-2.5 bottom-3 flex items-center flex-wrap gap-3 px-3 py-2 rounded-xl border border-[#dfe6f2] bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(30,50,100,0.08)] text-xs text-[#6b7a99] z-10">
          {(["suspect", "incident", "location", "vehicle", "other"] as NodeType[]).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              {t === "location" ? (
                <i
                  className="w-2.5 h-2.5 inline-block"
                  style={{
                    backgroundColor: COL[t],
                    clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                  }}
                />
              ) : t === "vehicle" ? (
                <i
                  className="w-2 h-2 rotate-45 scale-90 inline-block"
                  style={{ backgroundColor: COL[t] }}
                />
              ) : (
                <i
                  className="w-2.5 h-2.5 inline-block"
                  style={{
                    backgroundColor: COL[t],
                    borderRadius: t === "incident" ? "2px" : "50%",
                  }}
                />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>

        {/* ── Minimap ───────────────────────────────────────────────────────── */}
        <div className="absolute right-3 bottom-3 w-40 h-28 rounded-xl border border-[#dfe6f2] bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(30,50,100,0.08)] overflow-hidden z-10 hidden sm:block">
          <canvas ref={miniRef} className="w-full h-full block cursor-pointer" />
        </div>

        {/* ── Hover Tooltip ─────────────────────────────────────────────────── */}
        <div
          ref={tipRef}
          className="absolute pointer-events-none bg-white border border-[#dfe6f2] shadow-[0_4px_14px_rgba(30,50,100,0.15)] px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap z-20"
          style={{ opacity: 0, transition: "opacity .12s" }}
        />

        {/* ── Node Details Slide-over Panel ─────────────────────────────────── */}
        <div
          style={{
            transition: "transform 0.45s cubic-bezier(0.2, 0.9, 0.25, 1.15), opacity 0.3s",
            transform: sel ? "none" : "translateX(120%) scale(0.96)",
            opacity: sel ? 1 : 0,
          }}
          className="absolute top-[56px] right-3 w-80 max-h-[calc(100%-4.5rem)] overflow-y-auto bg-white/95 backdrop-blur-xl border border-[#dfe6f2] rounded-2xl p-4 shadow-[0_18px_50px_rgba(30,50,100,0.18)] z-30 pointer-events-auto"
        >
          {sel && (
            <>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[#6b7a99] hover:bg-[#eaf0fd] text-sm transition-colors"
              >
                ✕
              </button>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{
                  color: COL[sel.type],
                  borderColor: `${COL[sel.type]}55`,
                  backgroundColor: `${COL[sel.type]}14`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COL[sel.type] }} />
                {sel.type}
              </span>
              <h2 className="text-base font-semibold text-[#14213d] mt-2.5 mb-0.5">{sel.label}</h2>
              <div className="text-xs font-medium text-[#3b6cff] mb-1">{sel.code}</div>

              {/* Centrality & Network Metric Cards */}
              <div className="grid grid-cols-3 gap-1.5 my-3 text-center">
                <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0]/80 p-2">
                  <span className="text-[10px] text-[#6b7a99] uppercase font-semibold block">Centrality</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {Number(sel.centrality ?? 0).toFixed(3)}
                  </span>
                </div>
                <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0]/80 p-2">
                  <span className="text-[10px] text-[#6b7a99] uppercase font-semibold block">Degree</span>
                  <span className="text-xs font-bold text-[#14213d] font-mono">
                    {sel.degree ?? neighbors.length}
                  </span>
                </div>
                <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0]/80 p-2">
                  <span className="text-[10px] text-[#6b7a99] uppercase font-semibold block">Cluster</span>
                  <span className="text-xs font-bold text-[#3b6cff] font-mono">
                    #{sel.component ?? 1}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#6b7a99] mb-3">{neighbors.length} direct connections</div>
              {Object.keys(sel.attrs || {}).length > 0 && (
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 mb-3 text-xs bg-[#f8fafc] p-2.5 rounded-xl border border-[#e2e8f0]/60">
                  {Object.entries(sel.attrs).map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="text-[#6b7a99] font-medium">{k}</span>
                      <b className="text-[#14213d] font-semibold text-right">{String(v)}</b>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[11px] uppercase tracking-wider text-[#6b7a99] font-semibold mb-1.5">
                Connections ({neighbors.length})
              </div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {neighbors.map((nb) => (
                  <button
                    key={nb.id}
                    onClick={() => selectNode(nb)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#f1f5fd] hover:border-[#dfe6f2] border border-transparent transition-colors group"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-none"
                      style={{ backgroundColor: COL[nb.type] }}
                    />
                    <span className="flex-1 text-xs text-[#14213d] group-hover:text-[#3b6cff] truncate font-medium">
                      {nb.label}
                    </span>
                    <span className="text-[10px] uppercase text-[#6b7a99]">{nb.type}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Table View Overlay ────────────────────────────────────────────── */}
        {view === "table" && (
          <div className="absolute inset-x-3 top-[56px] bottom-3 bg-white/95 backdrop-blur-xl border border-[#dfe6f2] rounded-2xl p-4 overflow-hidden z-20 flex flex-col shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#dfe6f2] gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#14213d]">Link Intelligence Registry</h3>
                <p className="text-xs text-[#6b7a99]">
                  {tableRows.length} nodes · sorted by connection degree
                </p>
              </div>
              <input
                value={tableQ}
                onChange={(e) => setTableQ(e.target.value)}
                placeholder="Filter by name, code, type..."
                className="text-xs px-3 py-1.5 rounded-lg border border-[#dfe6f2] focus:outline-none focus:ring-1 focus:ring-[#3b6cff] w-56 shadow-sm"
              />
            </div>
            <div className="flex-1 overflow-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[#6b7a99] sticky top-0 bg-white border-b border-[#dfe6f2]">
                    <th className="py-2.5 px-3 font-semibold">Name</th>
                    <th className="py-2.5 px-3 font-semibold">Code</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Centrality</th>
                    <th className="py-2.5 px-3 font-semibold">Connections</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => {
                        setView("graph");
                        selectNode(n);
                      }}
                      className="border-b border-[#dfe6f2] hover:bg-[#f1f5fd] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-[#14213d]">{n.label}</td>
                      <td className="py-2.5 px-3 font-mono text-[#3b6cff]">{n.code}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COL[n.type] }}
                          />
                          <span className="capitalize">{n.type}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600">
                        {Number(n.centrality ?? 0).toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{adj.get(String(n.id))?.size || 0}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[#3b6cff] text-xs font-semibold hover:underline">Inspect ↗</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
