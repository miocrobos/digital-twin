import type { ClinvarVariant } from "~/utils/genome-api";
import { Button } from "./ui/button";
import { Check, ExternalLink, Shield, X } from "lucide-react";
import {
  getClassificationColorClasses,
  getRiskToneBarClass,
  getNucleotideColorClass,
} from "~/utils/coloring-utils";
import {
  TERM_LABELS,
  explainDeltaScore,
  toNaturalFrequency,
  toPlainRiskLabel,
} from "~/utils/plain-language";

export function VariantComparisonModal({
  comparisonVariant,
  onClose,
}: {
  comparisonVariant: ClinvarVariant | null;
  onClose: () => void;
}) {
  if (!comparisonVariant?.evo2Result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
        {/* Modal header */}
        <div className="border-b border-[#3c4f3d]/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[#3c4f3d]">
              DNA change comparison
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 cursor-pointer p-0 text-[#3c4f3d]/70 hover:bg-[#9eeea]/70 hover:text-[#3c4f3d]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-5">
          {comparisonVariant?.evo2Result && (
            <div className="space-y-6">
              <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/30 p-4">
                <h4 className="mb-3 text-sm font-medium text-[#3c4f3d]">
                  DNA change details
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs text-[#3c4f3d]/70">
                          DNA position:
                        </span>
                        <span className="text-xs">
                          {comparisonVariant.location}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-xs text-[#3c4f3d]/70">
                          Change type:
                        </span>
                        <span className="text-xs">
                          {comparisonVariant.variation_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs text-[#3c4f3d]/70">
                          DNA letters:
                        </span>
                        <span className="font-mono text-xs">
                          {(() => {
                            const match =
                              /(\w)>(\w)/.exec(comparisonVariant.title);
                            if (match && match.length === 3) {
                              const [, ref, alt] = match;
                              return (
                                <>
                                  <span
                                    className={getNucleotideColorClass(ref!)}
                                  >
                                    {ref}
                                  </span>
                                  <span>{">"}</span>
                                  <span
                                    className={getNucleotideColorClass(alt!)}
                                  >
                                    {alt}
                                  </span>
                                </>
                              );
                            }
                            return comparisonVariant.title;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-28 text-xs text-[#3c4f3d]/70">
                          ClinVar ID:
                        </span>
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${comparisonVariant.clinvar_id}`}
                          className="text-xs text-[#de8246] hover:underline"
                          target="_blank"
                        >
                          {comparisonVariant.clinvar_id}
                        </a>
                        <ExternalLink className="ml-1 inline-block h-3 w-3 text-[#de8246]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant results */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-[#3c4f3d]">
                  What each source says
                </h4>
                <div className="rounded-md border border-[#3c4f3d]/10 bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* ClinVar Assesment */}
                    <div className="rounded-md bg-[#e9eeea]/50 p-4">
                      <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-[#3c4f3d]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3c4f3d]/10">
                          <span className="h-3 w-3 rounded-full bg-[#3c4f3d]"></span>
                        </span>
                        ClinVar Assessment
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`w-fit rounded-md px-2 py-1 text-xs font-normal ${getClassificationColorClasses(comparisonVariant.classification)}`}
                        >
                          {comparisonVariant.classification ||
                            "Unknown significance"}
                        </div>
                        <p className="mt-2 text-xs text-[#3c4f3d]/70">
                          {toPlainRiskLabel(comparisonVariant.classification)}
                        </p>
                      </div>
                    </div>

                    {/* Evo2 Prediction */}
                    <div className="rounded-md bg-[#e9eeea]/50 p-4">
                      <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-[#3c4f3d]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3c4f3d]/10">
                          <span className="h-3 w-3 rounded-full bg-[#de8246]"></span>
                        </span>
                        Evo2 Prediction
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-normal ${getClassificationColorClasses(comparisonVariant.evo2Result.prediction)}`}
                        >
                          <Shield className="h-3 w-3" />
                          {comparisonVariant.evo2Result.prediction}
                        </div>
                        <p className="mt-2 text-xs text-[#3c4f3d]/70">
                          {toPlainRiskLabel(comparisonVariant.evo2Result.prediction)}
                        </p>
                      </div>
                      {/* Delta score */}
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-[#3c4f3d]/70">
                          {TERM_LABELS.deltaScore.title}:
                        </div>
                        <div className="text-sm font-medium">
                          {comparisonVariant.evo2Result.delta_score.toFixed(6)}
                        </div>
                        <div className="text-xs text-[#3c4f3d]/60">
                          {explainDeltaScore(
                            comparisonVariant.evo2Result.delta_score,
                          )}
                        </div>
                      </div>
                      {/* Confidence bar */}
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-[#3c4f3d]/70">
                          {TERM_LABELS.confidence.title}:
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-[#e9eeea]/80">
                          <div
                            className={`h-2 rounded-full ${getRiskToneBarClass(comparisonVariant.evo2Result.prediction)}`}
                            style={{
                              width: `${Math.min(100, comparisonVariant.evo2Result.classification_confidence * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="mt-1 text-right text-xs text-[#3c4f3d]/60">
                          {Math.round(
                            comparisonVariant.evo2Result
                              .classification_confidence * 100,
                          )}
                          %
                        </div>
                        <p className="text-xs text-[#3c4f3d]/60">
                          About{" "}
                          {toNaturalFrequency(
                            comparisonVariant.evo2Result.classification_confidence *
                              100,
                          )}{" "}
                          similar predictions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assesment Agreement */}
                  <div className="mt-4 rounded-md bg-[#e9eeea]/20 p-3 text-xs leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${comparisonVariant.classification.toLowerCase() === comparisonVariant.evo2Result.prediction.toLowerCase() ? "bg-green-100" : "bg-yellow-100"}`}
                      >
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase() ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <span className="flex h-3 w-3 items-center justify-center text-yellow-600">
                            <p>!</p>
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-[#3c4f3d]">
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase()
                          ? "Both sources point in the same direction."
                          : "The two sources disagree. Treat this as uncertain."}
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-[#3c4f3d]/70">
                        Scientific details
                      </summary>
                      <p className="mt-1 text-[11px] text-[#3c4f3d]/60">
                        {TERM_LABELS.variant.subtitle}. {TERM_LABELS.deltaScore.subtitle}.
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end border-t border-[#3c4f3d]/10 bg-[#e9eeea]/30 p-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer border-[#3c4f3d]/10 bg-white text-[#3c4f3d] hover:bg-[#e9eeea]/70"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
