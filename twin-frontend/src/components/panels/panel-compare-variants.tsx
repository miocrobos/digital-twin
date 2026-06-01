"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { getClassificationColorClasses } from "~/utils/coloring-utils";
import {
  type ClinvarVariant,
  type GeneFromSearch,
  fetchClinvarVariants,
  fetchGeneDetails,
  searchGenes,
} from "~/utils/genome-api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface PanelCompareVariantsProps {
  genomeId: string;
}

export function PanelCompareVariants({ genomeId }: PanelCompareVariantsProps) {
  const [query, setQuery] = useState("");
  const [geneResults, setGeneResults] = useState<GeneFromSearch[]>([]);
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [variants, setVariants] = useState<ClinvarVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSelectedGene(null);
    setVariants([]);
    try {
      const data = await searchGenes(query.trim(), genomeId);
      setGeneResults(data.results.slice(0, 6));
      if (data.results.length === 0) {
        setSearchError("No genes found. Try a symbol like BRCA2 or TP53.");
      }
    } catch {
      setSearchError("Could not search genes. Try a symbol like BRCA2.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGene = async (gene: GeneFromSearch) => {
    setSelectedGene(gene);
    setGeneResults([]);
    setVariantError(null);
    setVariants([]);
    if (!gene.gene_id) {
      setVariantError("No gene ID available for this gene.");
      return;
    }
    setIsLoadingVariants(true);
    try {
      const { geneBounds } = await fetchGeneDetails(gene.gene_id);
      if (!geneBounds) {
        setVariantError("Could not determine boundaries for this gene.");
        return;
      }
      const vars = await fetchClinvarVariants(gene.chrom, geneBounds, genomeId);
      setVariants(vars);
    } catch {
      setVariantError("Could not load variants for this gene.");
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const buildRelationship = (classification: string) => {
    const c = classification.toLowerCase();
    if (c.includes("pathogenic")) return "Associated with higher risk";
    if (c.includes("benign")) return "Not linked to higher risk";
    if (c.includes("uncertain")) return "Evidence is unclear";
    return "Relationship unclear";
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#3c4f3d]/70">
        Search any gene and compare its known DNA variants from ClinVar.
      </p>

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gene symbol (e.g. BRCA2, TP53, APOE)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          className="border-[#3c4f3d]/15 text-sm"
        />
        <Button
          onClick={() => void handleSearch()}
          disabled={isSearching || !query.trim()}
          size="icon"
          className="shrink-0 cursor-pointer bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90"
        >
          {isSearching ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {searchError && (
        <p className="text-xs text-red-500">{searchError}</p>
      )}

      {/* Gene results dropdown */}
      {geneResults.length > 0 && (
        <div className="rounded-md border border-[#3c4f3d]/10 bg-white shadow-sm">
          {geneResults.map((gene, idx) => (
            <button
              key={`${gene.symbol}-${idx}`}
              onClick={() => void handleSelectGene(gene)}
              className="flex w-full items-center justify-between border-b border-[#3c4f3d]/5 px-3 py-2.5 text-left transition-colors hover:bg-[#e9eeea]/50 last:border-b-0"
            >
              <div>
                <span className="text-sm font-medium text-[#3c4f3d]">
                  {gene.symbol}
                </span>
                <span className="ml-2 text-xs text-[#3c4f3d]/60">
                  {gene.name}
                </span>
              </div>
              <span className="text-xs text-[#3c4f3d]/50">{gene.chrom}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected gene + variants */}
      {selectedGene && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-[#e9eeea]/40 px-3 py-2">
            <span className="rounded bg-[#3c4f3d]/10 px-2 py-0.5 text-xs font-semibold text-[#3c4f3d]">
              {selectedGene.symbol}
            </span>
            <span className="text-xs text-[#3c4f3d]/60">
              {selectedGene.chrom} &middot; {selectedGene.name}
            </span>
            <button
              onClick={() => {
                setSelectedGene(null);
                setVariants([]);
              }}
              className="ml-auto text-[11px] text-[#3c4f3d]/50 underline-offset-2 hover:text-[#3c4f3d] hover:underline"
            >
              Change
            </button>
          </div>

          {isLoadingVariants && (
            <div className="flex items-center gap-2 py-6 text-xs text-[#3c4f3d]/70">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3c4f3d]/30 border-t-[#3c4f3d]" />
              Loading ClinVar variants…
            </div>
          )}

          {variantError && (
            <p className="text-xs text-red-500">{variantError}</p>
          )}

          {!isLoadingVariants && variants.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-[#3c4f3d]/60">
                {variants.length} variant{variants.length !== 1 ? "s" : ""}{" "}
                reported in ClinVar
              </p>
              <div className="max-h-72 overflow-y-auto rounded-md border border-[#3c4f3d]/10">
                {variants.map((v) => (
                  <div
                    key={v.clinvar_id}
                    className="flex items-start justify-between border-b border-[#3c4f3d]/5 px-3 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="truncate text-xs font-medium text-[#3c4f3d]">
                        {v.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#3c4f3d]/60">
                        {buildRelationship(v.classification)} &middot;{" "}
                        {v.location}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${getClassificationColorClasses(v.classification)}`}
                    >
                      {v.classification || "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoadingVariants &&
            variants.length === 0 &&
            !variantError &&
            selectedGene && (
              <p className="py-4 text-center text-xs text-[#3c4f3d]/60">
                No ClinVar variants found for {selectedGene.symbol} in this
                genome assembly.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
