"use client";

import {
  fetchGeneDetails,
  fetchGeneSequence as apiFetchGeneSequence,
  fetchClinvarVariants as apiFetchClinvarVariants,
  chatWithTwin,
  type GeneBounds,
  type GeneDetailsFromSearch,
  type GeneFromSearch,
  type ClinvarVariant,
  type TwinProfileRequest,
  type TwinSimulationResponse,
} from "~/utils/genome-api";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeneInformation } from "./gene-information";
import { GeneSequence } from "./gene-sequence";
import KnownVariants from "./known-variants";
import { VariantComparisonModal } from "./variant-comparison-modal";
import VariantAnalysis, {
  type VariantAnalysisHandle,
} from "./variant-analysis";
import {
  ChatRail,
  PANEL_CHIP_LABELS,
  type ChatMessage,
  type PanelKind,
} from "./chat-rail";
import {
  DynamicInsightPanels,
  type ActivePanel,
} from "./dynamic-insight-panels";

// Minimal fallbacks when the user hasn't completed the intake form yet
const MINIMAL_PROFILE: TwinProfileRequest = {
  name: "Explorer",
  age: 30,
  lifestyle: {
    sleep_hours: 7,
    stress_level: 5,
    activity_minutes_per_week: 150,
    nutrition_quality: 3,
    smoking: false,
  },
  has_dna_data: true,
};

const MINIMAL_SIMULATION: TwinSimulationResponse = {
  confidence_tier: "standard",
  current_state_summary: {
    baseline_risk_score: 0.5,
    primary_lever: "lifestyle",
    dna_mode: "unknown",
  },
  future_projection_baseline: [],
  future_projection_improved: [],
  delta: { risk_reduction: 0.05, health_index_gain_5y: 3 },
  top_levers: ["sleep", "activity"],
};

export default function GeneViewer({
  gene,
  genomeId,
  onClose,
  twinProfile,
  simulationResult,
}: {
  gene: GeneFromSearch;
  genomeId: string;
  onClose: () => void;
  twinProfile?: TwinProfileRequest;
  simulationResult?: TwinSimulationResponse;
}) {
  // ── Gene data state ───────────────────────────────────────────────────────
  const [geneSequence, setGeneSequence] = useState("");
  const [geneDetail, setGeneDetail] = useState<GeneDetailsFromSearch | null>(null);
  const [geneBounds, setGeneBounds] = useState<GeneBounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startPosition, setStartPosition] = useState<string>("");
  const [endPosition, setEndPosition] = useState<string>("");
  const [isLoadingSequence, setIsLoadingSequence] = useState(false);

  const [clinvarVariants, setClinvarVariants] = useState<ClinvarVariant[]>([]);
  const [isLoadingClinvar, setIsLoadingClinvar] = useState(false);
  const [clinvarError, setClinvarError] = useState<string | null>(null);

  const [actualRange, setActualRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const [comparisonVariant, setComparisonVariant] =
    useState<ClinvarVariant | null>(null);

  const [activeSequencePosition, setActiveSequencePosition] = useState<
    number | null
  >(null);
  const [activeReferenceNucleotide, setActiveReferenceNucleotide] = useState<
    string | null
  >(null);

  const variantAnalysisRef = useRef<VariantAnalysisHandle>(null);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I'm looking at ${gene.symbol} with you. Ask me anything about this gene, its variants, or what they might mean for your health.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // ── Dynamic panel state ───────────────────────────────────────────────────
  const [activePanels, setActivePanels] = useState<ActivePanel[]>([]);

  const addPanel = (kind: PanelKind) => {
    setActivePanels((prev) => {
      if (prev.some((p) => p.kind === kind)) return prev;
      return [...prev, { id: `${kind}-${Date.now()}`, kind }];
    });
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const removePanel = (id: string) =>
    setActivePanels((prev) => prev.filter((p) => p.id !== id));

  // ── Gene data fetching ────────────────────────────────────────────────────
  const updateClinvarVariant = (
    clinvar_id: string,
    updateVariant: ClinvarVariant,
  ) => {
    setClinvarVariants((currentVariants) =>
      currentVariants.map((v) =>
        v.clinvar_id == clinvar_id ? updateVariant : v,
      ),
    );
  };

  const fetchGeneSequence = useCallback(
    async (start: number, end: number) => {
      try {
        setIsLoadingSequence(true);
        setError(null);
        const {
          sequence,
          actualRange: fetchedRange,
          error: apiError,
        } = await apiFetchGeneSequence(gene.chrom, start, end, genomeId);
        setGeneSequence(sequence);
        setActualRange(fetchedRange);
        if (apiError) setError(apiError);
      } catch {
        setError("Failed to load sequence data");
      } finally {
        setIsLoadingSequence(false);
      }
    },
    [gene.chrom, genomeId],
  );

  useEffect(() => {
    const initializeGeneData = async () => {
      setIsLoading(true);
      if (!gene.gene_id) {
        setError("Gene ID is missing, cannot fetch details");
        setIsLoading(false);
        return;
      }
      try {
        const {
          geneDetails: fetchedDetail,
          geneBounds: fetchedGeneBounds,
          initialRange: fetchedRange,
        } = await fetchGeneDetails(gene.gene_id);
        setGeneDetail(fetchedDetail);
        setGeneBounds(fetchedGeneBounds);
        if (fetchedRange) {
          setStartPosition(String(fetchedRange.start));
          setEndPosition(String(fetchedRange.end));
          await fetchGeneSequence(fetchedRange.start, fetchedRange.end);
        }
      } catch {
        setError("Failed to load gene information. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    void initializeGeneData();
  // fetchGeneSequence is stable (wrapped in useCallback); gene and genomeId are the real deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gene, genomeId]);

  const handleSequenceClick = useCallback(
    (position: number, nucleotide: string) => {
      setActiveSequencePosition(position);
      setActiveReferenceNucleotide(nucleotide);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (variantAnalysisRef.current) {
        variantAnalysisRef.current.focusAlternativeInput();
      }
    },
    [],
  );

  const handleLoadSequence = useCallback(() => {
    const start = parseInt(startPosition);
    const end = parseInt(endPosition);
    let validationError: string | null = null;
    if (isNaN(start) || isNaN(end)) {
      validationError = "Please enter valid start and end positions";
    } else if (start >= end) {
      validationError = "Start position must be less than end position";
    } else if (geneBounds) {
      const minBound = Math.min(geneBounds.min, geneBounds.max);
      const maxBound = Math.max(geneBounds.min, geneBounds.max);
      if (start < minBound) {
        validationError = `Start position (${start.toLocaleString()}) is below the minimum value (${minBound.toLocaleString()})`;
      } else if (end > maxBound) {
        validationError = `End position (${end.toLocaleString()}) exceeds the maximum value (${maxBound.toLocaleString()})`;
      }
      if (end - start > 10000) {
        validationError = `Selected range exceeds maximum view range of 10,000 bp.`;
      }
    }
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    void fetchGeneSequence(start, end);
  }, [startPosition, endPosition, fetchGeneSequence, geneBounds]);

  const fetchClinvarVariants = async () => {
    if (!gene.chrom || !geneBounds) return;
    setIsLoadingClinvar(true);
    setClinvarError(null);
    try {
      const variants = await apiFetchClinvarVariants(
        gene.chrom,
        geneBounds,
        genomeId,
      );
      setClinvarVariants(variants);
    } catch {
      setClinvarError("Failed to fetch ClinVar variants");
      setClinvarVariants([]);
    } finally {
      setIsLoadingClinvar(false);
    }
  };

  useEffect(() => {
    if (geneBounds) {
      // fetchClinvarVariants closes over geneBounds; re-runs only when bounds change
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchClinvarVariants();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geneBounds]);

  const showComparison = (variant: ClinvarVariant) => {
    if (variant.evo2Result) setComparisonVariant(variant);
  };

  // ── Gene-aware chat ───────────────────────────────────────────────────────
  const handleGeneChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      setIsChatLoading(true);

      // Build a rich context prefix so the LLM understands what's on screen
      const variantSummary =
        clinvarVariants.length > 0
          ? `${clinvarVariants.length} ClinVar variant(s) loaded, including: ${clinvarVariants
              .slice(0, 3)
              .map((v) => `${v.title} (${v.classification || "unknown"})`)
              .join("; ")}.`
          : "No ClinVar variants have loaded yet.";

      const contextualMessage =
        `[Gene context: ${gene.symbol} — ${gene.name}, ` +
        `chromosome ${gene.chrom}, genome ${genomeId}. ${variantSummary}] ` +
        userMessage;

      const profile = twinProfile ?? {
        ...MINIMAL_PROFILE,
        genome_assembly: genomeId,
      };
      const simulation = simulationResult ?? MINIMAL_SIMULATION;

      const response = await chatWithTwin({
        message: contextualMessage,
        profile,
        simulation,
      });

      const panelTriggers = (response.ui_intents ?? []).map((intent) => ({
        kind: intent.panel_type as PanelKind,
        label:
          PANEL_CHIP_LABELS[intent.panel_type as PanelKind] ??
          intent.panel_type,
      }));

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.assistant_message,
          actionSuggestion: response.action_suggestion,
          expectedImpact: response.expected_impact,
          uncertaintyNote: response.uncertainty_note,
          safetyNote: response.safety_note,
          panelTriggers: panelTriggers.length > 0 ? panelTriggers : undefined,
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Failed to send message.",
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back button — full width */}
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer text-[#3c4f3d] hover:bg-[#e9eeea]/70"
        onClick={onClose}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to results
      </Button>

      {/* ── Split layout: left DNA content | right chat ─────────────────── */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* LEFT: all gene analysis cards */}
        <div className="min-w-0 flex-1 space-y-6">
          <VariantAnalysis
            ref={variantAnalysisRef}
            gene={gene}
            genomeId={genomeId}
            chromosome={gene.chrom}
            clinvarVariants={clinvarVariants}
            referenceSequence={activeReferenceNucleotide}
            sequencePosition={activeSequencePosition}
            geneBounds={geneBounds}
          />

          <KnownVariants
            refreshVariants={fetchClinvarVariants}
            showComparison={showComparison}
            updateClinvarVariant={updateClinvarVariant}
            clinvarVariants={clinvarVariants}
            isLoadingClinvar={isLoadingClinvar}
            clinvarError={clinvarError}
            genomeId={genomeId}
            gene={gene}
          />

          <GeneSequence
            geneBounds={geneBounds}
            geneDetail={geneDetail}
            startPosition={startPosition}
            endPosition={endPosition}
            onStartPositionChange={setStartPosition}
            onEndPositionChange={setEndPosition}
            sequenceData={geneSequence}
            sequenceRange={actualRange}
            isLoading={isLoadingSequence}
            error={error}
            onSequenceLoadRequest={handleLoadSequence}
            onSequenceClick={handleSequenceClick}
            maxViewRange={10000}
          />

          <GeneInformation
            gene={gene}
            geneDetail={geneDetail}
            geneBounds={geneBounds}
          />
        </div>

        {/* RIGHT: sticky gene-aware chat rail */}
        <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-5rem)] xl:w-[420px] xl:shrink-0">
          <ChatRail
            profileName={twinProfile?.name ?? gene.symbol}
            messages={chatMessages}
            isLoading={isChatLoading}
            input={chatInput}
            error={chatError}
            disabled={isChatLoading}
            onInputChange={setChatInput}
            onSend={() => void handleGeneChat()}
            onAddPanel={addPanel}
          />
        </div>
      </div>

      {/* ── Dynamic panels injected below split ─────────────────────────── */}
      <DynamicInsightPanels
        panels={activePanels}
        genomeId={genomeId}
        onRemovePanel={removePanel}
      />

      {/* Comparison modal — unchanged */}
      <VariantComparisonModal
        comparisonVariant={comparisonVariant}
        onClose={() => setComparisonVariant(null)}
      />
    </div>
  );
}
