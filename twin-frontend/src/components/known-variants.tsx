"use client";

import {
  analyzeVariantWithAPI,
  type ClinvarVariant,
  type GeneFromSearch,
} from "~/utils/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  BarChart2,
  ExternalLink,
  RefreshCw,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { getClassificationColorClasses } from "~/utils/coloring-utils";
import { TERM_LABELS, toPlainRiskLabel } from "~/utils/plain-language";

export default function KnownVariants({
  refreshVariants,
  showComparison,
  updateClinvarVariant,
  clinvarVariants,
  isLoadingClinvar,
  clinvarError,
  genomeId,
  gene,
}: {
  refreshVariants: () => void;
  showComparison: (variant: ClinvarVariant) => void;
  updateClinvarVariant: (id: string, newVariant: ClinvarVariant) => void;
  clinvarVariants: ClinvarVariant[];
  isLoadingClinvar: boolean;
  clinvarError: string | null;
  genomeId: string;
  gene: GeneFromSearch;
}) {
  const buildRelationshipLabel = (classification: string) => {
    const normalized = classification.toLowerCase();
    if (normalized.includes("pathogenic")) return "Associated with higher risk";
    if (normalized.includes("benign")) return "Not linked to higher risk";
    if (normalized.includes("uncertain")) return "Relationship is still unclear";
    return "Relationship not yet established";
  };

  const exportAsPdf = () => {
    const rowsHtml = clinvarVariants
      .map(
        (variant) => `
          <tr>
            <td>${variant.variation_type.toLowerCase().includes("single nucleotide") ? (variant.evo2Result ? "Compare Results" : "Analyze with Evo2") : "No Evo2 action"}</td>
            <td>${buildRelationshipLabel(variant.classification || "")}</td>
            <td>${variant.title}</td>
          </tr>
        `,
      )
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>ClinVar Variant Summary - ${gene.symbol}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { font-size: 20px; margin-bottom: 6px; }
            p { font-size: 12px; margin-top: 0; color: #4b5563; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>DNA changes summary (${gene.symbol})</h1>
          <p>Source: ClinVar classifications interpreted in plain language for educational use.</p>
          <table>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Relationships</th>
                <th>Variant</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const analyzeVariant = async (variant: ClinvarVariant) => {
    let variantDetails = null;
    const position = variant.location
      ? parseInt(variant.location.replaceAll(",", ""))
      : null;

    const refAltMatch = /(\w)>(\w)/.exec(variant.title);

    if (refAltMatch && refAltMatch.length === 3) {
      variantDetails = {
        position,
        reference: refAltMatch[1],
        alternative: refAltMatch[2],
      };
    }

    if (
      !variantDetails?.position ||
      !variantDetails.reference ||
      !variantDetails.alternative
    ) {
      return;
    }

    updateClinvarVariant(variant.clinvar_id, {
      ...variant,
      isAnalyzing: true,
    });

    try {
      const data = await analyzeVariantWithAPI({
        position: variantDetails.position,
        alternative: variantDetails.alternative,
        genomeId: genomeId,
        chromosome: gene.chrom,
      });

      const updatedVariant: ClinvarVariant = {
        ...variant,
        isAnalyzing: false,
        evo2Result: data,
      };

      updateClinvarVariant(variant.clinvar_id, updatedVariant);

      showComparison(updatedVariant);
    } catch (error) {
      updateClinvarVariant(variant.clinvar_id, {
        ...variant,
        isAnalyzing: false,
        evo2Error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  };
  return (
    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
        <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
          DNA changes already reported for this gene
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshVariants}
          disabled={isLoadingClinvar}
          className="h-7 cursor-pointer text-xs text-[#3c4f3d] hover:bg-[#e9eeea]/70"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportAsPdf}
          disabled={clinvarVariants.length === 0}
          className="ml-2 h-7 cursor-pointer border-[#3c4f3d]/20 bg-white px-2 text-xs text-[#3c4f3d] hover:bg-[#e9eeea]/70"
        >
          Export PDF
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {clinvarError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-600">
            {clinvarError}
          </div>
        )}

        {isLoadingClinvar ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3c4f3d]/30 border-t-[#3c4f3d]"></div>
          </div>
        ) : clinvarVariants.length > 0 ? (
          <div className="h-96 max-h-96 overflow-y-scroll rounded-md border border-[#3c4f3d]/5">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-[#e9eeea]/80 hover:bg-[#e9eeea]/30">
                  <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                    Actions
                  </TableHead>
                  <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                    Relationships
                  </TableHead>
                  <TableHead className="py-2 text-xs font-medium text-[#3c4f3d]">
                    Variant
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinvarVariants.map((variant) => (
                  <TableRow
                    key={variant.clinvar_id}
                    className="border-b border-[#3c4f3d]/5"
                  >
                    <TableCell className="py-2 text-xs">
                      <div className="flex flex-col items-start gap-1">
                        {variant.variation_type
                          .toLowerCase()
                          .includes("single nucleotide") ? (
                          !variant.evo2Result ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-[#3c4f3d]/20 bg-[#e9eeea] px-3 text-xs text-[#3c4f3d] hover:bg-[#3c4f3d]/10"
                              disabled={variant.isAnalyzing}
                              onClick={() => analyzeVariant(variant)}
                            >
                              {variant.isAnalyzing ? (
                                <>
                                  <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#3c4f3d]/30 border-t-[#3c4f3d]"></span>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-1 inline-block h-3 w-3" />
                                  Analyze with Evo2
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-green-200 bg-green-50 px-3 text-xs text-green-700 hover:bg-green-100"
                              onClick={() => showComparison(variant)}
                            >
                              <BarChart2 className="mr-1 inline-block h-3 w-3" />
                              Compare Results
                            </Button>
                          )
                        ) : (
                          <span className="text-[11px] text-[#3c4f3d]/60">
                            Evo2 supports single-letter DNA changes only.
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      <div
                        className={`w-fit rounded-md px-2 py-1 text-center font-normal ${getClassificationColorClasses(variant.classification)}`}
                      >
                        {variant.classification || "Unknown"}
                      </div>
                      <p className="mt-1 text-[11px] text-[#3c4f3d]/70">
                        {buildRelationshipLabel(variant.classification || "")}
                      </p>
                      {variant.evo2Result && (
                        <div className="mt-2">
                          <div
                            className={`flex w-fit items-center gap-1 rounded-md px-2 py-1 text-center ${getClassificationColorClasses(variant.evo2Result.prediction)}`}
                          >
                            <Shield className="h-3 w-3" />
                            <span>Evo2: {variant.evo2Result.prediction}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#3c4f3d]/70">
                            {toPlainRiskLabel(variant.evo2Result.prediction)}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-xs font-medium text-[#3c4f3d]">
                        {variant.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#3c4f3d]/70">
                        <p>Location: {variant.location}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-6 cursor-pointer px-0 text-xs text-[#de8246] hover:text-[#de8246]/80"
                          onClick={() =>
                            window.open(
                              `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_id}`,
                              "_blank",
                            )
                          }
                        >
                          View in ClinVar
                          <ExternalLink className="ml-1 inline-block h-2 w-2" />
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-[#3c4f3d]/60">
                        {TERM_LABELS.variant.subtitle}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
            <Search className="mb-4 h-10 w-10 text-gray-300" />
            <p className="text-sm leading-relaxed">
              No ClinVar variants found for this gene.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
