import { type NextRequest, NextResponse } from "next/server";

interface AnalysisResult {
  position: number;
  reference: string;
  alternative: string;
  delta_score: number;
  prediction: string;
  classification_confidence: number;
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const variantPosition = searchParams.get("variant_position");
  const alternative = searchParams.get("alternative");
  const genome = searchParams.get("genome");
  const chromosome = searchParams.get("chromosome");

  if (!variantPosition || !alternative || !genome || !chromosome) {
    return NextResponse.json(
      {
        error:
          "Missing required parameters: variant_position, alternative, genome, chromosome",
      },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_ANALYZE_SINGLE_VARIANT_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Analysis endpoint not configured" },
      { status: 500 },
    );
  }

  try {
    const requestBody = {
      variant_position: Number.parseInt(variantPosition, 10),
      alternative,
      genome,
      chromosome,
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Analysis failed: ${response.status} ${errorText}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as AnalysisResult;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
