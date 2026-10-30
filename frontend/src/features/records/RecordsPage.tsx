import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Database, Search, Download, FileSpreadsheet, ChevronLeft, ChevronRight, Eye, FilePlus2, Upload,
  ArrowUpDown, ArrowUp, ArrowDown, X, Building2, MapPin, Calendar, Shield, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/common/RiskBadge";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/common/states";
import { fmtDate, fmtNumber } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiError } from "@/lib/api";
import { useCan } from "@/lib/rbac";
import { useGeography } from "@/features/reference/hooks";
import { useCrimes, useCrimeTypes, exportRecords, type RecordFilters } from "./hooks";
import { RecordDetailDialog } from "./RecordDetailDialog";
import { NewCaseDialog } from "./NewCaseDialog";
import { ImportCasesDialog } from "./ImportCasesDialog";
import type { Incident } from "@/types";

const RISKS = ["all", "Critical", "High", "Medium", "Low"];
const STATUSES = ["all", "Open", "Under Review", "Assigned", "Closed"];

type SortColumn = "crime_id" | "primary_type" | "police_station" | "occurred_at" | "risk_score";

function getPagePills(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pills: number[] = [1];
  if (current > 3) pills.push(-1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pills.push(i);
  }
  if (current < total - 2) pills.push(-1);
  pills.push(total);
  return pills;
}

export function RecordsPage() {
  const [sp, setSp] = useSearchParams();
  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [crimeType, setCrimeType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [station, setStation] = useState("all");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<SortColumn>("occurred_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [quickRecord, setQuickRecord] = useState<Incident | null>(null);
  const [jumpPage, setJumpPage] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(sp.get("new") === "1");
  const [importOpen, setImportOpen] = useState(false);
  const can = useCan();
  const geo = useGeography();

  // Deep-link from the top bar: /records?new=1
  useEffect(() => {
    if (sp.get("new") === "1") {
      setNewOpen(true);
      sp.delete("new");
      setSp(sp, { replace: true });
    }
  }, [sp, setSp]);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filters: RecordFilters = {
    search: debounced || undefined,
    crime_type: crimeType,
    risk_level: risk,
    status,
    district: zone,
    station,
    page,
    page_size: 15,
    order_by: `${sortCol}_${sortDir}`,
  };
  const { data, isLoading, isFetching } = useCrimes(filters);
  const types = useCrimeTypes();

  const doExport = async (fmt: "csv" | "excel") => {
    try {
      await exportRecords(fmt, filters);
      toast.success(`Exported ${fmt.toUpperCase()}`);
    } catch (e) {
      toast.error("Export failed", apiError(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Crime Records"
        description="Unified, searchable database of every recorded incident."
        icon={Database}
        actions={
          <>
            {can.createIncident && (
              <>
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <FilePlus2 className="h-4 w-4" /> New Case
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> Import
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => doExport("csv")}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("excel")}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </>
        }
      />

      <Card glass className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          <Select value={crimeType} onValueChange={(v) => { setCrimeType(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Crime type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All crime types</SelectItem>
              {types.data?.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={(v) => { setRisk(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              {RISKS.map((r) => <SelectItem key={r} value={r}>{r === "all" ? "All risk levels" : r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={(v) => { setZone(v); setStation("all"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {geo.data?.zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={station} onValueChange={(v) => { setStation(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Police station" /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">All police stations</SelectItem>
              {geo.data?.zones.filter((z) => zone === "all" || String(z.id) === zone).map((z) => (
                <SelectGroup key={z.id}>
                  <SelectLabel>{z.name}</SelectLabel>
                  {geo.data!.stations.filter((s) => s.zone === z.id).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card glass className="overflow-hidden">
        {isLoading ? (
          <LoadingState label="Loading records…" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
              <span>
                Showing {fmtNumber((data.page - 1) * data.page_size + 1)}–
                {fmtNumber(Math.min(data.page * data.page_size, data.total))} of {fmtNumber(data.total)}
              </span>
              {isFetching && <span className="text-primary">Updating…</span>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none font-semibold transition-colors hover:text-foreground"
                    onClick={() => handleSort("crime_id")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Crime ID</span>
                      {sortCol === "crime_id" ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold transition-colors hover:text-foreground"
                    onClick={() => handleSort("primary_type")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Type</span>
                      {sortCol === "primary_type" ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold transition-colors hover:text-foreground"
                    onClick={() => handleSort("police_station")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Police Station</span>
                      {sortCol === "police_station" ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold transition-colors hover:text-foreground"
                    onClick={() => handleSort("occurred_at")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date/Time</span>
                      {sortCol === "occurred_at" ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none font-semibold transition-colors hover:text-foreground"
                    onClick={() => handleSort("risk_score")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Risk</span>
                      {sortCol === "risk_score" ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-accent/40"
                    onClick={() => setQuickRecord(r)}
                  >
                    <TableCell className="font-mono text-xs font-medium text-foreground">{r.crime_id}</TableCell>
                    <TableCell className="font-medium">
                      {r.primary_type}
                      {r.case_number && <p className="font-mono text-[11px] font-normal text-muted-foreground">{r.case_number}</p>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.police_station ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground" title={r.block ?? undefined}>
                      {r.block || r.location_description || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmtDate(r.occurred_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={r.risk_level} />
                        <span className="text-xs tabular-nums text-muted-foreground">{r.risk_score.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open Case File"
                        onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <div className="text-xs text-muted-foreground">
                Total <span className="font-semibold text-foreground">{fmtNumber(data.total)}</span> cases • Page{" "}
                <span className="font-semibold text-foreground">{data.page}</span> of{" "}
                <span className="font-semibold text-foreground">{data.pages}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>

                {/* Page number buttons */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPagePills(data.page, data.pages).map((p, idx) =>
                    p === -1 ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === data.page ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 w-8 p-0 text-xs", p === data.page && "pointer-events-none font-bold")}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-2.5 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>

                {/* Jump to Page */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(jumpPage, 10);
                    if (!isNaN(p) && p >= 1 && p <= data.pages) {
                      setPage(p);
                      setJumpPage("");
                    }
                  }}
                  className="flex items-center gap-1 ml-2"
                >
                  <Input
                    type="number"
                    min={1}
                    max={data.pages}
                    placeholder="Jump…"
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    className="h-8 w-16 text-xs px-2"
                  />
                  <Button type="submit" variant="secondary" size="sm" className="h-8 px-2 text-xs">
                    Go
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Quick-view slide drawer */}
      {quickRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="fixed inset-0" onClick={() => setQuickRecord(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card p-6 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-mono text-base font-bold text-foreground">{quickRecord.crime_id}</p>
                <p className="text-xs text-muted-foreground">{quickRecord.case_number || "Official Incident Docket"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setQuickRecord(null)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <RiskBadge level={quickRecord.risk_level} />
                <Badge variant="secondary">{quickRecord.status}</Badge>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Classification</p>
                <p className="mt-1 text-lg font-bold text-foreground">{quickRecord.primary_type}</p>
                {quickRecord.case_number && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Docket: {quickRecord.case_number}</p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Police Station: </span>
                    <span className="font-medium text-foreground">{quickRecord.police_station || "—"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    <span className="font-medium text-foreground">{quickRecord.block || quickRecord.location_description || "—"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Occurred: </span>
                    <span className="font-medium text-foreground">{fmtDate(quickRecord.occurred_at)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Risk Index: </span>
                    <span className="font-mono font-semibold text-foreground">{quickRecord.risk_score.toFixed(2)} / 1.00</span>
                  </div>
                </div>
              </div>

              {quickRecord.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Incident Narrative</p>
                  <p className="mt-1 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    {quickRecord.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t pt-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const id = quickRecord.id;
                  setQuickRecord(null);
                  setDetailId(id);
                }}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" /> Open Full Case File
              </Button>
              <Button variant="outline" onClick={() => setQuickRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <RecordDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      <NewCaseDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => { setPage(1); setDetailId(id); }} />
      <ImportCasesDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
