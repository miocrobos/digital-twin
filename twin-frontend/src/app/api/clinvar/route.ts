import { type NextRequest, NextResponse } from "next/server";

interface ClinVarSearchResponse {
  esearchresult?: {
    idlist?: string[];
  };
}

interface ClinVarVariantInfo {
  title: string;
  obj_type?: string;
  germline_classification?: { description?: string };
  gene_sort?: string;
  location_sort?: string;
}

interface ClinVarSummaryResponse {
  result?: {
    uids?: string[];
  } & Record<string, ClinVarVariantInfo>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chrom = searchParams.get("chrom");
  const minBound = searchParams.get("minBound");
  const maxBound = searchParams.get("maxBound");
  const genomeId = searchParams.get("genomeId");

  if (!chrom || !minBound || !maxBound || !genomeId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  const chromFormatted = chrom.replace(/^chr/i, "");
  const positionField = genomeId === "hg19" ? "chrpos37" : "chrpos38";
  const searchTerm = `${chromFormatted}[chromosome] AND ${minBound}:${maxBound}[${positionField}]`;

  try {
    const searchUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
    const searchParamsObj = new URLSearchParams({
      db: "clinvar",
      term: searchTerm,
      retmode: "json",
      retmax: "20",
    });

    const searchResponse = await fetch(`${searchUrl}?${searchParamsObj.toString()}`);
    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: `ClinVar search failed: ${searchResponse.statusText}` },
        { status: searchResponse.status },
      );
    }

    const searchData = (await searchResponse.json()) as ClinVarSearchResponse;
    if (
      !searchData.esearchresult?.idlist ||
      searchData.esearchresult.idlist.length === 0
    ) {
      return NextResponse.json({ variants: [] });
    }

    const summaryUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
    const summaryParams = new URLSearchParams({
      db: "clinvar",
      id: searchData.esearchresult.idlist.join(","),
      retmode: "json",
    });

    const summaryResponse = await fetch(`${summaryUrl}?${summaryParams.toString()}`);
    if (!summaryResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch variant details: ${summaryResponse.statusText}` },
        { status: summaryResponse.status },
      );
    }

    const summaryData = (await summaryResponse.json()) as ClinVarSummaryResponse;
    const variants: Array<{
      clinvar_id: string;
      title: string;
      variation_type: string;
      classification: string;
      gene_sort: string;
      chromosome: string;
      location: string;
    }> = [];

    if (summaryData.result?.uids) {
      for (const id of summaryData.result.uids) {
        const variant = summaryData.result[id];
        if (!variant) continue;
        variants.push({
          clinvar_id: id,
          title: variant.title,
          variation_type: (variant.obj_type ?? "Unknown")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" "),
          classification: variant.germline_classification?.description ?? "Unknown",
          gene_sort: variant.gene_sort ?? "",
          chromosome: chromFormatted,
          location: variant.location_sort
            ? Number.parseInt(variant.location_sort, 10).toLocaleString()
            : "Unknown",
        });
      }
    }

    return NextResponse.json({ variants });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
