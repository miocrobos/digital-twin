"use client";

import { X } from "lucide-react";
import type { PanelKind } from "./chat-rail";
import { PanelCompareVariants } from "./panels/panel-compare-variants";

export type ActivePanel = {
  id: string;
  kind: PanelKind;
  payload?: Record<string, string>;
};

interface DynamicInsightPanelsProps {
  panels: ActivePanel[];
  genomeId: string;
  onRemovePanel: (id: string) => void;
}

const PANEL_LABELS: Record<PanelKind, string> = {
  compare_variants: "Compare DNA variants",
  explore_dna_region: "Explore a DNA region",
  lifestyle_what_if: "Lifestyle scenario",
};

export function DynamicInsightPanels({
  panels,
  genomeId,
  onRemovePanel,
}: DynamicInsightPanelsProps) {
  if (panels.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#3c4f3d]/10" />
        <span className="text-[11px] text-[#3c4f3d]/50 whitespace-nowrap">
          Panels added by your twin
        </span>
        <div className="h-px flex-1 bg-[#3c4f3d]/10" />
      </div>

      {panels.map((panel) => (
        <div
          key={panel.id}
          className="rounded-xl border border-[#3c4f3d]/10 bg-white shadow-sm"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#3c4f3d]/10 px-4 py-3">
            <p className="text-sm font-medium text-[#3c4f3d]">
              {PANEL_LABELS[panel.kind]}
            </p>
            <button
              onClick={() => onRemovePanel(panel.id)}
              className="rounded-md p-1 text-[#3c4f3d]/40 transition-colors hover:bg-[#e9eeea] hover:text-[#3c4f3d]"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel content */}
          <div className="p-4">
            {panel.kind === "compare_variants" && (
              <PanelCompareVariants genomeId={genomeId} />
            )}
            {panel.kind === "explore_dna_region" && (
              <p className="py-6 text-center text-sm text-[#3c4f3d]/60">
                Use the DNA explorer in Step 6 above to search genes and open
                the full variant analysis flow.
              </p>
            )}
            {panel.kind === "lifestyle_what_if" && (
              <p className="py-6 text-center text-sm text-[#3c4f3d]/60">
                Adjust the intervention focus and delta in Step 2 above and
                click Re-run to see updated projections.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
