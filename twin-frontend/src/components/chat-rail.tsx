"use client";

import { Bot, Plus, SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export type PanelKind =
  | "compare_variants"
  | "explore_dna_region"
  | "lifestyle_what_if";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actionSuggestion?: string;
  expectedImpact?: string;
  uncertaintyNote?: string;
  safetyNote?: string;
  panelTriggers?: Array<{ kind: PanelKind; label: string }>;
};

export const PANEL_CHIP_LABELS: Record<PanelKind, string> = {
  compare_variants: "Compare DNA variants",
  explore_dna_region: "Explore a DNA region",
  lifestyle_what_if: "Try a lifestyle scenario",
};

interface ChatRailProps {
  profileName: string;
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  error: string | null;
  disabled: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onAddPanel: (kind: PanelKind) => void;
}

export function ChatRail({
  profileName,
  messages,
  isLoading,
  input,
  error,
  disabled,
  onInputChange,
  onSend,
  onAddPanel,
}: ChatRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#3c4f3d]/10 bg-white shadow-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-[#3c4f3d]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#de8246]/10">
            <Bot className="h-4 w-4 text-[#de8246]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#3c4f3d]">Your Twin</p>
            <p className="text-[11px] text-[#3c4f3d]/60">
              Future self &middot; {profileName || "You"}
            </p>
          </div>
          <div className="ml-auto flex h-2 w-2 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Message area */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "rounded-tr-sm bg-[#3c4f3d] text-white"
                  : "rounded-tl-sm bg-[#e9eeea] text-[#3c4f3d]"
              }`}
            >
              <p>{msg.content}</p>
              {msg.role === "assistant" && msg.actionSuggestion && (
                <div className="mt-2 space-y-1 border-t border-[#3c4f3d]/10 pt-2 text-xs">
                  <p>
                    <span className="font-medium">Action:</span>{" "}
                    {msg.actionSuggestion}
                  </p>
                  {msg.expectedImpact && (
                    <p className="text-[#3c4f3d]/80">{msg.expectedImpact}</p>
                  )}
                  {msg.safetyNote && (
                    <p className="text-[#3c4f3d]/60">{msg.safetyNote}</p>
                  )}
                </div>
              )}
            </div>

            {/* Panel trigger chips attached to this message */}
            {msg.role === "assistant" &&
              msg.panelTriggers &&
              msg.panelTriggers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {msg.panelTriggers.map((trigger) => (
                    <button
                      key={trigger.kind}
                      onClick={() => onAddPanel(trigger.kind)}
                      className="flex items-center gap-1 rounded-full border border-[#de8246]/30 bg-[#de8246]/5 px-2 py-1 text-[11px] text-[#de8246] transition-colors hover:bg-[#de8246]/15"
                    >
                      <Plus className="h-3 w-3" />
                      {trigger.label}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-tl-sm bg-[#e9eeea] px-4 py-2 text-sm text-[#3c4f3d]/70">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce [animation-delay:0.15s]">·</span>
                <span className="animate-bounce [animation-delay:0.3s]">·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestion chips — visible when conversation is just starting */}
      {messages.length <= 1 && !isLoading && (
        <div className="shrink-0 flex flex-wrap gap-1 border-t border-[#3c4f3d]/5 px-4 py-2">
          {(
            [
              "What should I change this week?",
              "Show me my DNA risk",
              "Compare DNA variants",
            ] as const
          ).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                if (suggestion === "Compare DNA variants") {
                  onAddPanel("compare_variants");
                } else {
                  onInputChange(suggestion);
                }
              }}
              className="rounded-full border border-[#3c4f3d]/15 bg-[#e9eeea]/60 px-2 py-1 text-[11px] text-[#3c4f3d]/70 transition-colors hover:bg-[#e9eeea]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-[#3c4f3d]/10 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask anything — your twin is listening"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSend();
              }
            }}
            className="rounded-full border-[#3c4f3d]/15 text-sm"
          />
          <Button
            onClick={onSend}
            disabled={disabled || !input.trim()}
            size="icon"
            className="shrink-0 cursor-pointer rounded-full bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#3c4f3d]/50">
          Educational use only &middot; Not a diagnostic tool
        </p>
        {error && (
          <p className="mt-1 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
