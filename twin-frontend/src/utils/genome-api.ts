import { env } from "~/env";

// ── Public types ──────────────────────────────────────────────────────────────

export interface GenomeAssemblyFromSearch {
  id: string;
  name: string;
  sourceName: string;
  active: boolean;
}

export interface ChromosomeFromSeach {
  name: string;
  size: number;
}

export interface GeneFromSearch {
  symbol: string;
  name: string;
  chrom: string;
  description: string;
  gene_id?: string;
}

export interface GeneDetailsFromSearch {
  genomicinfo?: {
    chrstart: number;
    chrstop: number;
    strand?: string;
  }[];
  summary?: string;
  organism?: {
    scientificname: string;
    commonname: string;
  };
}

export interface GeneBounds {
  min: number;
  max: number;
}

export interface ClinvarVariant {
  clinvar_id: string;
  title: string;
  variation_type: string;
  classification: string;
  gene_sort: string;
  chromosome: string;
  location: string;
  evo2Result?: {
    prediction: string;
    delta_score: number;
    classification_confidence: number;
  };
  isAnalyzing?: boolean;
  evo2Error?: string;
}

export interface AnalysisResult {
  position: number;
  reference: string;
  alternative: string;
  delta_score: number;
  prediction: string;
  classification_confidence: number;
}

export interface LifestyleProfile {
  sleep_hours: number;
  stress_level: number;
  activity_minutes_per_week: number;
  nutrition_quality: number;
  smoking: boolean;
}

export interface TwinProfileRequest {
  name: string;
  age: number;
  lifestyle: LifestyleProfile;
  has_dna_data: boolean;
  genome_assembly?: string;
  dna_summary?: string;
}

export interface TwinSimulationResponse {
  confidence_tier: "standard" | "enhanced";
  current_state_summary: {
    baseline_risk_score: number;
    primary_lever: string;
    dna_mode: "provided" | "unknown";
  };
  future_projection_baseline: Array<{
    years: number;
    risk_score: number;
    health_index: number;
  }>;
  future_projection_improved: Array<{
    years: number;
    risk_score: number;
    health_index: number;
  }>;
  delta: {
    risk_reduction: number;
    health_index_gain_5y: number;
  };
  top_levers: string[];
}

export interface UiIntent {
  panel_type: string;
  payload?: Record<string, string>;
}

export interface TwinChatResponse {
  assistant_message: string;
  action_suggestion: string;
  expected_impact: string;
  uncertainty_note?: string;
  safety_note?: string;
  ui_intents?: UiIntent[];
}

// ── Private raw API response types ───────────────────────────────────────────

interface UcscGenomeInfo {
  organism?: string;
  description?: string;
  sourceName?: string;
  active?: boolean;
}

interface UcscGenomesRaw {
  ucscGenomes?: Record<string, UcscGenomeInfo>;
}

interface UcscChromosomesRaw {
  chromosomes?: Record<string, number>;
}

// NCBI clinical-tables returns [count, terms[], fieldMap{}, rows[][]]
type NcbiGenesRaw = [number, string[], Record<string, string[]>, string[][]];

interface NcbiGenomicInfo {
  chrstart: number;
  chrstop: number;
  strand?: string;
}

interface NcbiGeneDetail {
  genomicinfo?: NcbiGenomicInfo[];
  summary?: string;
  organism?: { scientificname: string; commonname: string };
}

interface NcbiGeneSummaryRaw {
  result?: Record<string, NcbiGeneDetail>;
}

interface UcscSequenceRaw {
  dna?: string;
  error?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getAvailableGenomes() {
  const apiUrl = "https://api.genome.ucsc.edu/list/ucscGenomes";
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch genome list from UCSC API");
  }

  const genomeData = (await response.json()) as UcscGenomesRaw;
  if (!genomeData.ucscGenomes) {
    throw new Error("UCSC API error: missing ucscGenomes");
  }

  const genomes = genomeData.ucscGenomes;
  const structuredGenomes: Record<string, GenomeAssemblyFromSearch[]> = {};

  for (const genomeId in genomes) {
    const genomeInfo = genomes[genomeId]!;
    const organism = genomeInfo.organism ?? "Other";

    structuredGenomes[organism] ??= [];
    structuredGenomes[organism]?.push({
      id: genomeId,
      name: genomeInfo.description ?? genomeId,
      sourceName: genomeInfo.sourceName ?? genomeId,
      active: !!genomeInfo.active,
    });
  }

  return { genomes: structuredGenomes };
}

export async function getGenomeChromosomes(genomeId: string) {
  const apiUrl = `https://api.genome.ucsc.edu/list/chromosomes?genome=${genomeId}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch chromosome list from UCSC API");
  }

  const chromosomeData = (await response.json()) as UcscChromosomesRaw;
  if (!chromosomeData.chromosomes) {
    throw new Error("UCSC API error: missing chromosomes");
  }

  const chromosomes: ChromosomeFromSeach[] = [];
  for (const chromId in chromosomeData.chromosomes) {
    if (
      chromId.includes("_") ||
      chromId.includes("Un") ||
      chromId.includes("random")
    )
      continue;
    chromosomes.push({
      name: chromId,
      size: chromosomeData.chromosomes[chromId] ?? 0,
    });
  }

  // Sort: chr1, chr2, … chrX, chrY
  chromosomes.sort((a, b) => {
    const anum = a.name.replace("chr", "");
    const bnum = b.name.replace("chr", "");
    const isNumA = /^\d+$/.test(anum);
    const isNumB = /^\d+$/.test(bnum);
    if (isNumA && isNumB) return Number(anum) - Number(bnum);
    if (isNumA) return -1;
    if (isNumB) return 1;
    return anum.localeCompare(bnum);
  });

  return { chromosomes };
}

export async function searchGenes(query: string, genome: string) {
  const url = "https://clinicaltables.nlm.nih.gov/api/ncbi_genes/v3/search";
  const params = new URLSearchParams({
    terms: query,
    df: "chromosome,Symbol,description,map_location,type_of_gene",
    ef: "chromosome,Symbol,description,map_location,type_of_gene,GenomicInfo,GeneID",
  });
  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error("NCBI API Error");
  }

  const data = (await response.json()) as NcbiGenesRaw;
  const results: GeneFromSearch[] = [];
  const [count, , fieldMap, rows] = data;

  if (count > 0) {
    const geneIds: string[] = fieldMap.GeneID ?? [];
    for (let i = 0; i < Math.min(10, count); ++i) {
      if (i < rows.length) {
        try {
          const display = rows[i]!;
          let chrom = display[0] ?? "";
          if (chrom && !chrom.startsWith("chr")) {
            chrom = `chr${chrom}`;
          }
          results.push({
            symbol: display[2] ?? "",
            name: display[3] ?? "",
            chrom,
            description: display[3] ?? "",
            gene_id: geneIds[i] ?? "",
          });
        } catch {
          continue;
        }
      }
    }
  }

  return { query, genome, results };
}

export async function fetchGeneDetails(geneId: string): Promise<{
  geneDetails: GeneDetailsFromSearch | null;
  geneBounds: GeneBounds | null;
  initialRange: { start: number; end: number } | null;
}> {
  try {
    const detailUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${geneId}&retmode=json`;
    const detailsResponse = await fetch(detailUrl);

    if (!detailsResponse.ok) {
      console.error(
        `Failed to fetch gene details: ${detailsResponse.statusText}`,
      );
      return { geneDetails: null, geneBounds: null, initialRange: null };
    }

    const detailData = (await detailsResponse.json()) as NcbiGeneSummaryRaw;

    if (detailData.result?.[geneId]) {
      const detail = detailData.result[geneId];

      if (detail?.genomicinfo && detail.genomicinfo.length > 0) {
        const info = detail.genomicinfo[0]!;

        const minPos = Math.min(info.chrstart, info.chrstop);
        const maxPos = Math.max(info.chrstart, info.chrstop);
        const bounds = { min: minPos, max: maxPos };

        const geneSize = maxPos - minPos;
        const seqStart = minPos;
        const seqEnd = geneSize > 10000 ? minPos + 10000 : maxPos;
        const range = { start: seqStart, end: seqEnd };

        return { geneDetails: detail, geneBounds: bounds, initialRange: range };
      }
    }

    return { geneDetails: null, geneBounds: null, initialRange: null };
  } catch {
    return { geneDetails: null, geneBounds: null, initialRange: null };
  }
}

export async function fetchGeneSequence(
  chrom: string,
  start: number,
  end: number,
  genomeId: string,
): Promise<{
  sequence: string;
  actualRange: { start: number; end: number };
  error?: string;
}> {
  try {
    const chromosome = chrom.startsWith("chr") ? chrom : `chr${chrom}`;
    const apiUrl = `https://api.genome.ucsc.edu/getData/sequence?genome=${genomeId};chrom=${chromosome};start=${start - 1};end=${end}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as UcscSequenceRaw;

    const actualRange = { start, end };

    if (data.error ?? !data.dna) {
      return { sequence: "", actualRange, error: data.error };
    }

    const sequence = (data.dna ?? "").toUpperCase();
    return { sequence, actualRange };
  } catch {
    return {
      sequence: "",
      actualRange: { start, end },
      error: "Internal error in fetch gene sequence",
    };
  }
}

export async function fetchClinvarVariants(
  chrom: string,
  geneBound: GeneBounds,
  genomeId: string,
): Promise<ClinvarVariant[]> {
  const minBound = Math.min(geneBound.min, geneBound.max);
  const maxBound = Math.max(geneBound.min, geneBound.max);
  const params = new URLSearchParams({
    chrom,
    minBound: minBound.toString(),
    maxBound: maxBound.toString(),
    genomeId,
  });

  const response = await fetch(`/api/clinvar?${params.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorData.error ?? `ClinVar fetch failed: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { variants: ClinvarVariant[] };
  return data.variants;
}

export async function analyzeVariantWithAPI({
  position,
  alternative,
  genomeId,
  chromosome,
}: {
  position: number;
  alternative: string;
  genomeId: string;
  chromosome: string;
}): Promise<AnalysisResult> {
  const queryParams = new URLSearchParams({
    variant_position: position.toString(),
    alternative: alternative,
    genome: genomeId,
    chromosome: chromosome,
  });

  const response = await fetch(`/api/analyze?${queryParams.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to analyze variant " + errorText);
  }

  return (await response.json()) as AnalysisResult;
}

function getTwinUrl(value: string | undefined, envName: string): string {
  if (!value) {
    throw new Error(`Missing ${envName}. Add it to your .env file.`);
  }
  return value;
}

export async function createTwinProfile(
  profile: TwinProfileRequest,
): Promise<void> {
  const url = getTwinUrl(
    env.NEXT_PUBLIC_TWIN_PROFILE_BASE_URL,
    "NEXT_PUBLIC_TWIN_PROFILE_BASE_URL",
  );
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to create twin profile " + errorText);
  }
}

export async function simulateTwinProfile(params: {
  profile: TwinProfileRequest;
  intervention_focus: string;
  intervention_delta: number;
}): Promise<TwinSimulationResponse> {
  const url = getTwinUrl(
    env.NEXT_PUBLIC_TWIN_SIMULATE_BASE_URL,
    "NEXT_PUBLIC_TWIN_SIMULATE_BASE_URL",
  );
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to simulate twin profile " + errorText);
  }

  return (await response.json()) as TwinSimulationResponse;
}

export async function chatWithTwin(params: {
  message: string;
  profile: TwinProfileRequest;
  simulation: TwinSimulationResponse;
}): Promise<TwinChatResponse> {
  const url = getTwinUrl(
    env.NEXT_PUBLIC_TWIN_CHAT_BASE_URL,
    "NEXT_PUBLIC_TWIN_CHAT_BASE_URL",
  );
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to chat with twin " + errorText);
  }

  return (await response.json()) as TwinChatResponse;
}
