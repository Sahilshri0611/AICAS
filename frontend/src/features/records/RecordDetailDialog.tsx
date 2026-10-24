import { MapPin, Calendar, Hash, ShieldCheck, User, Car, Building2, UserCheck } from "lucide-react";
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

export function RecordDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading } = useCrimeDetail(id);

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
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
                                <Car className="h-3 w-3" /> {s.vehicle}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
