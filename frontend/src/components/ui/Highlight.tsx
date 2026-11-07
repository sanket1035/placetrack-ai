import type { ReactNode } from "react";

/**
 * Renders a heading with its key words picked out by the yellow highlighter style
 * from the design system. By default the last `words` words (before trailing
 * punctuation) are highlighted; pass `phrase` to highlight a specific phrase.
 */
export function HighlightedTitle({ text, phrase, words = 2 }: { text: string; phrase?: string; words?: number }): ReactNode {
  if (phrase) {
    const at = text.indexOf(phrase);
    if (at >= 0) {
      return <>{text.slice(0, at)}<mark className="hl">{phrase}</mark>{text.slice(at + phrase.length)}</>;
    }
  }
  const match = text.match(/^(.*?)((?:\S+\s+){0,}\S+?)([.!?]*)$/);
  const tokens = text.replace(/[.!?]+$/, "").split(/\s+/);
  if (!match || tokens.length < 2) return <>{text}</>;
  const take = Math.min(words, Math.max(1, tokens.length - 1));
  const tail = tokens.slice(-take).join(" ");
  const head = tokens.slice(0, -take).join(" ");
  const punct = text.match(/[.!?]+$/)?.[0] ?? "";
  return <>{head} <mark className="hl">{tail}</mark>{punct}</>;
}
