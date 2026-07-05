import React from "react";

/**
 * Render text with paragraph breaks, line breaks, bold (**text**), and italics (*text* or _text_).
 */
export function renderFormattedText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((p, pIdx) => {
    // Split by single newlines to preserve them with <br />
    const lines = p.split("\n");

    return (
      <p key={pIdx} className="mb-4 last:mb-0 leading-relaxed">
        {lines.map((line, lIdx) => {
          const parts: React.ReactNode[] = [];
          let currentStr = line;
          let partKeyIdx = 0;

          while (currentStr.length > 0) {
            const boldMatch = currentStr.match(/\*\*([^*]+)\*\*/);
            const asteriskItalicMatch = currentStr.match(/\*([^*]+)\*/);
            const underscoreItalicMatch = currentStr.match(/_([^_]+)_/);

            const matches = [
              boldMatch ? { type: "bold", index: boldMatch.index!, match: boldMatch } : null,
              asteriskItalicMatch ? { type: "italic", index: asteriskItalicMatch.index!, match: asteriskItalicMatch } : null,
              underscoreItalicMatch ? { type: "italic", index: underscoreItalicMatch.index!, match: underscoreItalicMatch } : null,
            ].filter(Boolean) as { type: string; index: number; match: RegExpMatchArray }[];

            if (matches.length === 0) {
              parts.push(currentStr);
              break;
            }

            // Sort matches by their starting index in the string
            matches.sort((a, b) => a.index - b.index);
            const first = matches[0];

            if (first.index > 0) {
              parts.push(currentStr.substring(0, first.index));
            }

            const innerText = first.match[1];
            const uniqueKey = `${pIdx}-${lIdx}-${partKeyIdx++}`;
            if (first.type === "bold") {
              parts.push(
                <strong key={`${uniqueKey}-b`} className="font-bold">
                  {innerText}
                </strong>,
              );
            } else {
              parts.push(
                <em key={`${uniqueKey}-i`} className="italic">
                  {innerText}
                </em>,
              );
            }

            currentStr = currentStr.substring(first.index + first.match[0].length);
          }

          return (
            <React.Fragment key={lIdx}>
              {parts}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </p>
    );
  });
}
