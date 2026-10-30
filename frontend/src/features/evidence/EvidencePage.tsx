import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileText,
  Clock,
  Car,
  Package,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Lock,
  Building2,
  Tag,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/states";
import { fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useFIRQueue } from "@/features/fir/hooks";
import {
  useCustodyChain,
  useVerifyFIRIntegrity,
  useMaterialEvidence,
  useUpdateMaterialEvidenceStatus,
  type EvidenceVerification,
} from "./hooks";
import type { FIRDoc, MaterialEvidence } from "@/types";

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncateHash(hash?: string | null): string {
  if (!hash) return "—";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "In Malkhana") return "default";
  if (status === "Seized at PS Yard") return "secondary";
  if (status === "Sent to FSL") return "destructive";
  return "outline";
}

function EvidenceItemCard({ fir }: { fir: FIRDoc }) {
  const [showCustody, setShowCustody] = useState(false);
  const [verifyResult, setVerifyResult] = useState<EvidenceVerification | null>(null);
  const verifyMutation = useVerifyFIRIntegrity();
  const { data: custodyEvents, isLoading: custodyLoading } = useCustodyChain(showCustody ? fir.id : 0);

  const handleCopyHash = () => {
    if (!fir.file_hash) return;
    navigator.clipboard.writeText(fir.file_hash);
    toast.success("Hash copied", "SHA-256 cryptographic digest copied to clipboard");
  };

  const handleVerify = () => {
    verifyMutation.mutate(fir.id, {
      onSuccess: (data) => {
        setVerifyResult(data);
        if (data.verified) {
          toast.success("Integrity Verified", "Cryptographic SHA-256 hash matches the stored record.");
        } else {
          toast.error("Integrity Warning", "Hash mismatch detected! Document may be altered.");
        }
      },
    });
  };

  return (
    <Card glass className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{fir.original_filename}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                  <ShieldCheck className="h-3 w-3" />
                  Secured
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Uploaded {fmtDate(fir.created_at)} • Size: {formatBytes(fir.file_size)}
              </p>
              {fir.incident_id && (
                <p className="text-xs text-primary font-medium mt-1">
                  Linked to Crime Record #{fir.incident_id}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerify}
              disabled={verifyMutation.isPending}
              className="text-xs"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
              Verify Hash
            </Button>
            <Button size="sm" variant="outline" asChild className="text-xs">
              <a href={`/api/v1/evidence/fir/${fir.id}/preview`} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </a>
            </Button>
            <Button size="sm" variant="secondary" asChild className="text-xs">
              <a href={`/api/v1/evidence/fir/${fir.id}/file`} download>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </a>
            </Button>
          </div>
        </div>

        {/* SHA-256 Digest Bar */}
        {fir.file_hash && (
          <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-muted-foreground">SHA-256:</span>
              <span className="text-foreground truncate max-w-[280px] sm:max-w-md">{fir.file_hash}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={handleCopyHash} className="h-6 w-6 p-0">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}

        {/* Verification Result Alert */}
        {verifyResult && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{verifyResult.message}</span>
          </div>
        )}

        {/* Custody Accordion */}
        <div className="mt-4 border-t pt-3">
          <button
            onClick={() => setShowCustody(!showCustody)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Chain of Custody Timeline</span>
            {showCustody ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
          </button>

          {showCustody && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20 text-xs">
              {custodyLoading ? (
                <p className="text-muted-foreground">Loading custody log...</p>
              ) : (
                custodyEvents?.map((ev, i) => (
                  <div key={i} className="relative pb-2">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{ev.action}</span>
                      <span className="text-muted-foreground text-[11px] font-mono">{fmtDate(ev.timestamp)}</span>
                    </div>
                    {ev.detail && <p className="text-muted-foreground mt-0.5 text-[11px]">{ev.detail}</p>}
                    {ev.actor && <p className="text-primary/80 text-[10px]">Logged by: {ev.actor}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EvidencePage() {
  const { data: firQueue, isLoading: firLoading, isError: firError } = useFIRQueue();
  const [itemType, setItemType] = useState<string>("all");
  const [custodyStatus, setCustodyStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const { data: materialItems, isLoading: materialLoading, isError: materialError } = useMaterialEvidence({
    item_type: itemType,
    custody_status: custodyStatus,
    search: search || undefined,
  });

  const updateStatusMutation = useUpdateMaterialEvidenceStatus();

  const handleUpdateStatus = (evidenceId: number, newStatus: string) => {
    updateStatusMutation.mutate(
      { evidenceId, status: newStatus },
      {
        onSuccess: () => {
          toast.success("Custody Updated", `Evidence moved to status: ${newStatus}`);
        },
      }
    );
  };

  const storedFirs = (firQueue ?? []).filter((f) => f.original_pdf_stored || f.file_path);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Vault & Malkhana Register"
        description="BNSS 2023 compliant chain of custody for seized vehicles, weapons, property, and court-admissible original documents"
      />

      <Tabs defaultValue="malkhana" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="malkhana" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Seized Property & Vehicles ({materialItems?.length ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="digital" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Digital FIR Originals ({storedFirs.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: MALKHANA & MATERIAL EVIDENCE ── */}
        <TabsContent value="malkhana" className="space-y-4">
          {/* Filter Bar */}
          <Card glass className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vehicle plate, item name, seizure memo #, crime ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Item Types</SelectItem>
                  <SelectItem value="Vehicle">Vehicles (Two / Four Wheeler)</SelectItem>
                  <SelectItem value="Weapon">Weapons</SelectItem>
                  <SelectItem value="Stolen Property">Recovered Stolen Property</SelectItem>
                </SelectContent>
              </Select>

              <Select value={custodyStatus} onValueChange={setCustodyStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Custody Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Custody Statuses</SelectItem>
                  <SelectItem value="In Malkhana">In Malkhana</SelectItem>
                  <SelectItem value="Seized at PS Yard">Seized at PS Yard</SelectItem>
                  <SelectItem value="Sent to FSL">Sent to FSL</SelectItem>
                  <SelectItem value="Released on Supurdari">Released on Supurdari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Material Evidence List */}
          {materialLoading ? (
            <LoadingState />
          ) : materialError ? (
            <ErrorState message="Could not load material evidence registry." />
          ) : !materialItems || materialItems.length === 0 ? (
            <EmptyState
              title="No seized evidence found"
              description="No vehicles or physical property matched your filter criteria."
            />
          ) : (
            <div className="space-y-3">
              {materialItems.map((item) => (
                <Card key={item.id} glass className="p-4 transition-all hover:border-primary/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                        {item.item_type === "Vehicle" ? (
                          <Car className="h-6 w-6 text-amber-500" />
                        ) : (
                          <Package className="h-6 w-6 text-blue-500" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-foreground">{item.item_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.item_type}
                          </Badge>
                          {item.crime_id && (
                            <Badge variant="outline" className="font-mono text-xs text-primary">
                              Case #{item.crime_id}
                            </Badge>
                          )}
                        </div>

                        {item.identifier && (
                          <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-500">
                            <span>Plate / Identifier:</span>
                            <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {item.identifier}
                            </span>
                          </div>
                        )}

                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                          <span>
                            Seizure Memo:{" "}
                            <strong className="font-mono text-foreground font-semibold">
                              {item.seizure_memo_no ?? "—"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Malkhana / Location:{" "}
                            <strong className="text-foreground">{item.custody_location ?? "PS Malkhana"}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Station: <strong className="text-foreground">{item.police_station ?? "—"}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Custody Status Action */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={statusColor(item.custody_status)} className="text-xs px-2.5 py-1">
                        {item.custody_status}
                      </Badge>

                      <Select
                        defaultValue={item.custody_status}
                        onValueChange={(val) => handleUpdateStatus(item.id, val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-36">
                          <span>Change Custody</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Malkhana">In Malkhana</SelectItem>
                          <SelectItem value="Seized at PS Yard">Seized at PS Yard</SelectItem>
                          <SelectItem value="Sent to FSL">Sent to FSL</SelectItem>
                          <SelectItem value="Released on Supurdari">Released on Supurdari</SelectItem>
                          <SelectItem value="Produced in Court">Produced in Court</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: DIGITAL FIR ORIGINALS ── */}
        <TabsContent value="digital" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              All uploaded FIRs are stored with SHA-256 cryptographic digests for court admissibility under BNSS Sec 105.
            </p>
            <Badge variant="outline" className="text-xs font-mono">
              {storedFirs.length} Document(s) Secured
            </Badge>
          </div>

          {firLoading ? (
            <LoadingState />
          ) : firError ? (
            <ErrorState message="Could not load evidence vault records." />
          ) : storedFirs.length === 0 ? (
            <EmptyState
              title="No original FIR documents stored yet"
              description="Upload FIR files in the FIR Parser module to see tamper-proof copies here."
            />
          ) : (
            <div className="space-y-3">
              {storedFirs.map((fir) => (
                <EvidenceItemCard key={fir.id} fir={fir} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
