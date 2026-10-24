import { useRef, useState } from "react";
import {
  Download, Eye, FileImage, FileText, FileVideo, FileAudio, FileSpreadsheet, File as FileIcon,
  Loader2, Paperclip, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useCan } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { downloadCaseFile, useDeleteCaseFile, useFileCategories, useUploadCaseFiles } from "./hooks";
import type { CaseFile } from "@/types";

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

function iconFor(f: CaseFile) {
  const t = f.content_type ?? "";
  const n = f.original_filename.toLowerCase();
  if (t.startsWith("image/")) return FileImage;
  if (t.startsWith("video/")) return FileVideo;
  if (t.startsWith("audio/")) return FileAudio;
  if (/\.(xlsx?|csv)$/.test(n)) return FileSpreadsheet;
  if (t === "application/pdf" || /\.(docx?|txt|rtf|odt)$/.test(n)) return FileText;
  return FileIcon;
}

const previewable = (f: CaseFile) =>
  /^(image\/|application\/pdf|video\/|audio\/|text\/plain)/.test(f.content_type ?? "");

/** Evidence / document attachments for one incident: list, upload, open, download, delete. */
export function CaseFiles({ incidentId, files }: { incidentId: number; files: CaseFile[] }) {
  const can = useCan();
  const categories = useFileCategories();
  const upload = useUploadCaseFiles(incidentId);
  const del = useDeleteCaseFile(incidentId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("Evidence");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const send = (list: FileList | File[] | null) => {
    const arr = list ? Array.from(list) : [];
    if (!arr.length) return;
    upload.mutate(
      { files: arr, category, description: note.trim() || undefined },
      {
        onSuccess: (r) => { toast.success(`${r.length} file${r.length > 1 ? "s" : ""} attached`); setNote(""); },
        onError: (e) => toast.error("Upload failed", apiError(e)),
      }
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  const open = async (f: CaseFile, inline: boolean) => {
    try { await downloadCaseFile(f, inline); } catch (e) { toast.error("Download failed", apiError(e)); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Paperclip className="h-4 w-4" /> Case Files
          <Badge variant="secondary" className="ml-1">{files.length}</Badge>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => {
            const Icon = iconFor(f);
            return (
              <div key={f.id} className="flex items-center gap-2.5 rounded-lg border p-2.5">
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.original_filename}</p>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">{f.category}</Badge>
                    <span className="truncate">
                      {fmtBytes(f.size_bytes)} · {f.uploaded_by_name ?? "—"} · {fmtDate(f.created_at)}
                      {f.description && <> · {f.description}</>}
                    </span>
                  </div>
                </div>
                {previewable(f) && (
                  <Button variant="ghost" size="icon" title="Open" onClick={() => open(f, true)}><Eye className="h-4 w-4" /></Button>
                )}
                <Button variant="ghost" size="icon" title="Download" onClick={() => open(f, false)}><Download className="h-4 w-4" /></Button>
                {can.editIncident && (confirmId === f.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive" size="sm" disabled={del.isPending}
                      onClick={() => del.mutate(f.id, {
                        onSuccess: () => { toast.success("File removed"); setConfirmId(null); },
                        onError: (e) => toast.error("Delete failed", apiError(e)),
                      })}
                    >
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Keep</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => setConfirmId(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {can.createIncident && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); send(e.dataTransfer.files); }}
          className={cn("space-y-2 rounded-xl border-2 border-dashed p-3 transition-colors", dragging && "border-primary bg-accent/40")}
        >
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{(categories.data ?? ["Evidence"]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. CCTV from Variety Square" />
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Drop files here or use Upload — PDF, images, Office docs, audio/video, ZIP (max 25 MB each)
          </p>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => send(e.target.files)} />
        </div>
      )}
    </div>
  );
}
