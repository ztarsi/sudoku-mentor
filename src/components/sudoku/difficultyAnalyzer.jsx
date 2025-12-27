// Analyze Sudoku puzzle difficulty based on solving techniques required

import { generateCandidates, findNextLogicStep } from './logicEngine';

const TECHNIQUE_SCORES = {
  'Naked Single': 1,
  'Hidden Single': 1,
  'Pointing Pair': 2,
  'Pointing Triple': 2,
  'Claiming': 2,
  'Naked Pair': 3,
  'Hidden Pair': 3,
  'Naked Triple': 4,
  'X-Wing': 5,
  'Swordfish': 6,
  'XY-Wing': 6,
  'X-Cycle': 8,
  'Finned X-Wing': 8,
  'ALS-XZ': 9,
  'Unique Rectangle Type 1': 9,
  'BUG+1': 10
};

export const analyzeDifficulty = (puzzleArray) => {
  // Create grid from puzzle array
  let grid = puzzleArray.map((value, index) => ({
    cellIndex: index,
    value: value || null,
    isFixed: value !== 0,
    candidates: [],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false
  }));

  grid = generateCandidates(grid);

  const techniques = [];
  let maxScore = 0;
  let totalScore = 0;
  let iterations = 0;
  const maxIterations = 100; // Safety limit

  // Simulate solving to find required techniques
  while (iterations < maxIterations) {
    const step = findNextLogicStep(grid, null);
    
    if (!step) break;
    
    techniques.push(step.technique);
    const score = TECHNIQUE_SCORES[step.technique] || 0;
    totalScore += score;
    maxScore = Math.max(maxScore, score);

    // Apply the step
    if (step.placement) {
      const { cell, digit } = step.placement;
      grid[cell].value = digit;
      grid[cell].candidates = [];
    }
    
    if (step.eliminations) {
      step.eliminations.forEach(elim => {
        grid[elim.cell].candidates = grid[elim.cell].candidates.filter(d => d !== elim.digit);
      });
    }

    grid = generateCandidates(grid);
    iterations++;
  }

  // Calculate difficulty based on max technique and average
  const avgScore = techniques.length > 0 ? totalScore / techniques.length : 0;
  
  // Determine difficulty level
  if (maxScore <= 1) return 'easy';
  if (maxScore <= 2) return 'medium';
  if (maxScore <= 4) return 'hard';
  if (maxScore <= 6) return 'expert';
  if (maxScore <= 8) return 'diabolical';
  return 'ultimate';
};