"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  latex: string;
  className?: string;
}

/**
 * Renders a string that may contain KaTeX math ($...$ inline, $$...$$ display).
 * Non-math text segments are rendered as plain text.
 */
export function MathRenderer({ latex, className }: MathRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const html = renderMixedLatex(latex);
    ref.current.innerHTML = html;
  }, [latex]);

  return <div ref={ref} className={className} />;
}

function renderMixedLatex(input: string): string {
  // Split on $$...$$ (display) and $...$ (inline), handling them in order
  const parts: string[] = [];
  let remaining = input;

  // Process display math first ($$...$$)
  const displayRegex = /\$\$([\s\S]+?)\$\$/g;
  const inlineRegex = /(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g;

  // Replace with placeholders to avoid double-processing
  const segments: Array<{ type: "text" | "display" | "inline"; content: string }> = [];

  let lastIndex = 0;
  const allMatches: Array<{ index: number; end: number; type: "display" | "inline"; math: string }> = [];

  for (const m of input.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) {
    const isDisplay = m[0].startsWith("$$");
    allMatches.push({
      index: m.index!,
      end: m.index! + m[0].length,
      type: isDisplay ? "display" : "inline",
      math: isDisplay ? m[1] : m[2],
    });
  }

  for (const match of allMatches) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: input.slice(lastIndex, match.index) });
    }
    segments.push({ type: match.type, content: match.math });
    lastIndex = match.end;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", content: input.slice(lastIndex) });
  }

  return segments
    .map(seg => {
      if (seg.type === "text") {
        return escapeHtml(seg.content);
      }
      try {
        return katex.renderToString(seg.content, {
          throwOnError: false,
          displayMode: seg.type === "display",
        });
      } catch {
        return escapeHtml(seg.type === "display" ? `$$${seg.content}$$` : `$${seg.content}$`);
      }
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Suppress unused import warnings
void displayRegex;
void inlineRegex;
void parts;
