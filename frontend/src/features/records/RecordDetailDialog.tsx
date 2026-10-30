import { MapPin, Calendar, Hash, ShieldCheck, User, Car, Building2, UserCheck, Package, Shield, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RiskBadge } from "@/components/common/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/common/states";
import { fmtDate } from "@/lib/format";
import { useCrimeDetail } from "./hooks";
import { CaseFiles } from "./CaseFiles";

function Field({ icon: Icon, label, value }: { icon: any; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function evidenceStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "In Malkhana") return "default";
  if (status === "Seized at PS Yard") return "secondary";
  if (status === "Sent to FSL") return "destructive";
  return "outline";
}

export function RecordDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading } = useCrimeDetail(id);

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        {isLoading || !data ? (
          <LoadingState />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="font-mono">{data.crime_id}</DialogTitle>
                <RiskBadge level={data.risk_level} />
                <Badge variant="secondary">{data.status}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{data.primary_type}</h3>
                {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
              </div>
              {data.summary && <p className="rounded-lg bg-muted/40 p-3 text-sm">{data.summary}</p>}

              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4">
                <Field icon={Building2} label="Police Station" value={data.police_station} />
                <Field icon={MapPin} label="Zone" value={data.zone_name} />
                <Field icon={MapPin} label="Place of Occurrence" value={data.block} />
                <Field icon={MapPin} label="Location Type" value={data.location_description} />
                <Field icon={Calendar} label="Occurred" value={fmtDate(data.occurred_at)} />
                <Field icon={Hash} label="FIR / Crime No." value={data.case_number} />
                <Field icon={ShieldCheck} label="Risk Score" value={data.risk_score.toFixed(2)} />
                <Field icon={UserCheck} label="Arrest" value={data.arrest ? "Yes" : "No"} />
                <Field icon={MapPin} label="Coordinates" value={data.latitude ? `${data.latitude.toFixed(4)}, ${data.longitude?.toFixed(4)}` : "—"} />
                <Field icon={Hash} label="Source" value={<span className="capitalize">{data.source}</span>} />
              </div>

              {/* Linked Suspects */}
              {data.suspects.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-semibold">Linked Suspects</p>
                    <div className="space-y-2">
                      {data.suspects.map((s) => (
                        <div key={s.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                          <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                            {s.vehicle && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Car className="h-3 w-3 text-amber-500" /> {s.vehicle}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Physical Evidence & Seized Property (Muddayemal Register) */}
              <Separator />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">
                      Seized Property & Vehicles (Muddayemal Register)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {data.material_evidences?.length ?? 0} item(s)
                  </Badge>
                </div>

                {!data.material_evidences || data.material_evidences.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No physical vehicles or property registered under seizure memo for this case yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.material_evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex flex-col gap-1.5 rounded-lg border bg-card/60 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {ev.item_type === "Vehicle" ? (
                              <Car className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Package className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="font-semibold text-foreground text-sm">
                              {ev.item_name}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {ev.item_type}
                            </Badge>
                          </div>
                          {ev.identifier && (
                            <p className="font-mono text-xs text-primary font-medium">
                              Registration / ID: {ev.identifier}
                            </p>
                          )}
                          {ev.description && (
                            <p className="text-muted-foreground">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            <span>Memo: <strong className="font-mono text-foreground">{ev.seizure_memo_no ?? "—"}</strong></span>
                            <span>•</span>
                            <span>Location: <strong className="text-foreground">{ev.custody_location ?? "PS Malkhana"}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={evidenceStatusVariant(ev.custody_status)} className="text-xs">
                            {ev.custody_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Case Files & FIR Copies */}
              <Separator />
              <CaseFiles incidentId={data.id} files={data.files ?? []} />

              {data.fir_id && (
                <p className="text-xs text-muted-foreground">
                  Originated from AI-parsed FIR #{data.fir_id}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
