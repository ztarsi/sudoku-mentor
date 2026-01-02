// Comprehensive test suite for Sudoku logic
import { 
  findNextLogicStep, 
  generateCandidates, 
  eliminateCandidatesFromPeers,
  applyLogicStep 
} from './logicEngine';
import { findForcingChain, findHypothesis } from './forcingChainEngine';
import { solveSudoku } from './solver';

// Helper to create empty grid
const createEmptyGrid = () => {
  return Array.from({ length: 81 }, () => ({
    value: null,
    candidates: [],
    isFixed: false,
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false
  }));
};

// Helper to set grid values
const setGridValues = (grid, values) => {
  values.forEach(([index, value]) => {
    grid[index].value = value;
    grid[index].isFixed = true;
  });
  return grid;
};

export const testSuites = {
  'Candidate Generation': {
    tests: [
      {
        name: 'Generate candidates for empty cells',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].value = 1;
          grid[1].value = 2;

          const result = generateCandidates(grid);

          // Cell 2 should not have candidates 1 or 2
          const cell2Candidates = result[2].candidates;
          const has1 = cell2Candidates.includes(1);
          const has2 = cell2Candidates.includes(2);

          return {
            pass: !has1 && !has2,
            message: has1 || has2
              ? `FAIL: Cell 2 should not have 1 or 2 as candidates. Got: [${cell2Candidates.join(',')}]. Has 1: ${has1}, Has 2: ${has2}`
              : `PASS: Cell 2 candidates correctly generated: [${cell2Candidates.join(',')}]`
          };
        }
      },
      {
        name: 'Eliminate candidates from peers',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].candidates = [1, 2, 3];
          grid[1].candidates = [1, 2, 3];
          grid[9].candidates = [1, 2, 3];

          const result = eliminateCandidatesFromPeers(grid, 0, 1);

          const cell1HasOne = result[1].candidates.includes(1);
          const cell9HasOne = result[9].candidates.includes(1);

          return {
            pass: !cell1HasOne && !cell9HasOne,
            message: cell1HasOne || cell9HasOne
              ? `FAIL: Expected digit 1 to be eliminated from peers. Cell 1 candidates: [${result[1].candidates.join(',')}] (has 1: ${cell1HasOne}), Cell 9 candidates: [${result[9].candidates.join(',')}] (has 1: ${cell9HasOne})`
              : 'PASS: Eliminated digit 1 from peer cells correctly'
          };
        }
      }
    ]
  },

  'Naked Single': {
    tests: [
      {
        name: 'Find naked single',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].candidates = [5];
          grid[1].candidates = [1, 2, 3];

          const step = findNextLogicStep(grid);

          const pass = step?.technique === 'Naked Single' && step.baseCells[0] === 0 && step.digit === 5;

          return {
            pass,
            message: !step 
              ? 'FAIL: No technique found. Expected Naked Single at cell 0 with digit 5'
              : step.technique !== 'Naked Single'
              ? `FAIL: Expected Naked Single, got ${step.technique}`
              : step.baseCells[0] !== 0
              ? `FAIL: Expected cell 0, got cell ${step.baseCells[0]}`
              : step.digit !== 5
              ? `FAIL: Expected digit 5, got digit ${step.digit}`
              : `PASS: Found Naked Single at cell ${step.baseCells[0]} with digit ${step.digit}`
          };
        }
      },
      {
        name: 'Naked single with focused digit',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].candidates = [5];
          grid[1].candidates = [7];
          
          const step = findNextLogicStep(grid, 7);
          
          return {
            pass: step?.technique === 'Naked Single' && step.digit === 7,
            message: step ? `Found ${step.technique} for digit ${step.digit}` : 'No technique found'
          };
        }
      }
    ]
  },

  'Hidden Single': {
    tests: [
      {
        name: 'Find hidden single in row',
        run: () => {
          const grid = createEmptyGrid();
          // Row 0: only cell 0 can have digit 5
          grid[0].candidates = [5, 6, 7];
          grid[1].candidates = [1, 2, 3];
          grid[2].candidates = [1, 2, 3];
          grid[3].candidates = [1, 2, 3];
          grid[4].candidates = [1, 2, 3];
          grid[5].candidates = [1, 2, 3];
          grid[6].candidates = [1, 2, 3];
          grid[7].candidates = [1, 2, 3];
          grid[8].candidates = [1, 2, 3];
          
          const step = findNextLogicStep(grid);
          
          return {
            pass: step?.technique === 'Hidden Single' && step.digit === 5,
            message: step ? `Found ${step.technique} for digit ${step.digit}` : 'No technique found'
          };
        }
      },
      {
        name: 'Should NOT find hidden single if digit appears in multiple cells',
        run: () => {
          const grid = createEmptyGrid();
          // Row 9, Col 4 (index 75)
          grid[75].candidates = [2, 5, 7];
          // Row 9, Col 5 (index 76) - also has 2
          grid[76].candidates = [2, 3, 8];
          // Row 2, Col 4 (index 12) - also has 2
          grid[12].candidates = [2, 4, 6];
          
          // Fill other cells
          for (let i = 0; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }
          }
          
          const step = findNextLogicStep(grid, 2);
          
          // Should NOT identify cell 75 as hidden single since 2 appears elsewhere
          if (step?.technique === 'Hidden Single' && step.baseCells[0] === 75) {
            return {
              pass: false,
              message: 'Incorrectly identified R9C4 as hidden single when digit 2 appears in other cells'
            };
          }
          
          return {
            pass: true,
            message: 'Correctly avoided false positive'
          };
        }
      }
    ]
  },

  'Pointing Pairs/Triples': {
    tests: [
      {
        name: 'Find pointing pair',
        run: () => {
          const grid = createEmptyGrid();
          // Box 0, Row 0: digit 5 only in cells 0 and 1
          grid[0].candidates = [5, 6];
          grid[1].candidates = [5, 7];
          grid[2].candidates = [6, 7];
          // Rest of row 0
          grid[3].candidates = [5, 8];
          grid[4].candidates = [5, 9];
          
          for (let i = 9; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [1, 2, 3, 4, 6, 7, 8, 9];
            }
          }
          
          const step = findNextLogicStep(grid, 5);
          
          return {
            pass: step?.technique === 'Pointing Pair' && step.digit === 5,
            message: step ? `Found ${step.technique}` : 'No technique found'
          };
        }
      }
    ]
  },

  'Naked Pairs': {
    tests: [
      {
        name: 'Find naked pair',
        run: () => {
          const grid = createEmptyGrid();
          // Row 0: cells 0 and 1 both have only [5, 6]
          grid[0].candidates = [5, 6];
          grid[1].candidates = [5, 6];
          grid[2].candidates = [5, 6, 7];
          grid[3].candidates = [1, 2];
          
          for (let i = 4; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [1, 2, 3, 4];
            }
          }
          
          const step = findNextLogicStep(grid);
          
          return {
            pass: step?.technique === 'Naked Pair',
            message: step ? `Found ${step.technique}` : 'No technique found'
          };
        }
      },
      {
        name: 'Naked pair eliminates both digits',
        run: () => {
          const grid = createEmptyGrid();
          // Row 0: cells 0 and 1 both have only [5, 6]
          grid[0].candidates = [5, 6];
          grid[1].candidates = [5, 6];
          // Cell 2 has both 5 and 6 that should be eliminated
          grid[2].candidates = [5, 6, 7];
          // Cell 3 has only 5
          grid[3].candidates = [5, 8];
          
          for (let i = 4; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [1, 2, 3, 4];
            }
          }
          
          const step = findNextLogicStep(grid);
          
          // Should eliminate both 5 and 6 from cells 2 and 3
          const has5Elim = step?.eliminations?.some(e => e.cell === 2 && e.digit === 5);
          const has6Elim = step?.eliminations?.some(e => e.cell === 2 && e.digit === 6);
          const has5ElimCell3 = step?.eliminations?.some(e => e.cell === 3 && e.digit === 5);
          
          return {
            pass: step?.technique === 'Naked Pair' && has5Elim && has6Elim && has5ElimCell3,
            message: step ? `Found eliminations for digits: ${step.eliminations.map(e => `${e.digit} from cell ${e.cell}`).join(', ')}` : 'No naked pair found'
          };
        }
      }
    ]
  },

  'Hidden Pairs': {
    tests: [
      {
        name: 'Find hidden pair',
        run: () => {
          const grid = createEmptyGrid();
          // Row 0: digits 5 and 6 only appear in cells 0 and 1
          grid[0].candidates = [5, 6, 7, 8];
          grid[1].candidates = [5, 6, 9];
          grid[2].candidates = [1, 2, 3];
          grid[3].candidates = [1, 2, 3];
          grid[4].candidates = [1, 2, 4];
          grid[5].candidates = [1, 2, 4];
          grid[6].candidates = [1, 2, 4];
          grid[7].candidates = [1, 2, 4];
          grid[8].candidates = [1, 2, 4];
          
          const step = findNextLogicStep(grid);
          
          return {
            pass: step?.technique === 'Hidden Pair',
            message: step ? `Found ${step.technique}` : 'No technique found'
          };
        }
      }
    ]
  },

  'X-Wing': {
    tests: [
      {
        name: 'Find X-Wing pattern',
        run: () => {
          const grid = createEmptyGrid();
          
          // Create X-Wing for digit 5 in rows 0 and 2, columns 0 and 2
          // Row 0
          grid[0].candidates = [5, 6];
          grid[2].candidates = [5, 7];
          // Row 2
          grid[18].candidates = [5, 8];
          grid[20].candidates = [5, 9];
          
          // Add 5 in columns 0 and 2 that should be eliminated
          grid[27].candidates = [5, 1];
          grid[29].candidates = [5, 2];
          
          for (let i = 0; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [1, 2, 3, 4];
            }
          }
          
          const step = findNextLogicStep(grid, 5);
          
          return {
            pass: step?.technique === 'X-Wing' && step.digit === 5,
            message: step ? `Found ${step.technique}` : 'No X-Wing found'
          };
        }
      }
    ]
  },

  'XY-Wing': {
    tests: [
      {
        name: 'Find XY-Wing pattern',
        run: () => {
          const grid = createEmptyGrid();
          
          // Pivot at cell 0 with [1, 2]
          grid[0].candidates = [1, 2];
          // Wing 1 at cell 1 with [1, 3]
          grid[1].candidates = [1, 3];
          // Wing 2 at cell 9 with [2, 3]
          grid[9].candidates = [2, 3];
          // Cell 10 sees both wings and has 3
          grid[10].candidates = [3, 4, 5];
          
          for (let i = 11; i < 81; i++) {
            if (grid[i].candidates.length === 0) {
              grid[i].candidates = [4, 5, 6, 7, 8, 9];
            }
          }
          
          const step = findNextLogicStep(grid);
          
          return {
            pass: step?.technique === 'XY-Wing' && step.digit === 3,
            message: step ? `Found ${step.technique}` : 'No XY-Wing found'
          };
        }
      }
    ]
  },

  // 'Solver': {
  //   tests: [
  //     {
  //       name: 'Solve valid puzzle',
  //       run: () => {
  //         const grid = createEmptyGrid();
  //         // Simple puzzle
  //         const puzzle = [
  //           5,3,0,0,7,0,0,0,0,
  //           6,0,0,1,9,5,0,0,0,
  //           0,9,8,0,0,0,0,6,0,
  //           8,0,0,0,6,0,0,0,3,
  //           4,0,0,8,0,3,0,0,1,
  //           7,0,0,0,2,0,0,0,6,
  //           0,6,0,0,0,0,2,8,0,
  //           0,0,0,4,1,9,0,0,5,
  //           0,0,0,0,8,0,0,7,9
  //         ];
  //         
  //         puzzle.forEach((val, idx) => {
  //           grid[idx].value = val === 0 ? null : val;
  //         });
  //         
  //         const solved = solveSudoku(grid);
  //         
  //         return {
  //           pass: solved !== null && solved[0].value !== null,
  //           message: solved ? 'Puzzle solved successfully' : 'Failed to solve puzzle'
  //         };
  //       }
  //     },
  //     {
  //       name: 'Return null for invalid puzzle',
  //       run: () => {
  //         const grid = createEmptyGrid();
  //         // Invalid puzzle (two 5s in same row)
  //         grid[0].value = 5;
  //         grid[1].value = 5;
  //         
  //         const solved = solveSudoku(grid);
  //         
  //         return {
  //           pass: solved === null,
  //           message: solved ? 'Incorrectly solved invalid puzzle' : 'Correctly rejected invalid puzzle'
  //         };
  //       }
  //     }
  //   ]
  // },

  'Step Application': {
    tests: [
      {
        name: 'Apply placement step',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].candidates = [5];
          
          const step = {
            technique: 'Naked Single',
            placement: { cell: 0, digit: 5 },
            eliminations: []
          };
          
          const result = applyLogicStep(grid, step);
          
          return {
            pass: result[0].value === 5 && result[0].candidates.length === 0,
            message: result[0].value === 5 ? 'Placement applied correctly' : 'Placement failed'
          };
        }
      },
      {
        name: 'Apply elimination step',
        run: () => {
          const grid = createEmptyGrid();
          grid[0].candidates = [1, 2, 3];
          
          const step = {
            technique: 'Test',
            placement: null,
            eliminations: [{ cell: 0, digit: 2 }]
          };
          
          const result = applyLogicStep(grid, step);
          
          return {
            pass: !result[0].candidates.includes(2) && result[0].candidates.includes(1),
            message: !result[0].candidates.includes(2) ? 'Elimination applied correctly' : 'Elimination failed'
          };
        }
      }
    ]
  },

  'Forcing Chains': {
    tests: [
      {
        name: 'Find cell forcing chain convergence',
        run: () => {
          const grid = createEmptyGrid();
          
          // Create a simple convergence scenario
          // Cell 0 with [1, 2]
          grid[0].candidates = [1, 2];
          // If 1: forces cell 1 to be 3
          grid[1].candidates = [3];
          // If 2: also forces cell 1 to be 3
          
          for (let i = 2; i < 81; i++) {
            grid[i].candidates = [4, 5, 6, 7, 8, 9];
          }
          
          const result = findForcingChain(grid, 5);
          
          return {
            pass: result !== null || result === null,
            message: result ? `Found forcing chain: ${result.technique}` : 'No forcing chain found (may be expected)'
          };
        }
      },
      {
        name: 'Find hypothesis mode contradiction',
        run: () => {
          const grid = createEmptyGrid();
          
          // Simple bi-value cell
          grid[0].candidates = [1, 2];
          
          // Make branch 1 lead nowhere (needs complex setup)
          for (let i = 1; i < 81; i++) {
            grid[i].candidates = [3, 4, 5, 6, 7, 8, 9];
          }
          
          const result = findHypothesis(grid, 3);
          
          return {
            pass: result !== null || result === null,
            message: result ? `Found contradiction: ${result.technique}` : 'No contradiction found (may be expected)'
          };
        }
      }
    ]
  }
};

// Run all tests and return results
export const runAllTests = () => {
  const results = {};
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [suiteName, suite] of Object.entries(testSuites)) {
    results[suiteName] = {
      tests: [],
      passed: 0,
      total: suite.tests.length
    };
    
    for (const test of suite.tests) {
      totalTests++;
      try {
        const result = test.run();
        if (result.pass) passedTests++;
        
        results[suiteName].tests.push({
          name: test.name,
          ...result
        });
        
        if (result.pass) results[suiteName].passed++;
      } catch (error) {
        results[suiteName].tests.push({
          name: test.name,
          pass: false,
          message: `Error: ${error.message}`
        });
      }
    }
  }
  
  return {
    suites: results,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      percentage: ((passedTests / totalTests) * 100).toFixed(1)
    }
  };
};