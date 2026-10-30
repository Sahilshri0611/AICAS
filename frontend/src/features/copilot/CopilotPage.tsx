import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Search,
  Bot,
  Send,
  Building2,
  Calendar,
  User,
  Car,
  Package,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Cpu,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordDetailDialog } from "@/features/records/RecordDetailDialog";
import {
  useCopilotAsk,
  useCopilotStatus,
  useMOSearch,
  type MOSearchResultItem,
} from "./hooks";

const PROMPT_SUGGESTIONS = [
  "Analyze motorcycle chain snatching patterns and repeat suspects in Sitabuldi",
  "Summarize night commercial burglaries with shutter tampering and iron rods",
  "Find habitual offenders armed with country-made pistols and sharp weapons",
  "Identify stolen vehicle patterns involving Bajaj Pulsar and Splendor bikes",
];

const SAMPLE_MO_QUERIES = [
  "Two youths on motorcycle snatched gold chain from woman near temple at night",
  "Commercial shop shutter bent with iron rod and cash drawer looted between 2 AM to 4 AM",
  "Armed robbery at jewelry store by masked suspects brandishing country-made pistol",
  "Vehicle theft of two-wheeler parked outside commercial complex using master key",
];

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  content: string;
  citedCases?: MOSearchResultItem[];
  suggestedFollowUps?: string[];
  timestamp: string;
}

export function CopilotPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("copilot");

  // Status
  const { data: statusData, isLoading: isStatusLoading } = useCopilotStatus();

  // Copilot Chat State
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      content:
        "**Welcome to CrimeSense AI Intelligence Copilot.**\n\nI am connected to Nagpur City Police's historical database of **8,000 incidents, FIR extracts, and seized Muddayemal evidence**. Ask me about criminal patterns, Modus Operandi (M.O.), repeat offenders, or tactical deployment recommendations.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedFollowUps: [
        "Analyze motorcycle chain snatching patterns in Sitabuldi",
        "Night commercial burglary patterns in Dharampeth",
        "Identify repeat suspects using country-made firearms",
      ],
    },
  ]);

  const askMutation = useCopilotAsk();

  // M.O. Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("all");
  const searchMutation = useMOSearch();

  const handleAsk = (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || askMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    askMutation.mutate(
      { question: q, top_k: 6 },
      {
        onSuccess: (data) => {
          const copilotMsg: ChatMessage = {
            id: `copilot-${Date.now()}`,
            sender: "copilot",
            content: data.answer,
            citedCases: data.cited_cases,
            suggestedFollowUps: data.suggested_follow_ups,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, copilotMsg]);
        },
        onError: (err) => {
          const errorMsg: ChatMessage = {
            id: `copilot-error-${Date.now()}`,
            sender: "copilot",
            content: `**Error generating intelligence briefing:** ${err.message}. Please check connection or try another prompt.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, errorMsg]);
        },
      }
    );
  };

  const handleMOSearch = (text?: string) => {
    const q = text || searchQuery;
    if (!q.trim() || searchMutation.isPending) return;

    searchMutation.mutate({
      query: q,
      top_k: 12,
      crime_type: selectedCrimeType !== "all" ? selectedCrimeType : null,
      station_id: selectedStation !== "all" ? parseInt(selectedStation) : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title="AI Intelligence Copilot & M.O. Vector Search"
            description="Dense vector semantic search across 8,000 Nagpur crime narratives, accused dossiers, and seized evidence powered by Gemini 3.5 & GROQ Hybrid Intelligence Engine."
          />
        </div>

        {/* Index Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-4 py-2 text-xs shadow-sm backdrop-blur">
            <Cpu className="h-4 w-4 text-primary" />
            <div>
              <span className="font-semibold text-foreground">
                {statusData?.total_indexed?.toLocaleString() || "8,000"} Vectors
              </span>
              <span className="text-muted-foreground"> ({statusData?.dimension || 3072}-dim)</span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="copilot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Intelligence Copilot
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            M.O. Vector Search
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: AI Intelligence Copilot ───────────────────────────────── */}
        <TabsContent value="copilot" className="space-y-6">
          {/* Prompt Suggestions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Suggested Intelligence Inquiries:</span>
            {PROMPT_SUGGESTIONS.map((s, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAsk(s)}
                disabled={askMutation.isPending}
              >
                <Sparkles className="mr-1.5 h-3 w-3 text-amber-500" />
                {s}
              </Button>
            ))}
          </div>

          {/* Conversation Stream */}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-gradient-to-br from-indigo-500 to-blue-700 text-white"
                  }`}
                >
                  {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-3xl space-y-3 rounded-2xl p-4 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/70 bg-card/90"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold">
                      {msg.sender === "user" ? "Investigating Officer" : "CrimeSense AI Intelligence Analyst"}
                    </span>
                    <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                  </div>

                  {/* Formatted Text Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-xs sm:text-sm prose-p:my-1.5 prose-headings:my-2 prose-headings:font-bold prose-ul:my-1.5 prose-li:my-0.5">
                    {msg.sender === "copilot" ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Cited Case Cards */}
                  {msg.citedCases && msg.citedCases.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <FileText className="h-3.5 w-3.5" />
                        Grounded Case Evidence ({msg.citedCases.length} cited records):
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {msg.citedCases.map((c) => (
                          <div
                            key={c.incident_id}
                            className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/40 p-3 transition hover:border-primary/50 hover:bg-muted/70"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {c.crime_id}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {c.similarity_percent}% M.O. Match
                                </Badge>
                              </div>
                              <p className="text-xs font-medium text-foreground">{c.primary_type}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {c.summary}
                              </p>

                              {/* Accused & Vehicles */}
                              {c.suspects.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {c.suspects.map((s, si) => (
                                    <Badge key={si} variant="secondary" className="text-[10px]">
                                      {s.name} {s.alias ? `@ ${s.alias}` : ""}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {c.material_evidences.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {c.material_evidences.map((e, ei) => (
                                    <Badge key={ei} variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                                      {e.item_type}: {e.item_name} {e.identifier ? `(${e.identifier})` : ""}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 w-full justify-between text-xs font-medium text-primary"
                              onClick={() => setSelectedCaseId(c.incident_id)}
                            >
                              <span>View Incident & Evidence</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5">
                      <span className="text-[11px] text-muted-foreground">Follow-up inquiries:</span>
                      {msg.suggestedFollowUps.map((fu, fidx) => (
                        <button
                          key={fidx}
                          onClick={() => handleAsk(fu)}
                          className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/20"
                        >
                          → {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {askMutation.isPending && (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Consulting CrimeSense AI Copilot...</p>
                  <p className="text-xs text-muted-foreground">
                    Retrieving matching incident vectors and synthesizing tactical briefing with Google Gemini.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Ask Input Bar */}
          <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Ask any crime pattern question (e.g. 'Summarize night burglaries in Dharampeth involving iron rods')..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={askMutation.isPending}
                className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" disabled={!question.trim() || askMutation.isPending} size="sm" className="gap-2">
                <Send className="h-4 w-4" />
                <span>Ask Copilot</span>
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* ── Tab 2: Modus Operandi Vector Search ──────────────────────────── */}
        <TabsContent value="search" className="space-y-6">
          {/* Search Controls */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Semantic Modus Operandi (M.O.) Search</CardTitle>
              <CardDescription className="text-xs">
                Search criminal techniques, patterns, weapon types, and suspect behaviors in natural language.
                Finds historical cases by conceptual similarity rather than exact keywords.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Describe criminal method (e.g., 'Two men on Pulsar bike broke shop shutter with iron rod')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMOSearch()}
                    className="pl-9 text-sm"
                  />
                </div>
                <Button onClick={() => handleMOSearch()} disabled={!searchQuery.trim() || searchMutation.isPending}>
                  {searchMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Vector Search
                </Button>
              </div>

              {/* Sample M.O. Query Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Sample M.O. Queries:</span>
                {SAMPLE_MO_QUERIES.map((sample, sidx) => (
                  <Button
                    key={sidx}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSearchQuery(sample);
                      handleMOSearch(sample);
                    }}
                  >
                    {sample.slice(0, 48)}...
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchMutation.data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Found {searchMutation.data.total} semantically correlated historical cases for:{" "}
                  <span className="text-foreground italic">"{searchMutation.data.query}"</span>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {searchMutation.data.results.map((item) => (
                  <Card
                    key={item.incident_id}
                    className="flex flex-col justify-between border-border/70 transition hover:border-primary/50 hover:shadow-md"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{item.crime_id}</span>
                        <Badge
                          variant={item.similarity_percent >= 40 ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.similarity_percent}% Match
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-semibold">{item.primary_type}</CardTitle>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{item.police_station || "Nagpur PS"}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{item.occurred_at ? new Date(item.occurred_at).toLocaleDateString() : "—"}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 p-4 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {item.summary}
                      </p>

                      {/* Suspects */}
                      {item.suspects.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accused</p>
                          <div className="flex flex-wrap gap-1">
                            {item.suspects.map((s, si) => (
                              <Badge key={si} variant="outline" className="text-[10px]">
                                <User className="mr-1 h-2.5 w-2.5" />
                                {s.name} {s.alias ? `(${s.alias})` : ""}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Seized Muddayemal */}
                      {item.material_evidences.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Seized Evidence</p>
                          <div className="flex flex-wrap gap-1">
                            {item.material_evidences.map((e, ei) => (
                              <Badge key={ei} variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                <Package className="mr-1 h-2.5 w-2.5" />
                                {e.item_name} {e.identifier ? `[${e.identifier}]` : ""}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setSelectedCaseId(item.incident_id)}
                        >
                          <FileText className="mr-1.5 h-3 w-3" />
                          View Case
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setActiveTab("copilot");
                            handleAsk(`Provide a complete tactical analysis of case ${item.crime_id} (${item.primary_type} in ${item.police_station}): ${item.summary}`);
                          }}
                        >
                          <Sparkles className="mr-1.5 h-3 w-3 text-amber-500" />
                          Analyze
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Record Detail Dialog */}
      <RecordDetailDialog
        id={selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
      />
    </div>
  );
}
