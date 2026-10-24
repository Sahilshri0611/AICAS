import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Database, Search, Download, FileSpreadsheet, ChevronLeft, ChevronRight, Eye, FilePlus2, Upload,
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
import { apiError } from "@/lib/api";
import { useCan } from "@/lib/rbac";
import { useGeography } from "@/features/reference/hooks";
import { useCrimes, useCrimeTypes, exportRecords, type RecordFilters } from "./hooks";
import { RecordDetailDialog } from "./RecordDetailDialog";
import { NewCaseDialog } from "./NewCaseDialog";
import { ImportCasesDialog } from "./ImportCasesDialog";

const RISKS = ["all", "Critical", "High", "Medium", "Low"];
const STATUSES = ["all", "Open", "Under Review", "Assigned", "Closed"];

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

  const filters: RecordFilters = {
    search: debounced || undefined,
    crime_type: crimeType,
    risk_level: risk,
    status,
    district: zone,
    station,
    page,
    page_size: 15,
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
                  <TableHead>Crime ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Police Station</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetailId(r.id)}>
                    <TableCell className="font-mono text-xs font-medium">{r.crime_id}</TableCell>
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
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDetailId(r.id); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <RecordDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      <NewCaseDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => { setPage(1); setDetailId(id); }} />
      <ImportCasesDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
