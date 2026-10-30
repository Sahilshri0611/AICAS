import { useRef, useState } from "react";
import {
  FileScan, Upload, FileText, Loader2, CheckCircle2, AlertTriangle,
  Sparkles, ShieldCheck, ClipboardList, Download, Eye, RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/common/RiskBadge";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import { useFIRQueue, useUploadFIR, useParseText, useApproveFIR, useRetryFIR } from "./hooks";
import type { FIRDoc, FIRParseResult } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  crime_type: "Crime Head", fir_number: "FIR No.", police_station: "Police Station",
  sections: "Sections / Acts", location: "Place of Occurrence", date: "Date", time: "Time",
  suspect_details: "Suspect Details", victim_details: "Victim Details",
  vehicle_information: "Vehicle Information", weapon_information: "Weapon Information",
  incident_summary: "Incident Summary",
};

const SAMPLE = `FIRST INFORMATION REPORT (Under Section 173 BNSS)
District: Nagpur City   Police Station: Sitabuldi   FIR No.: 0412/2026   Date: 14/09/2026
Acts & Sections: BNS 309(4), 3(5)

On 13/09/2026 at about 22:30 hrs, the complainant Shri Amol Deshpande (34 yrs, r/o Plot No. 18, Ramdaspeth, Nagpur) was walking near Variety Square, Sitabuldi when two unknown persons aged about 25-30 years came on a black Bajaj Pulsar bearing registration MH-31-FK-2291. The pillion rider showed a knife and snatched his mobile phone (Samsung Galaxy S23) and wallet containing Rs. 4,500 cash. The accused fled towards Zero Mile. The pillion rider was wearing a red jacket and had a scar on the left cheek. The complainant sustained no injuries.`;

function confColor(c: number) {
  if (c >= 0.8) return "text-success";
  if (c >= 0.6) return "text-warning";
  return "text-destructive";
}

export function FIRPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<FIRParseResult | null>(null);

  const upload = useUploadFIR();
  const parseText = useParseText();
  const approve = useApproveFIR();
  const retryFIR = useRetryFIR();
  const queue = useFIRQueue();
  const busy = upload.isPending || parseText.isPending || retryFIR.isPending;

  const handleFile = (file?: File) => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: (r) => { setResult(r); toast.success("FIR parsed", `Confidence ${Math.round((r.fir.overall_confidence ?? 0) * 100)}%`); },
      onError: (e) => toast.error("Parse failed", apiError(e)),
    });
  };

  const handleText = () => {
    if (!text.trim()) return;
    parseText.mutate(text, {
      onSuccess: (r) => { setResult(r); toast.success("FIR parsed"); },
      onError: (e) => toast.error("Parse failed", apiError(e)),
    });
  };

  const doApprove = () => {
    if (!result) return;
    approve.mutate(
      { id: result.fir.id },
      {
        onSuccess: (fir) => { toast.success("Incident created", `Crime record generated`); setResult({ ...result, fir }); },
        onError: (e) => toast.error("Approval failed", apiError(e)),
      }
    );
  };

  const fir = result?.fir;

  return (
    <div>
      <PageHeader
        title="FIR OCR & AI Parsing"
        description="Upload → OCR → LLM parsing → structured crime record."
        icon={FileScan}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <Card glass>
          <CardHeader><CardTitle className="text-base">Submit FIR</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1"><Upload className="mr-1 h-4 w-4" /> Upload File</TabsTrigger>
                <TabsTrigger value="text" className="flex-1"><FileText className="mr-1 h-4 w-4" /> Paste Text</TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-12 transition-colors hover:border-primary hover:bg-accent/40"
                >
                  {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                  <p className="text-sm font-medium">{busy ? "Processing…" : "Drop FIR file or click to browse"}</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or PDF (max 25 MB)</p>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
              </TabsContent>

              <TabsContent value="text">
                <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste FIR narrative text here…" />
                <div className="mt-2 flex gap-2">
                  <Button onClick={handleText} disabled={busy || !text.trim()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Parse with AI
                  </Button>
                  <Button variant="outline" onClick={() => setText(SAMPLE)}>Load sample</Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Statutory Protocol (BNSS §173)</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Automated OCR & AI entity parsing assists investigating officers (IOs) with preliminary docket preparation. All extracted fields require verification by the Station Duty Officer prior to official registry creation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Column */}
        <div className="space-y-4">
          <Card glass>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Extracted Record</CardTitle>
              {fir && (
                <Badge variant={fir.status === "Approved" ? "success" : fir.flagged_fields?.length ? "warning" : "default"}>
                  {fir.status}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {!fir ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
                  <ClipboardList className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Submit an FIR to see AI-extracted entities.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-primary/5 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Generated Crime ID</p>
                      <p className="font-mono text-sm font-semibold">{result?.generated_crime_id ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                      <p className="text-sm font-semibold">{fir.risk_score?.toFixed(2) ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Overall Confidence</p>
                      <p className={cn("text-sm font-semibold", confColor(fir.overall_confidence ?? 0))}>
                        {Math.round((fir.overall_confidence ?? 0) * 100)}%
                      </p>
                    </div>
                    {fir.ocr_confidence != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">OCR Confidence</p>
                        <p className="text-sm font-semibold">{Math.round(fir.ocr_confidence * 100)}%</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      const value = fir.extracted?.[key];
                      const conf = fir.field_confidence?.[key] ?? 0;
                      const flagged = fir.flagged_fields?.includes(key);
                      return (
                        <div key={key} className={cn("rounded-lg border p-2.5", flagged && "border-warning/40 bg-warning/5")}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{label}</span>
                            <span className={cn("flex items-center gap-1 text-xs font-semibold", confColor(conf))}>
                              {flagged ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {Math.round(conf * 100)}%
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</p>
                        </div>
                      );
                    })}
                  </div>

                  {fir.status !== "Approved" && (
                    <Button className="w-full" onClick={doApprove} disabled={approve.isPending}>
                      {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve & create crime record
                    </Button>
                  )}
                  {fir.status === "Approved" && fir.incident_id && (
                    <p className="text-center text-sm text-success">
                      ✓ Incident #{fir.incident_id} created from this FIR.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Document Evidence Card */}
          {fir && fir.original_pdf_stored && (
            <Card glass>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Original Document
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Tamper-Proof ✓
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-sm">{fir.original_filename}</p>
                  <p className="text-muted-foreground">
                    Size:{" "}
                    {fir.file_size
                      ? fir.file_size < 1024 * 1024
                        ? `${(fir.file_size / 1024).toFixed(1)} KB`
                        : `${(fir.file_size / (1024 * 1024)).toFixed(2)} MB`
                      : "—"}
                  </p>
                  {fir.file_hash && (
                    <p className="font-mono text-muted-foreground break-all">
                      SHA-256: <span className="text-foreground">{fir.file_hash}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`/api/v1/evidence/fir/${fir.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <a
                      href={`/api/v1/evidence/fir/${fir.id}/file`}
                      download={fir.original_filename}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Original
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Processing queue */}
      <Card glass className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Processing Queue & Ingestion Log</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Click any record to inspect extracted fields or retry failed OCR parsing.</p>
          </div>
          {queue.data?.length ? (
            <Badge variant="outline" className="text-xs">
              {queue.data.length} Total
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2.5">
          {queue.data?.length ? (
            queue.data.map((f: FIRDoc) => {
              const isSelected = result?.fir?.id === f.id;
              const hasIssues = f.status === "Failed" || (f.flagged_fields && f.flagged_fields.length > 0);
              return (
                <div
                  key={f.id}
                  onClick={() => setResult({ fir: f, generated_crime_id: f.incident_id ? `INC-${f.incident_id}` : null })}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border p-3 text-sm transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/40",
                    isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border/60 bg-card/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={cn("h-4 w-4 shrink-0 transition-colors", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="flex-1 truncate font-medium">{f.original_filename}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(f.created_at)}</span>
                    {f.overall_confidence != null && (
                      <span className={cn("text-xs font-semibold", confColor(f.overall_confidence))}>
                        {Math.round(f.overall_confidence * 100)}%
                      </span>
                    )}
                    <Badge variant={f.status === "Approved" ? "success" : f.status === "Failed" ? "destructive" : f.flagged_fields?.length ? "warning" : "secondary"}>
                      {f.status}
                    </Badge>
                  </div>

                  {hasIssues && (
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-destructive font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {f.error_message ? f.error_message : `Review flagged: ${f.flagged_fields?.join(", ")}`}
                      </span>
                      {f.status !== "Approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryFIR.mutate(f.id, {
                              onSuccess: (res) => {
                                toast.success("Retry successful", `FIR ${f.original_filename} re-parsed.`);
                                setResult(res);
                              },
                              onError: (err) => toast.error("Retry failed", apiError(err)),
                            });
                          }}
                          disabled={retryFIR.isPending}
                        >
                          <RotateCcw className={cn("h-3 w-3", retryFIR.isPending && "animate-spin")} />
                          Retry
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No FIRs processed yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
