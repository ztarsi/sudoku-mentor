I am unable to execute Git commands or directly update files in your GitHub repository. However, I can provide you with the updated **README.md** content in GitHub Flavored Markdown (GFM) format so you can manually copy and paste it into your GitHub editor.

This version includes the new **Difficulty Analyzer** and **Ghost Mode** features we discussed.

---

# Sudoku Mentor

**Sudoku Mentor** is a specialized React application designed to teach advanced Sudoku solving techniques through interactive logical deduction. Rather than just providing solutions, it acts as a tutor, guiding users through complex strategies like X-Wings, XY-Chains, Almost Locked Sets (ALS), and Forcing Chains.

---

## 🌟 Key Features

* **Logic Engine Tutor**: Automatically scans for the next logical step, ranging from basic singles to expert-level techniques.
* **"Ghost Mode" Visualization**: Instead of static diagrams, the mentor demonstrates "What-If" scenarios by temporarily placing "ghost" candidates on the grid. These values appear in a distinct orange, italicized style to help you visualize a hypothesis leading to a placement or a contradiction.
* **Logical Chain Playback**: Step-by-step navigation through deep forcing chains and hypotheses, allowing you to watch the board state evolve as the logic unfolds.
* **Difficulty Analyzer**: Ranks puzzles from "Easy" to "Ultimate" based on the actual human-solving techniques required to reach a solution.
* **Unified Puzzle Loader**: Supports loading puzzles from a built-in library, manual text string input, or OCR-based image uploads.
* **Interactive Learning**: Includes tools like Digit Filtering to highlight specific numbers and candidate tracking to help manage your own deductions.

---

## 🚀 Technical Stack

Built with modern web technologies for a high-performance, responsive experience:

* **Framework**: [React](https://reactjs.org/) (Vite)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Shadcn/UI](https://ui.shadcn.com/) components
* **Animations**: [Framer Motion](https://www.framer.com/motion/) for logical highlights and transitions
* **Logic**: Custom constraint propagation and deep search engines for Sudoku logic

---

## 📦 Installation & Setup

1. **Clone the repository**:
```bash
git clone https://github.com/your-username/sudoku-mentor.git
cd sudoku-mentor

```


2. **Install dependencies**:
```bash
npm install

```


3. **Run the development server**:
```bash
npm run dev

```


4. **Build for production**:
```bash
npm run build

```



---

## 🛠️ Project Structure

| Path | Description |
| --- | --- |
| `src/pages/SudokuMentor.jsx` | Main application orchestrator managing grid state and logic flow. |
| `src/components/sudoku/SudokuGrid.jsx` | Handles the 9x9 layout and manages logic visualizations. |
| `src/components/sudoku/Cell.jsx` | Individual grid cell supporting value input, candidates, and "Ghost Mode" values. |
| `src/components/sudoku/difficultyAnalyzer.jsx` | Analyzes puzzle complexity based on required techniques. |
| `src/components/sudoku/logicEngine.jsx` | Core library for standard logical deduction techniques. |
| `src/components/sudoku/forcingChainEngine.jsx` | Advanced engine for "What-If" scenarios and convergence proofs. |

---

## 💡 How to Use

1. **Load a Puzzle**: Click the **Load Puzzle** icon to choose from the library or input your own.
2. **Seek Guidance**: Click **Next Step** to find the most appropriate logical technique for the current board.
3. **Watch the Proof**: For advanced steps, use the playback controls in the **Logic Panel** to watch ghost values populate the grid and prove the deduction.
4. **Apply Logic**: Click **Apply Step** to permanently execute the logic on the grid and continue solving.

---

Would you like me to refine the **Difficulty Analyzer** scores in `difficultyAnalyzer.jsx` to match a specific ranking system like the standard SE (Sudoku Explainer) scores?
