import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { downloadImportTemplate, useImportCases } from "./hooks";
import { fmtBytes } from "./CaseFiles";
import type { ImportResult } from "@/types";

const COLUMNS = [
  ["Crime Head", "required — e.g. THEFT, CHAIN SNATCHING, CYBER CRIME (common synonyms accepted)"],
  ["Date", "required — 2026-09-21 or 21/09/2026 (day first)"],
  ["Time", "optional — 21:30 or 9:30 PM"],
  ["Police Station", "name, code or id — e.g. Sitabuldi, SBD, 8"],
  ["Locality / Address", "used to place the case on the map when no coordinates"],
  ["Latitude / Longitude", "optional — must be inside Nagpur"],
  ["FIR No", "optional — duplicates are skipped"],
  ["Status, Arrest, Domestic, Description, Accused Name, Accused Vehicle, Summary", "optional"],
];

export function ImportCasesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const imp = useImportCases();

  const close = (o: boolean) => {
    if (imp.isPending) return;
    onOpenChange(o);
    if (!o) { setFile(null); setResult(null); imp.reset(); }
  };

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
  };

  const run = () => {
    if (!file) return;
    imp.mutate(file, {
      onSuccess: (r) => {
        setResult(r);
        if (r.created) toast.success(`Imported ${r.created} case${r.created > 1 ? "s" : ""}`);
        else toast.warning("No cases imported", "Check the row errors below.");
      },
      onError: (e) => toast.error("Import failed", apiError(e)),
    });
  };

  const template = async () => {
    try { await downloadImportTemplate(); } catch (e) { toast.error("Download failed", apiError(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> Import Cases</DialogTitle>
          <DialogDescription>
            Bulk-register cases from a CSV or Excel sheet (e.g. a station's FIR register). Up to 5,000 rows per file.
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors hover:border-primary hover:bg-accent/40",
            dragging && "border-primary bg-accent/40"
          )}
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          {file ? (
            <p className="text-sm font-medium">{file.name} <span className="text-muted-foreground">({fmtBytes(file.size)})</span></p>
          ) : (
            <p className="text-sm font-medium">Drop a .csv / .xlsx file or click to browse</p>
          )}
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        {!result && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Expected columns (header names are flexible)</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={template}>
                <Download className="h-3.5 w-3.5" /> Download template
              </Button>
            </div>
            <ul className="space-y-1 text-muted-foreground">
              {COLUMNS.map(([c, d]) => <li key={c}><span className="font-medium text-foreground">{c}</span> — {d}</li>)}
            </ul>
            <p className="mt-2 text-muted-foreground">Files exported from Crime Records can be re-imported as-is.</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{result.total_rows}</p><p className="text-xs text-muted-foreground">Rows read</p></div>
              <div className="rounded-lg border border-success/40 bg-success/5 p-3"><p className="text-2xl font-bold text-success">{result.created}</p><p className="text-xs text-muted-foreground">Cases created</p></div>
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3"><p className="text-2xl font-bold text-warning">{result.errors.length}</p><p className="text-xs text-muted-foreground">Rows with issues</p></div>
            </div>
            {result.created > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                New Crime IDs: {result.crime_ids.slice(0, 12).join(", ")}{result.crime_ids.length > 12 && ` … +${result.created - 12} more`}
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 border-b px-3 py-1.5 text-xs last:border-0">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span className="w-14 shrink-0 font-mono text-muted-foreground">Row {e.row}</span>
                    <span>{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => close(false)} disabled={imp.isPending}>{result ? "Done" : "Cancel"}</Button>
          {!result && (
            <Button onClick={run} disabled={!file || imp.isPending}>
              {imp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
