# Manifold — BAI503 Machine Learning, visually

A study companion for the BAI503 Machine Learning syllabus (BMSIT, 5th semester): theory written for the exam, interactive
figures, and step-by-step numerical solvers preloaded with the question bank and the Feb 2025 SEE paper.

## Run it

Double-click **`Start Manifold.bat`** in the folder above this one, or from this folder:

```bash
npm install
npm run dev
```

then open http://localhost:5173. Requires Node.js 20 or newer.

To build a static copy: `npm run build`, then `npm run preview` to serve the `dist/` folder.

## What is inside

| Area | Contents |
| --- | --- |
| Syllabus | 39 lessons across the 5 modules, each with definitions, worked examples, exam-answer blueprints and key takeaways |
| Figures | 58 interactive figures and simulations: Find-S and Candidate-Elimination steppers, k-NN, gradient descent, SVM kernels, decision trees, random forests, AdaBoost, PCA, live t-SNE, k-means, DBSCAN, dendrograms, scaling, binning, transforms, RFE, cross-validation splitters, a live SVM grid search, ROC/PR curves and more |
| Numerical solvers | 22 solvers that show full exam working: Find-S, CEA, linear and logistic regression, k-NN, Naive Bayes, ID3, PCA, eigenvalues, k-means, hierarchical, DBSCAN, t-SNE, encoding, binning, transforms, polynomial regression, k-fold, confusion-matrix metrics, ROC/AUC, multiclass and regression metrics |
| Exam desk | All 104 question-bank questions (tick them off as you master them), the SEE ’25 paper mapped to lessons, a formula sheet, 91 flashcards and a practice quiz |

| Study assistant | Ask questions in five styles (answer, teach me, exam answer, quiz me, flashcards) and get answers that cite the exact passages they used, from the lessons and from your own notes |
| Knowledge base | Add PDFs, Word files, PowerPoint decks, Markdown, text, HTML, notebooks and photos of notes; see every passage, and a map of the whole index |

Progress (lessons understood, questions ticked, best quiz scores) is saved in your browser.

## Study assistant

Open **Study assistant** in the sidebar. It already knows every lesson, the question bank, the SEE paper, the formula sheet
and the flashcards. Add your own material under **Knowledge base**.

To get written answers, connect a model in the assistant's settings (the gear button):

- **Claude** (recommended): paste an API key from [platform.claude.com](https://platform.claude.com/settings/keys). The
  key is kept in this browser and sent only to Anthropic. Opus 5.5 is the default; Sonnet 5.5 and Haiku 5.5 are faster
  and cheaper.
- **Ollama**: free and fully offline. Install [Ollama](https://ollama.com), pull a model (for example
  `ollama pull gemma4:12b`) and choose it in settings. On a laptop CPU expect a minute or more per answer.
- **Other server**: anything with an OpenAI-style chat endpoint, such as LM Studio.

Without a model the assistant still searches and shows the best-matching passages.

### How it finds answers

1. **Reading**: files are parsed in the browser (pdf.js for PDFs, the files' own XML for Word and PowerPoint, including
   speaker notes). Headings, bullets and page numbers are kept; running headers and footers are dropped.
2. **Chunking**: text is split into passages of about 1,000 characters along section boundaries, with a sentence of
   overlap. Each passage is searched together with its document title and section path.
3. **Hybrid search**: BM25 keyword search and semantic search (Snowflake Arctic Embed XS, 384-dimensional vectors, run
   on the GPU through WebGPU when available) each rank the passages. With a model connected, the question is first
   rewritten to stand alone, expanded into alternative queries and paired with an imagined answer (HyDE).
4. **Fusion and reranking**: Reciprocal Rank Fusion merges the rankings, then a cross-encoder (mxbai-rerank-xsmall)
   rereads the top 20 candidates against the question. Neighbouring passages are added for context.
5. **Answering**: the model writes from the numbered passages and cites them like [2]. Click a citation to see the
   passage, open the lesson section, or view the original PDF page. "How it was found" shows every stage, and the
   map projects every passage onto two principal components with your question as a star.

The two search models download once (about 23 MB and 87 MB) and are cached by the browser. Documents, passages,
vectors and conversations are stored in the browser's IndexedDB and never leave your computer; only the question and
the selected passages go to the model you connect.

Scanned pages and photos have no text to search. The knowledge base flags them, and **Transcribe** sends each page
image to a vision-capable model (Claude, or a vision model in Ollama such as gemma4) and indexes the transcription.

## Notes on the supplied answer keys

A few worked answers in the course materials contain slips; the lessons point them out where they matter:

- **ROC example**: the trapezoids sum to 1.00, so AUC = 1.0 (the handout reports 0.83).
- **Multiclass iris example**: weighted recall is 0.90 and macro/weighted F1 ≈ 0.905 (the handout lists 0.9167 / 0.925).
- **Candidate-Elimination (Apple, E5)**: by the algorithm’s rules G = {⟨?, ?, Smooth⟩}, not ⟨Red, ?, Smooth⟩.
- **Laptop decision tree**: Brand has the highest information gain (0.918) and belongs at the root.

## Tech

React 19, TypeScript, Vite, KaTeX for mathematics, Three.js for the home-page loss landscape, and module illustrations
rendered in Blender. The study assistant (`src/rag`) uses Transformers.js for in-browser embeddings and reranking,
pdf.js and JSZip for reading files, react-markdown for answers, and the Anthropic TypeScript SDK for Claude. Every algorithm (concept learning, ID3/CART, SMO-trained SVMs, t-SNE, PCA, clustering, metrics) is
implemented from scratch in `src/lib` so the figures compute live in the browser.
