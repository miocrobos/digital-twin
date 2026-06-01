export const TERM_LABELS = {
  genomeAssembly: {
    title: "Reference DNA version",
    subtitle: "Technical: Genome assembly (e.g. hg38)",
  },
  variant: {
    title: "DNA change",
    subtitle: "Technical: Single nucleotide variant (SNV)",
  },
  deltaScore: {
    title: "Change impact score",
    subtitle: "Technical: Delta likelihood score",
  },
  confidence: {
    title: "How sure the model is",
    subtitle: "Technical: Classification confidence",
  },
} as const;

export type RiskTone = "higher" | "lower" | "uncertain";

export function getRiskTone(label: string): RiskTone {
  const normalized = label.toLowerCase();
  if (normalized.includes("pathogenic")) return "higher";
  if (normalized.includes("benign")) return "lower";
  return "uncertain";
}

export function toPlainRiskLabel(label: string): string {
  const tone = getRiskTone(label);
  if (tone === "higher") return "May raise health risk";
  if (tone === "lower") return "Likely lower risk";
  return "Risk is uncertain";
}

export function explainDeltaScore(deltaScore: number): string {
  if (deltaScore < -0.001) {
    return "This DNA change looks meaningfully disruptive in this gene region.";
  }
  if (deltaScore < 0) {
    return "This DNA change may have a mild disruptive effect.";
  }
  if (deltaScore > 0.001) {
    return "This DNA change looks less likely to disrupt function.";
  }
  return "This DNA change appears close to neutral in this context.";
}

export function toNaturalFrequency(percent: number): string {
  const rounded = Math.max(1, Math.round(percent));
  return `${rounded} out of 100`;
}
