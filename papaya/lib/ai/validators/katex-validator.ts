import katex from "katex";

/**
 * Validates all KaTeX expressions in a string.
 * Returns null if valid, or an error message if any expression is invalid.
 */
export function validateKaTeX(text: string): string | null {
  // Extract all $...$ and $$...$$ blocks
  const displayMatches = text.matchAll(/\$\$([\s\S]+?)\$\$/g);
  const inlineMatches = text.matchAll(/\$([^$]+?)\$/g);

  for (const match of displayMatches) {
    try {
      katex.renderToString(match[1], { throwOnError: true, displayMode: true });
    } catch (e) {
      return `Invalid display LaTeX "$$${match[1]}$$": ${(e as Error).message}`;
    }
  }

  for (const match of inlineMatches) {
    try {
      katex.renderToString(match[1], { throwOnError: true, displayMode: false });
    } catch (e) {
      return `Invalid inline LaTeX "$${match[1]}$": ${(e as Error).message}`;
    }
  }

  return null;
}

/** Validates KaTeX in all text fields of a generated problem */
export function validateProblemKaTeX(problem: {
  stem_latex: string;
  choices?: Array<{ latex: string }> | null;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  explanation: string;
}): string | null {
  const fields = [
    ["stem_latex", problem.stem_latex],
    ["hint_1", problem.hint_1],
    ["hint_2", problem.hint_2],
    ["hint_3", problem.hint_3],
    ["explanation", problem.explanation],
  ];

  if (problem.choices) {
    for (const choice of problem.choices) {
      fields.push([`choice_${choice.latex}`, choice.latex]);
    }
  }

  for (const [fieldName, text] of fields) {
    const err = validateKaTeX(text);
    if (err) return `Field "${fieldName}": ${err}`;
  }

  return null;
}
