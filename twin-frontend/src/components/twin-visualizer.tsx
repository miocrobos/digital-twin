"use client";

import dynamic from "next/dynamic";

const TwinVisualizerScene = dynamic(() => import("./twin-visualizer-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-md border border-[#3c4f3d]/10 bg-white text-sm text-[#3c4f3d]/70">
      Loading 3D twin view...
    </div>
  ),
});

export function TwinVisualizer({
  geneSymbol,
  chromosome,
  genomeAssembly,
}: {
  geneSymbol?: string;
  chromosome?: string;
  genomeAssembly: string;
}) {
  const emphasis = geneSymbol
    ? `${geneSymbol} on ${chromosome ?? "selected chromosome"} (${genomeAssembly})`
    : `Lifestyle + DNA context (${genomeAssembly})`;

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#3c4f3d]/80">
        This visual helps explain where your DNA context sits in your whole-body
        twin.
      </p>
      <TwinVisualizerScene emphasizeLabel={emphasis} />
      <p className="text-[11px] text-[#3c4f3d]/60">
        To use custom model assets, place `dna-helix.glb` and `human-body.glb` in
        `twin-frontend/public/models/`.
      </p>
    </div>
  );
}
