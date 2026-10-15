# Manifold

**A visual study companion for BAI503 Machine Learning** (VTU, 5th semester AI & ML).
Theory written for the exam, interactive figures you can drag and break, step-by-step numerical solvers, and a study
assistant that answers from the lessons and from your own notes, with the source of every answer shown.

|  |  |
| --- | --- |
| **39 lessons** | Every topic in the five modules: definitions, worked examples, exam-answer blueprints, key takeaways |
| **58 interactive figures** | Candidate-Elimination, k-NN, SVM kernels, trees, PCA, live t-SNE, k-means, DBSCAN, ROC curves and more |
| **22 numerical solvers** | Full exam-style working, preloaded with question-bank data; type in your own numbers |
| **Exam desk** | 104 question-bank questions, the SEE Feb 2025 paper mapped to lessons, formula sheet, 91 flashcards, 60-question quiz |
| **Study assistant** | Ask in five styles, upload your own PDFs, slides and notes, and get cited answers |

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

On Windows, double-click **`Start Manifold.bat`**. Or from a terminal:

```bash
cd manifold
npm install
npm run dev
```

Then open <http://localhost:5173>.

### With Docker

```bash
cd manifold
docker compose up --build -d
```

Open <http://localhost:8080>. Use `localhost`, not a network address: GPU search needs a secure page.
Documents and settings are stored per address in the browser, so `:5173` and `:8080` keep separate data.

## Study assistant

Open **Study assistant** in the sidebar. It already knows every lesson, the question bank, the SEE paper, the formula
sheet and the flashcards. Add your own material under **Knowledge base**: PDF, Word, PowerPoint, Markdown, text, HTML,
Jupyter notebooks and photos of notes.

Pick an answer style: **Answer**, **Teach me**, **Exam answer** (5, 8 or 10 marks), **Quiz me** or **Flashcards**.
You can also summarise a whole document. Click any citation like [2] to see the passage, jump to the lesson section
or view the original PDF page.

### Connect a model

Without one, the assistant still searches and shows the best-matching passages. For written answers, open the gear
icon and choose:

| Provider | Notes |
| --- | --- |
| **Claude** | Paste an API key from [platform.claude.com](https://platform.claude.com/settings/keys). Opus 5.5 by default; Sonnet 5.5 and Haiku 5.5 are faster and cheaper. The key stays in your browser and goes only to Anthropic. |
| **Ollama** | Free and offline. Install [Ollama](https://ollama.com), run `ollama pull gemma4:12b`, then pick it in settings. On a CPU expect minutes per answer. |
| **Other server** | Anything with an OpenAI-style chat endpoint, such as LM Studio. |

### How it finds answers

1. **Read**: files are parsed in the browser (pdf.js, and the Office files' own XML including speaker notes).
   Headings, bullets and page numbers are kept; running headers and footers are dropped.
2. **Chunk**: passages of about 1,000 characters, split along section boundaries with a sentence of overlap.
3. **Search two ways**: BM25 keyword search plus semantic search (Snowflake Arctic Embed XS, 384-d vectors, on the GPU
   through WebGPU when available). With a model connected, the question is first rewritten to stand alone, expanded
   into alternative queries and paired with an imagined answer (HyDE).
4. **Fuse and rerank**: Reciprocal Rank Fusion merges the rankings, then a cross-encoder (mxbai-rerank-xsmall) rereads
   the top 20 candidates against the question.
5. **Answer**: the model writes from the numbered passages and cites them. **How it was found** shows every stage, and
   the **Map** plots all passages on two principal components with your question as a star.

The two search models (about 23 MB and 87 MB) download once and are cached by the browser. Documents, vectors and
conversations live in the browser's IndexedDB. Only your question and the selected passages go to the model you connect.

Scanned pages and photos have no text layer, so they are flagged; **Transcribe** has a vision-capable model read each
page and indexes the result.

## Notes on the supplied answer keys

A few worked answers in the course handouts contain slips. The lessons point them out where they matter:

- **ROC example**: the trapezoids sum to 1.00, so AUC = 1.0 (the handout says 0.83).
- **Multiclass iris example**: weighted recall is 0.90 and macro/weighted F1 is about 0.905 (the handout lists 0.9167 / 0.925).
- **Candidate-Elimination, Apple, E5**: by the algorithm's rules G = {⟨?, ?, Smooth⟩}, not ⟨Red, ?, Smooth⟩.
- **Laptop decision tree**: Brand has the highest information gain (0.918) and belongs at the root.

## Project layout

```
manifold/
  src/content/   lessons (m1..m5), question bank, formulas, flashcards, quiz
  src/viz/       interactive figures
  src/lab/       numerical solvers
  src/lib/       every ML algorithm, implemented from scratch
  src/rag/       study assistant: parsing, chunking, search, models
  src/pages/     routes, including Assistant and Library
  public/art/    module illustrations rendered in Blender
drive-download-…/   the course materials the app is based on
```

## Tech

React 19, TypeScript, Vite, KaTeX, Three.js (home-page loss landscape), Blender renders for the module art.
The assistant uses Transformers.js for in-browser embeddings and reranking, pdf.js and JSZip for reading files,
react-markdown for answers and the Anthropic TypeScript SDK for Claude.

`npm run build` makes a static copy in `manifold/dist`; `npm run preview` serves it.
