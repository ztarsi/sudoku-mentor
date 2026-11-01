// The first-board budget (#91): what counts as "before the first board".
import { describe, it, expect } from 'vitest';
import { firstBoardClosure, lazyViolations, MUST_BE_LAZY } from '../../../scripts/bundleClosure.js';

const manifest = (extra = {}) => ({
  'index.html': { file: 'assets/index.js', isEntry: true, imports: ['_vendor.js'], dynamicImports: ['_Board.js'] },
  '_vendor.js': { file: 'assets/vendor.js' },
  '_Board.js': { file: 'assets/Board.js', imports: ['index.html'], dynamicImports: MUST_BE_LAZY },
  'src/components/sudoku/logicEngine.jsx': { file: 'assets/logicEngine.js', imports: ['_Board.js'] },
  'src/components/sudoku/LogicPanel.jsx': { file: 'assets/LogicPanel.js', imports: ['_Board.js', 'src/components/sudoku/logicEngine.jsx'] },
  ...extra,
});

describe('first-board closure', () => {
  it('holds the entry, its static imports, and the route it loads with their static imports', () => {
    expect([...firstBoardClosure(manifest())].sort()).toEqual(['_Board.js', '_vendor.js', 'index.html']);
  });

  it('does not follow a dynamic import out of the route', () => {
    const closure = firstBoardClosure(manifest());
    expect(closure.has('src/components/sudoku/logicEngine.jsx')).toBe(false);
    expect(lazyViolations(manifest(), closure)).toEqual([]);
  });

  it('fails when the board imports the engine statically', () => {
    const m = manifest();
    m['_Board.js'].imports = ['index.html', 'src/components/sudoku/logicEngine.jsx'];
    expect(lazyViolations(m, firstBoardClosure(m))).toEqual(['src/components/sudoku/logicEngine.jsx']);
  });

  it('fails when the engine has been folded into the board and has no chunk of its own', () => {
    const m = manifest();
    delete m['src/components/sudoku/logicEngine.jsx'];
    m['src/components/sudoku/LogicPanel.jsx'].imports = ['_Board.js'];
    expect(lazyViolations(m, firstBoardClosure(m))).toEqual(['src/components/sudoku/logicEngine.jsx']);
  });
});
