import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  FilePlus2, Loader2, MapPin, Paperclip, Plus, Trash2, UserPlus, X, Crosshair,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useCrimeHeads, useGeography } from "@/features/reference/hooks";
import { useCreateCase, useFileCategories, useUploadCaseFiles } from "./hooks";
import { LocationPicker, type LatLng } from "./LocationPicker";
import { fmtBytes } from "./CaseFiles";
import type { IncidentStatus, SuspectInput } from "@/types";

const LOCATION_TYPES = [
  "Residence", "Street", "Market", "Shop", "Parking Area", "Bus Stand", "Railway Station",
  "Metro Station", "ATM", "Bank", "Office", "Hospital", "School", "College", "Temple",
  "Public Transport", "Highway", "Ring Road", "Open Ground", "Slum Area", "Hotel/Lodge",
  "Bar/Restaurant", "Construction Site", "Workplace", "Online", "Other",
];
const STATUSES: IncidentStatus[] = ["Open", "Under Review", "Assigned", "Closed"];
const NONE = "__none__";

interface FormValues {
  case_number: string;
  primary_type: string;
  description: string;
  occurred_at: string;
  status: IncidentStatus;
  arrest: boolean;
  domestic: boolean;
  station: string;
  locality: string;
  block: string;
  location_description: string;
  summary: string;
  suspects: (Omit<SuspectInput, "age"> & { age: string })[];
}

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const defaults = (): FormValues => ({
  case_number: "", primary_type: "", description: "", occurred_at: nowLocal(), status: "Open",
  arrest: false, domestic: false, station: "", locality: NONE, block: "", location_description: NONE,
  summary: "", suspects: [],
});

function Field({ label, error, children, hint, className }: {
  label: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

export function NewCaseDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: number) => void;
}) {
  const geo = useGeography();
  const heads = useCrimeHeads();
  const categories = useFileCategories();
  const create = useCreateCase();
  const upload = useUploadCaseFiles(null);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ defaultValues: defaults() });
  const suspects = useFieldArray({ control, name: "suspects" });

  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinManual, setPinManual] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileCategory, setFileCategory] = useState("Evidence");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      reset(defaults());
      setPin(null);
      setPinManual(false);
      setFiles([]);
      setFileCategory("Evidence");
    }
  }, [open, reset]);

  const stations = geo.data?.stations ?? [];
  const stationId = watch("station") ? Number(watch("station")) : null;
  const station = stations.find((s) => s.id === stationId);
  const localityName = watch("locality");
  const locality = station?.localities.find((l) => l.name === localityName);
  const headName = watch("primary_type");
  const head = heads.data?.find((h) => h.name === headName);

  const byCategory = useMemo(() => {
    const m = new Map<string, typeof heads.data>();
    (heads.data ?? []).forEach((h) => m.set(h.category, [...(m.get(h.category) ?? []), h]));
    return [...m.entries()];
  }, [heads.data]);
  const byZone = useMemo(
    () => (geo.data?.zones ?? []).map((z) => ({ zone: z, stations: stations.filter((s) => s.zone === z.id) })),
    [geo.data, stations]
  );

  // Selecting a station/locality drops an approximate pin unless the officer placed one.
  const focus: [number, number] | null = locality
    ? [locality.latitude, locality.longitude]
    : station ? [station.latitude, station.longitude] : null;
  useEffect(() => {
    if (!pinManual) setPin(focus ? { lat: focus[0], lon: focus[1] } : null);
  }, [focus?.[0], focus?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPin = (p: LatLng) => {
    setPin(p);
    setPinManual(true);
    if (!stationId && stations.length) {
      // Map-first entry: infer the jurisdiction from the nearest station/locality.
      const d = (la: number, lo: number) => (la - p.lat) ** 2 + ((lo - p.lon) * Math.cos((p.lat * Math.PI) / 180)) ** 2;
      const nearest = stations
        .map((s) => ({ s, d: Math.min(d(s.latitude, s.longitude), ...s.localities.map((l) => d(l.latitude, l.longitude))) }))
        .sort((a, b) => a.d - b.d)[0].s;
      setValue("station", String(nearest.id), { shouldValidate: true });
    }
  };

  const busy = create.isPending || upload.isPending;

  const onSubmit = handleSubmit(async (v) => {
    const payload = {
      primary_type: v.primary_type,
      occurred_at: `${v.occurred_at}:00`,
      case_number: v.case_number.trim() || null,
      description: v.description.trim() || (head ? head.section : null),
      status: v.status,
      arrest: v.arrest,
      domestic: v.domestic,
      community_area: stationId,
      locality: v.locality !== NONE ? v.locality : null,
      block: v.block.trim() || null,
      location_description: v.location_description !== NONE ? v.location_description : null,
      latitude: pinManual && pin ? pin.lat : null,
      longitude: pinManual && pin ? pin.lon : null,
      summary: v.summary.trim() || null,
      suspects: v.suspects
        .filter((s) => s.name.trim())
        .map((s) => ({ ...s, age: s.age ? Number(s.age) : null })),
    };
    try {
      const inc = await create.mutateAsync(payload);
      if (files.length) {
        try {
          await upload.mutateAsync({ files, category: fileCategory, incidentId: inc.id });
        } catch (e) {
          toast.warning("Case saved, but file upload failed", apiError(e));
        }
      }
      toast.success(`Case ${inc.crime_id} registered`, `${inc.primary_type} · ${inc.police_station ?? ""}`);
      onOpenChange(false);
      onCreated?.(inc.id);
    } catch (e) {
      toast.error("Could not register case", apiError(e));
    }
  });

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list); // copy first — clearing the input empties the live FileList
    setFiles((prev) => [...prev, ...picked]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-primary" /> Register New Case</DialogTitle>
          <DialogDescription>
            Enter FIR details for a {geo.data?.city ?? "Nagpur"} City Police station. Risk score, zone and Crime ID are generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* ── Offence ── */}
          <div className="space-y-3">
            <SectionTitle icon={FilePlus2}>Offence</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Crime head *" error={errors.primary_type?.message}>
                <Controller
                  control={control}
                  name="primary_type"
                  rules={{ required: "Select a crime head" }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); setValue("description", ""); }}>
                      <SelectTrigger><SelectValue placeholder="Select crime head" /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {byCategory.map(([cat, list]) => (
                          <SelectGroup key={cat}>
                            <SelectLabel>{cat}</SelectLabel>
                            {list!.map((h) => <SelectItem key={h.name} value={h.name}>{h.name}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="FIR / Crime No." hint="e.g. SBD/0412/2026 — must be unique">
                <Input placeholder="Station code / number / year" {...register("case_number")} />
              </Field>
            </div>

            {head && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{head.section}</Badge>
                {head.subtypes.map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setValue("description", `${st} (${head.section})`)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary",
                      watch("description").startsWith(st) && "border-primary bg-primary/10 text-primary"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Description / sections" className="sm:col-span-3">
                <Input placeholder="e.g. Two-wheeler theft (BNS 303(2))" {...register("description")} />
              </Field>
              <Field label="Date & time of occurrence *" error={errors.occurred_at?.message}>
                <Input
                  type="datetime-local"
                  max={nowLocal()}
                  {...register("occurred_at", {
                    required: "Required",
                    validate: (v) => new Date(v) <= new Date() || "Cannot be in the future",
                  })}
                />
              </Field>
              <Field label="Status">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <div className="flex items-end gap-4 pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" {...register("arrest")} /> Arrest made
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" {...register("domestic")} /> Domestic
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Place of occurrence ── */}
          <div className="space-y-3">
            <SectionTitle icon={MapPin}>Place of occurrence</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Police station *" error={errors.station?.message}>
                <Controller
                  control={control}
                  name="station"
                  rules={{ required: "Select the police station" }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); setValue("locality", NONE); setPinManual(false); }}>
                      <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {byZone.map(({ zone, stations: list }) => (
                          <SelectGroup key={zone.id}>
                            <SelectLabel>{zone.name}</SelectLabel>
                            {list.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Locality">
                <Controller
                  control={control}
                  name="locality"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); setPinManual(false); }} disabled={!station}>
                      <SelectTrigger><SelectValue placeholder={station ? "Select locality" : "Pick a station first"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Not specified —</SelectItem>
                        {station?.localities.map((l) => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Location type">
                <Controller
                  control={control}
                  name="location_description"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value={NONE}>— Not specified —</SelectItem>
                        {LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Address / landmark" className="sm:col-span-3">
                <Input placeholder="e.g. Plot No. 42, near Hanuman Mandir, Narsala" {...register("block")} />
              </Field>
            </div>

            <LocationPicker
              value={pin}
              onChange={onPin}
              stations={stations}
              selectedStationId={stationId}
              focus={focus}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Crosshair className="h-3.5 w-3.5" />
                {pinManual && pin
                  ? <>Exact spot pinned: <span className="font-mono">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</span></>
                  : pin ? "Approximate pin from locality/station — click the map to mark the exact spot."
                  : "Select a station, or click the map to mark the spot — the nearest station is filled in."}
              </span>
              {pinManual && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPinManual(false)}>Reset pin</Button>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Facts & accused ── */}
          <div className="space-y-3">
            <Field label="Brief facts / summary">
              <Textarea rows={3} placeholder="Short narrative of the incident as per the complaint…" {...register("summary")} />
            </Field>

            <div className="flex items-center justify-between">
              <SectionTitle icon={UserPlus}>Accused / suspects</SectionTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => suspects.append({ name: "", alias: "", gender: "Male", age: "", vehicle: "" })}>
                <Plus className="h-4 w-4" /> Add accused
              </Button>
            </div>
            {suspects.fields.length === 0 && <p className="text-xs text-muted-foreground">No accused added (unknown / not yet identified).</p>}
            {suspects.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                <Input className="sm:col-span-5" placeholder="Full name *" {...register(`suspects.${i}.name`, { required: true })} />
                <Input className="sm:col-span-3" placeholder="Alias" {...register(`suspects.${i}.alias`)} />
                <Input className="sm:col-span-2" placeholder="Age" type="number" min={0} max={120} {...register(`suspects.${i}.age`)} />
                <select className="h-9 rounded-lg border border-input bg-card px-2 text-sm sm:col-span-2" {...register(`suspects.${i}.gender`)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                <Input className="sm:col-span-11" placeholder="Vehicle used (e.g. Honda Activa MH-31-EK-4521)" {...register(`suspects.${i}.vehicle`)} />
                <Button type="button" variant="ghost" size="icon" className="sm:col-span-1" title="Remove" onClick={() => suspects.remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* ── Files ── */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle icon={Paperclip}>Case files</SectionTitle>
              <div className="flex items-center gap-2">
                <Select value={fileCategory} onValueChange={setFileCategory}>
                  <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{(categories.data ?? ["Evidence"]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> Attach files
                </Button>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              </div>
            </div>
            {files.length === 0 ? (
              <p className="text-xs text-muted-foreground">FIR copy, photos, panchnama, medical report, CCTV clips… (max 25 MB each)</p>
            ) : (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              {upload.isPending ? "Uploading files…" : "Register case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
