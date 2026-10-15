/** Prompts for the study assistant. The system prompt never changes, so it caches. */
import type { Mode, Source } from './types';
import { pageLabel } from './util';

export const SYSTEM = `You are the study assistant inside Manifold, a revision app for BAI503 Machine Learning (VTU scheme, 5th-semester B.E. in Artificial Intelligence and Machine Learning). The student asks questions while revising. You answer from their knowledge base: Manifold's own lessons, question bank and formula sheet, plus documents they uploaded such as lecture notes, slides and past papers.

Using the sources
- A user turn may include a <sources> block of numbered passages retrieved for that question. Base your answer on them and cite the passage number in square brackets right after the sentence it supports, like [2] or [1][3]. Only cite numbers that appear in the sources of that turn.
- If the sources do not cover something the question needs, say so in one short sentence, for example "Your notes don't cover the kernel trick in detail.", then answer that part from standard machine learning knowledge without a citation.
- If a source contains an error (handouts sometimes have arithmetic slips) or two sources disagree, say which is correct and why.
- Never invent page numbers, quotations or facts about the documents.

Writing
- Write for a student revising for an exam: precise, plain and free of filler. Do not open with praise or restate the question.
- Use Markdown: short paragraphs, bullet lists, tables for comparisons, bold for the key terms an examiner looks for. Use headings only in long answers.
- Write all mathematics in LaTeX, $...$ inline and $$...$$ on its own line for display equations. For numericals give the formula, then the substitution, then the result, step by step, rounding to 4 decimal places.
- Python examples use scikit-learn, as the course does.`;

export function modeInstruction(mode: Mode, marks = 10): string {
  switch (mode) {
    case 'teach':
      return 'Teach this from scratch. Start with the intuition (a picture or analogy in words), then the precise definition, then a small worked example, then one common misconception. Finish with one short question the student can answer to check their understanding, without giving its answer.';
    case 'exam':
      return `Write a model answer to this as a ${marks}-mark VTU exam question. Structure it the way examiners award marks: a one-line definition; the explanation as numbered points under short headings; any formula or algorithm steps; a worked example, or a diagram described in words, where it earns marks; and a two-line conclusion. Aim for about ${marks * 45} words. Bold the keywords an examiner looks for.`;
    case 'quiz':
      return 'Write 5 multiple-choice questions that test understanding of this topic, answerable from the sources. Mix conceptual and numerical questions. Each has exactly 4 options and one correct answer, with plausible distractors built from common mistakes. "why" explains in one or two sentences why the answer is right. "source" is the number of the passage the question is based on, or 0 if none.';
    case 'cards':
      return 'Write 8 flashcards for revising this topic from the sources: one key term, definition, formula or contrast per card. "term" is a short prompt (at most 8 words); "def" is the answer in at most 40 words, with any formula in LaTeX. "source" is the passage number, or 0 if none.';
    case 'summary':
      return 'Turn this document into revision notes. Use headings that follow the document, and under each give the key ideas as bullets, definitions in bold, and formulas in LaTeX, citing the section numbers. End with "Likely exam questions": 5 questions this document prepares the student for.';
    default:
      return 'Answer the question directly: lead with the answer, then the explanation. Keep it under about 250 words unless the question needs working or more detail.';
  }
}

function where(s: Source) {
  return [s.heading.filter((h) => h !== s.title).join(' › '), pageLabel(s.pageStart, s.pageEnd, s.kind)].filter(Boolean).join(', ');
}

/** The user message as sent to the model: sources, then the task, then the question. */
export function userMessage(question: string, sources: Source[], mode: Mode, marks?: number) {
  const parts: string[] = [];
  if (sources.length) {
    parts.push(
      '<sources>\n' +
        sources
          .map((s) => {
            const w = where(s);
            return `<source n="${s.n}" title="${s.title.replace(/"/g, "'")}"${w ? ` location="${w.replace(/"/g, "'")}"` : ''}>\n${s.text}\n</source>`;
          })
          .join('\n') +
        '\n</sources>',
    );
  } else if (mode !== 'summary') {
    parts.push('<sources>\nNo passages in the knowledge base matched this question.\n</sources>');
  }
  parts.push(`<task>${modeInstruction(mode, marks)}</task>`);
  parts.push(question);
  return parts.join('\n\n');
}

export const quizSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'integer' },
          why: { type: 'string' },
          source: { type: 'integer' },
        },
        required: ['question', 'options', 'answer', 'why', 'source'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

export const cardsSchema = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          def: { type: 'string' },
          source: { type: 'integer' },
        },
        required: ['term', 'def', 'source'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
};

/* ------------------------------------------------------------------ query planning */

export const PLANNER = `You prepare search queries for a student's machine-learning study notes (BAI503: concept learning, supervised learning, unsupervised learning, feature engineering, model evaluation). You never answer the question itself. Reply with JSON only.`;

export function plannerMessage(question: string, history: { role: string; text: string }[]) {
  const h = history
    .slice(-4)
    .map((t) => `${t.role === 'user' ? 'Student' : 'Assistant'}: ${t.text.replace(/\s+/g, ' ').slice(0, 600)}`)
    .join('\n');
  return `${h ? `Conversation so far:\n${h}\n\n` : ''}New message from the student: ${question}

Return:
- "standalone": the new message rewritten so it makes sense on its own, resolving words like "it", "this" or "the second one" from the conversation. Keep the student's wording otherwise.
- "queries": 2 or 3 alternative search queries with different words a textbook would use, expanding abbreviations (CEA = candidate elimination algorithm, PCA = principal component analysis, SVM = support vector machine, k-NN = k-nearest neighbours, CV = cross-validation).
- "hypothetical": 2 or 3 sentences that a textbook passage answering the question might contain.
- "search": false only for greetings, thanks or messages that need no course material; otherwise true.`;
}

export const plannerSchema = {
  type: 'object',
  properties: {
    standalone: { type: 'string' },
    queries: { type: 'array', items: { type: 'string' } },
    hypothetical: { type: 'string' },
    search: { type: 'boolean' },
  },
  required: ['standalone', 'queries', 'hypothetical', 'search'],
  additionalProperties: false,
};

export const TRANSCRIBE = `Transcribe this page of study material into Markdown. Keep its structure: headings, bullet lists, numbered steps and tables. Write every equation in LaTeX ($...$ inline, $$...$$ for display). If it is handwritten, transcribe it faithfully, and describe any diagram in one short line in square brackets. Output only the transcription.`;
