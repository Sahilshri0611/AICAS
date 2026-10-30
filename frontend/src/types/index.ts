// ── Shared API types (mirror backend Pydantic schemas) ──

export type Role = "admin" | "commissioner" | "commander" | "investigator" | "officer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  badge_number?: string | null;
  department?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type IncidentStatus = "Open" | "Under Review" | "Assigned" | "Closed" | "Archived";

export interface Incident {
  id: number;
  crime_id: string;
  case_number?: string | null;
  primary_type: string;
  description?: string | null;
  location_description?: string | null;
  block?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  community_area?: number | null;
  district?: number | null;
  ward?: number | null;
  beat?: number | null;
  occurred_at: string;
  hour?: number | null;
  day_of_week?: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  status: IncidentStatus;
  arrest: boolean;
  domestic: boolean;
  source: string;
  fir_id?: number | null;
  assigned_to_id?: number | null;
  summary?: string | null;
  police_station?: string | null;
  zone_name?: string | null;
}

export interface Suspect {
  id: number;
  name: string;
  alias?: string | null;
  gender?: string | null;
  age?: number | null;
  description?: string | null;
  vehicle?: string | null;
}
export interface MaterialEvidence {
  id: number;
  incident_id: number;
  item_type: string; // Vehicle, Weapon, Stolen Property, Electronic Device, Cash, Narcotics, Other
  item_name: string;
  identifier?: string | null; // Plate number, IMEI, serial number
  description?: string | null;
  seizure_memo_no?: string | null;
  seized_at?: string | null;
  custody_status: string; // In Malkhana, Seized at PS Yard, Sent to FSL, Released on Supurdari
  custody_location?: string | null;
  linked_suspect_id?: number | null;
  seized_by_name?: string | null;
  created_at?: string | null;
  crime_id?: string | null;
  police_station?: string | null;
}

export interface IncidentDetail extends Incident {
  suspects: Suspect[];
  files: CaseFile[];
  material_evidences?: MaterialEvidence[];
}

// ── Case creation / files / import ──
export interface CaseFile {
  id: number;
  incident_id: number;
  original_filename: string;
  content_type?: string | null;
  size_bytes: number;
  category: string;
  description?: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}
export interface SuspectInput {
  name: string;
  alias?: string;
  gender?: string;
  age?: number | null;
  vehicle?: string;
  description?: string;
}
export interface IncidentCreatePayload {
  primary_type: string;
  occurred_at: string;
  community_area?: number | null;
  locality?: string | null;
  block?: string | null;
  location_description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  case_number?: string | null;
  description?: string | null;
  status?: IncidentStatus;
  arrest?: boolean;
  domestic?: boolean;
  summary?: string | null;
  suspects?: SuspectInput[];
}
export interface ImportResult {
  total_rows: number;
  created: number;
  skipped: number;
  errors: { row: number; error: string }[];
  crime_ids: string[];
}

// ── Reference (Nagpur geography, crime heads) ──
export interface Locality {
  name: string;
  latitude: number;
  longitude: number;
}
export interface PoliceStation {
  id: number;
  name: string;
  code: string;
  zone: number;
  zone_name: string;
  latitude: number;
  longitude: number;
  localities: Locality[];
}
export interface Geography {
  city: string;
  center: { latitude: number; longitude: number };
  zones: { id: number; name: string }[];
  stations: PoliceStation[];
}
export interface CrimeHead {
  name: string;
  section: string;
  category: string;
  severity: number;
  subtypes: string[];
}

export interface MapMarker {
  id: number;
  crime_id: string;
  primary_type: string;
  latitude: number;
  longitude: number;
  risk_level: RiskLevel;
  risk_score: number;
  occurred_at: string;
  area?: string | null;
}
export interface HeatPoint {
  lat: number;
  lon: number;
  intensity: number;
}

// ── Dashboard ──
export interface KpiCard {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  delta?: number | null;
  trend?: "up" | "down" | "flat" | null;
}
export interface DashboardOverview {
  kpis: KpiCard[];
  crimes_by_category: { category: string; count: number }[];
  crime_trend: { label: string; value: number }[];
  weekly_trend: { label: string; value: number }[];
  risk_distribution: { level: string; count: number }[];
  alert_severity_distribution: { level: string; count: number }[];
  top_areas: TopArea[];
  recent_incidents: RecentIncident[];
  emerging_hotspots: TopArea[];
  patrol_recommendations: PatrolRec[];
}
export interface TopArea {
  area: string;
  incident_count: number;
  risk_score: number;
  rank: number;
}
export interface RecentIncident {
  crime_id: string;
  primary_type: string;
  area?: string | null;
  risk_level: string;
  occurred_at: string;
}
export interface PatrolRec {
  area: string;
  priority: string;
  reason: string;
  suggested_units: number;
}

// ── Hotspots ──
export interface HotspotArea {
  area: string;
  community_area?: number | null;
  district?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  incident_count: number;
  hotspot_score: number;
  risk_index: number;
  rank: number;
  predicted_next?: number | null;
  change_pct?: number | null;
}
export interface HotspotResponse {
  generated_at: string;
  top_areas: HotspotArea[];
  heat_points: { lat: number; lon: number; intensity: number }[];
}

// ── Predictive ──
export interface ForecastPoint {
  label: string;
  predicted: number;
  lower: number;
  upper: number;
  actual?: number | null;
}
export interface PredictionMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}
export interface AreaRiskForecast {
  area: string;
  current_risk: number;
  predicted_risk: number;
  confidence: number;
}
export interface PredictiveAnalytics {
  metrics: PredictionMetrics;
  volume_forecast: { horizon: string; series: ForecastPoint[] };
  weekly_forecast: ForecastPoint[];
  time_heatmap: { day: string; hour: number; value: number }[];
  high_risk_areas: AreaRiskForecast[];
}

// ── Alerts ──
export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "Active" | "Acknowledged" | "Assigned" | "Closed";
export interface AlertNote {
  id: number;
  author_name?: string | null;
  body: string;
  created_at: string;
}
export interface Alert {
  id: number;
  title: string;
  category: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  recommended_action?: string | null;
  area_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  related_incident_id?: number | null;
  assigned_to_id?: number | null;
  acknowledged_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  notes: AlertNote[];
}

// ── FIR ──
export type FIRStatus =
  | "Uploaded" | "OCR Running" | "Parsing" | "Parsed"
  | "Needs Review" | "Approved" | "Failed";
export interface FIRDoc {
  id: number;
  original_filename: string;
  content_type?: string | null;
  status: FIRStatus;
  ocr_text?: string | null;
  ocr_confidence?: number | null;
  extracted?: Record<string, any> | null;
  field_confidence?: Record<string, number> | null;
  flagged_fields?: string[] | null;
  overall_confidence?: number | null;
  risk_score?: number | null;
  incident_id?: number | null;
  file_path?: string | null;
  file_size?: number | null;
  file_hash?: string | null;
  original_pdf_stored?: boolean;
  error_message?: string | null;
  created_at: string;
  processed_at?: string | null;
}
export interface FIRParseResult {
  fir: FIRDoc;
  generated_crime_id?: string | null;
}

// ── Models ──
export type ModelStatus = "Training" | "Active" | "Archived" | "Failed";
export interface MLModel {
  id: number;
  name: string;
  model_type: string;
  version: string;
  algorithm: string;
  status: ModelStatus;
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  f1_score?: number | null;
  metrics?: Record<string, any> | null;
  confusion_matrix?: number[][] | null;
  class_labels?: string[] | null;
  feature_importances?: Record<string, number> | null;
  training_rows?: number | null;
  trained_at?: string | null;
  notes?: string | null;
  created_at: string;
}

// ── Network ──
export interface GraphNode {
  id: string;
  label: string;
  type: "Suspect" | "Incident" | "Location" | "Vehicle";
  degree: number;
  centrality: number;
  component: number;
  risk_level?: string | null;
  meta?: Record<string, any> | null;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}
export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    node_count: number;
    edge_count: number;
    component_count: number;
    largest_component_size: number;
    isolated_nodes: number;
    top_central_nodes: GraphNode[];
    kingpins?: GraphNode[];
  };
}

export interface SuspectDossier {
  suspect: {
    id: number;
    name: string;
    alias?: string | null;
    gender: string;
    age?: number | null;
    vehicle?: string | null;
    description?: string | null;
    threat_score: number;
    threat_level: string;
  };
  total_incidents: number;
  incidents: {
    id: number;
    crime_id: string;
    primary_type: string;
    occurred_at: string;
    area: string;
    risk_level: string;
    status: string;
    description?: string | null;
  }[];
  associates: {
    id: number;
    name: string;
    alias?: string | null;
    vehicle?: string | null;
  }[];
}

export interface PathResult {
  connected: boolean;
  path: GraphNode[];
  length: number;
}

// ── Surveillance ──
export interface CCTVCamera {
  id: number;
  camera_id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  station_id: number | null;
  status: 'online' | 'offline' | 'maintenance';
  camera_type: 'PTZ' | 'Fixed' | 'ANPR';
  resolution: string;
  installed_date: string | null;
  stream_url: string | null;
  last_ping: string | null;
  created_at: string;
}

export interface ANPRDetection {
  id: number;
  camera_id: number;
  plate_number: string;
  confidence: number;
  vehicle_make: string | null;
  vehicle_color: string | null;
  detected_at: string;
  is_hotlist_hit: boolean;
  matched_suspect_id: number | null;
  alert_generated: boolean;
}

export interface VehicleHotlistEntry {
  id: number;
  plate_number: string;
  reason: string;
  suspect_id: number | null;
  fir_reference: string | null;
  vehicle_description: string | null;
  status: 'active' | 'found' | 'removed';
  added_at: string;
  found_at: string | null;
}

export interface SurveillanceDashboard {
  total_cameras: number;
  online_cameras: number;
  offline_cameras: number;
  anpr_cameras: number;
  total_detections_today: number;
  hotlist_hits_today: number;
  recent_detections: ANPRDetection[];
  cameras: CCTVCamera[];
}

// ── Patrol ──
export interface PatrolWaypoint {
  name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  order: number;
}

export interface PatrolRoute {
  id: number;
  name: string;
  station_id: number | null;
  zone: number | null;
  shift: 'day' | 'night' | 'evening';
  waypoints: PatrolWaypoint[];
  total_distance_km: number | null;
  estimated_duration_min: number | null;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  assigned_officer_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface PatrolBriefing {
  route: PatrolRoute;
  station_name: string;
  zone_name: string;
  high_risk_areas: { area: string; risk_score: number; recent_count: number }[];
  recent_incidents: { crime_id: string; type: string; date: string; location: string }[];
  suggested_strength: number;
}

// ── Evidence ──
export interface EvidenceFile {
  fir_id: number;
  filename: string;
  file_size: number | null;
  file_hash: string | null;
  stored: boolean;
  uploaded_at: string;
}

export interface CustodyEvent {
  action: string;
  timestamp: string;
  actor: string | null;
  detail: string | null;
}

