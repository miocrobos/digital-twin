"use client";

import { Dna, FlaskConical, Search, ScanSearch } from "lucide-react";
import { useEffect, useState } from "react";
import GeneViewer from "~/components/gene-viewer";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  type ChromosomeFromSeach,
  type GeneFromSearch,
  type GenomeAssemblyFromSearch,
  getAvailableGenomes,
  getGenomeChromosomes,
  searchGenes,
} from "~/utils/genome-api";
import { TERM_LABELS } from "~/utils/plain-language";

type Mode = "browse" | "search";

export default function HomePage() {
  const [genomes, setGenomes] = useState<GenomeAssemblyFromSearch[]>([]);
  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [chromosomes, setChromosomes] = useState<ChromosomeFromSeach[]>([]);
  const [selectedChromosome, setSelectedChromosome] = useState<string>("chr1");
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeneFromSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("search");

  useEffect(() => {
    const fetchGenomes = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableGenomes();
        if (data.genomes?.Human) {
          setGenomes(data.genomes.Human);
        }
      } catch {
        setError("Failed to load genome data");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchGenomes();
  }, []);

  useEffect(() => {
    const fetchChromosomes = async () => {
      try {
        setIsLoading(true);
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes);
        if (data.chromosomes.length > 0) {
          setSelectedChromosome(data.chromosomes[0]!.name);
        }
      } catch {
        setError("Failed to load chromosome data");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchChromosomes();
  }, [selectedGenome]);

  const performGeneSearch = async (
    query: string,
    genome: string,
    filterFn?: (gene: GeneFromSearch) => boolean,
  ) => {
    try {
      setIsLoading(true);
      const data = await searchGenes(query, genome);
      const results = filterFn ? data.results.filter(filterFn) : data.results;
      setSearchResults(results);
    } catch {
      setError("Failed to search genes. Try a gene symbol like BRCA1.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChromosome || mode !== "browse") return;
    void performGeneSearch(
      selectedChromosome,
      selectedGenome,
      (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
    );
  }, [selectedChromosome, selectedGenome, mode]);

  const handleGenomeChange = (value: string) => {
    setSelectedGenome(value);
    setSearchResults([]);
    setSelectedGene(null);
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setSearchResults([]);
    setSelectedGene(null);
    setError(null);
    if (newMode === "browse" && selectedChromosome) {
      void performGeneSearch(
        selectedChromosome,
        selectedGenome,
        (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
      );
    }
    setMode(newMode);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    void performGeneSearch(searchQuery, selectedGenome);
  };

  const loadBRCA1Example = () => {
    setMode("search");
    setSearchQuery("BRCA1");
    void performGeneSearch("BRCA1", selectedGenome);
  };

  return (
    <div className="min-h-screen bg-[#e9eeea]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-[#3c4f3d]/10 bg-white">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-wide text-[#3c4f3d]">
                Twin R&amp;D
              </h1>
              <p className="text-sm text-[#3c4f3d]/70">
                DNA variant analysis and genome research, powered by Evo2
              </p>
            </div>
            <div className="text-xs text-[#3c4f3d]/60">
              Next.js · Modal · Evo2 · UCSC · ClinVar
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {selectedGene ? (
          <GeneViewer
            gene={selectedGene}
            genomeId={selectedGenome}
            onClose={() => setSelectedGene(null)}
          />
        ) : (
          <>
            {/* ── How the tool works ──────────────────────────────────── */}
            <Card className="mb-6 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                  How the tool works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <p className="text-sm text-[#3c4f3d]/80">
                  Twin R&amp;D is a DNA variant research platform. Search any
                  human gene, load its known ClinVar variants, and run Evo2
                  model inference to estimate whether a specific DNA change may
                  raise or lower functional risk — all in one place.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <Search className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Gene search
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      Search by symbol or name across the full human genome
                      (UCSC + NCBI). Browse by chromosome or look up a specific
                      gene.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <Dna className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Variant analysis
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      Load ClinVar-reported variants for any gene and run Evo2
                      inference on individual SNVs to estimate functional
                      impact.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <FlaskConical className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        R&amp;D chat
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      Ask the built-in AI about any gene or variant in context.
                      Get plain-language interpretations and compare findings
                      across genes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Genome assembly selector ─────────────────────────────── */}
            <Card className="mb-6 gap-0 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                    Genome assembly
                  </CardTitle>
                  <div className="text-xs text-[#3c4f3d]/60">
                    Organism: <span className="font-medium">Human</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <Select
                  value={selectedGenome}
                  onValueChange={handleGenomeChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9 w-full border-[#3c4f3d]/10">
                    <SelectValue placeholder="Select genome assembly" />
                  </SelectTrigger>
                  <SelectContent>
                    {genomes.map((genome) => (
                      <SelectItem key={genome.id} value={genome.id}>
                        {genome.id} — {genome.name}
                        {genome.active ? " (active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGenome && (
                  <p className="mt-2 text-xs text-[#3c4f3d]/60">
                    {TERM_LABELS.genomeAssembly.subtitle}.{" "}
                    {genomes.find((g) => g.id === selectedGenome)?.sourceName}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Gene explorer ────────────────────────────────────────── */}
            <Card className="gap-0 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                  Gene explorer
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <Tabs
                  value={mode}
                  onValueChange={(value) => switchMode(value as Mode)}
                >
                  <TabsList className="mb-4 bg-[#e9eeea]">
                    <TabsTrigger
                      className="data-[state=active]:bg-white data-[state=active]:text-[#3c4f3d]"
                      value="search"
                    >
                      Search by gene
                    </TabsTrigger>
                    <TabsTrigger
                      className="data-[state=active]:bg-white data-[state=active]:text-[#3c4f3d]"
                      value="browse"
                    >
                      Browse by chromosome
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="search" className="mt-0">
                    <div className="space-y-4">
                      <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 sm:flex-row"
                      >
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            placeholder="Gene symbol or name (e.g. BRCA1, TP53, APOE)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 border-[#3c4f3d]/10 pr-10"
                          />
                          <Button
                            type="submit"
                            className="absolute top-0 right-0 h-full cursor-pointer rounded-l-none bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90"
                            size="icon"
                            disabled={isLoading || !searchQuery.trim()}
                          >
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search</span>
                          </Button>
                        </div>
                      </form>
                      <Button
                        variant="link"
                        className="h-auto cursor-pointer p-0 text-[#de8246] hover:text-[#de8246]/80"
                        onClick={loadBRCA1Example}
                      >
                        Load BRCA1 as example
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="browse" className="mt-0">
                    <div className="max-h-[150px] overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {chromosomes.map((chrom) => (
                          <Button
                            key={chrom.name}
                            variant="outline"
                            size="sm"
                            className={`h-8 cursor-pointer border-[#3c4f3d]/10 hover:bg-[#e9eeea] hover:text-[#3c4f3d] ${selectedChromosome === chrom.name ? "bg-[#e9eeea] text-[#3c4f3d]" : ""}`}
                            onClick={() => setSelectedChromosome(chrom.name)}
                          >
                            {chrom.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3c4f3d]/30 border-t-[#de8246]" />
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {searchResults.length > 0 && !isLoading && (
                  <div className="mt-6">
                    <p className="mb-2 text-xs text-[#3c4f3d]/70">
                      {mode === "search" ? (
                        <>
                          <span className="font-medium text-[#3c4f3d]">
                            {searchResults.length}
                          </span>{" "}
                          gene{searchResults.length !== 1 ? "s" : ""} found
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-[#3c4f3d]">
                            {searchResults.length}
                          </span>{" "}
                          genes on {selectedChromosome}
                        </>
                      )}
                      {" · Click a row to open the variant analysis view"}
                    </p>

                    <div className="overflow-hidden rounded-md border border-[#3c4f3d]/5">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#e9eeea]/50">
                            <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                              Symbol
                            </TableHead>
                            <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                              Name
                            </TableHead>
                            <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                              Location
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((gene, index) => (
                            <TableRow
                              key={`${gene.symbol}-${index}`}
                              className="cursor-pointer border-b border-[#3c4f3d]/5 hover:bg-[#e9eeea]/50"
                              onClick={() => setSelectedGene(gene)}
                            >
                              <TableCell className="py-2 font-medium text-[#3c4f3d]">
                                {gene.symbol}
                              </TableCell>
                              <TableCell className="py-2 text-[#3c4f3d]">
                                {gene.name}
                              </TableCell>
                              <TableCell className="py-2 text-[#3c4f3d]">
                                {gene.chrom}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {!isLoading && !error && searchResults.length === 0 && (
                  <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
                    <ScanSearch className="mb-4 h-10 w-10 text-gray-300" />
                    <p className="text-sm leading-relaxed">
                      {mode === "search"
                        ? "Search a gene symbol to begin — e.g. BRCA1, TP53, APOE"
                        : selectedChromosome
                          ? "No genes found on this chromosome for this assembly"
                          : "Select a chromosome to browse genes"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
