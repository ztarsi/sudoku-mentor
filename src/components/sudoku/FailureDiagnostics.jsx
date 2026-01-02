import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

export default function FailureDiagnostics({ failureMessage, suiteName }) {
  // Parse the failure message to extract diagnostic info
  const parseFailure = (message) => {
    const diagnostics = {
      steps: [],
      gridInfo: [],
      expected: null,
      actual: null
    };

    // Extract cell references (e.g., R9C5, cell 75)
    const cellMatches = message.match(/(?:cell|Cell|R(\d+)C(\d+))\s*(\d+)/g);
    const digitMatches = message.match(/digit[s]?\s*(\d+)/gi);
    const candidateMatches = message.match(/candidate[s]?\s*\[([^\]]+)\]/gi);

    // Step 1: What was being tested
    diagnostics.steps.push({
      title: 'What We Tested',
      icon: Info,
      color: 'blue',
      content: getTestDescription(suiteName, message)
    });

    // Step 2: What we expected
    if (message.includes('Expected') || message.includes('expected')) {
      const expectedMatch = message.match(/Expected:?\s*([^.]+)/i);
      diagnostics.steps.push({
        title: 'What We Expected',
        icon: CheckCircle2,
        color: 'emerald',
        content: expectedMatch ? expectedMatch[1].trim() : 'Technique should be found and applied correctly'
      });
    }

    // Step 3: What actually happened
    if (message.includes('Got') || message.includes('got')) {
      const gotMatch = message.match(/Got:?\s*([^.]+)/i);
      diagnostics.steps.push({
        title: 'What Actually Happened',
        icon: XCircle,
        color: 'red',
        content: gotMatch ? gotMatch[1].trim() : 'The test produced unexpected results'
      });
    } else {
      diagnostics.steps.push({
        title: 'What Actually Happened',
        icon: XCircle,
        color: 'red',
        content: message.includes('FAIL:') ? message.split('FAIL:')[1].split('.')[0].trim() : 'The test did not pass as expected'
      });
    }

    // Step 4: Why it failed
    diagnostics.steps.push({
      title: 'Why It Failed',
      icon: AlertTriangle,
      color: 'orange',
      content: getFailureReason(message)
    });

    // Extract grid information
    if (cellMatches || digitMatches || candidateMatches) {
      diagnostics.gridInfo = extractGridInfo(message);
    }

    return diagnostics;
  };

  const getTestDescription = (suite, message) => {
    const descriptions = {
      'Candidate Generation': 'Testing if candidates are correctly generated and eliminated based on Sudoku rules',
      'Naked Single': 'Checking if cells with only one possible candidate are correctly identified',
      'Hidden Single': 'Verifying that digits appearing only once in a row/column/box are found',
      'Pointing Pairs/Triples': 'Testing if candidates confined to a line within a box are detected',
      'Naked Pairs': 'Checking if pairs of cells with identical two-candidate sets are identified',
      'Hidden Pairs': 'Verifying detection of digit pairs that only appear in two cells',
      'X-Wing': 'Testing pattern recognition for rectangle-shaped candidate eliminations',
      'XY-Wing': 'Checking detection of three-cell forcing chains with bi-value cells',
      'Solver': 'Testing the complete puzzle solving algorithm'
    };

    return descriptions[suite] || 'Testing Sudoku logic implementation';
  };

  const getFailureReason = (message) => {
    if (message.includes('should not have') || message.includes('Should not have')) {
      return 'A candidate or value was present when it should have been eliminated';
    }
    if (message.includes('Expected') && message.includes('got')) {
      return 'The output did not match the expected result';
    }
    if (message.includes('multiple') || message.includes('appears in multiple')) {
      return 'A digit appeared in multiple places where only one instance was expected';
    }
    if (message.includes('No technique found')) {
      return 'The expected solving technique was not detected by the algorithm';
    }
    return 'The test assertion failed - check the details above';
  };

  const extractGridInfo = (message) => {
    const info = [];
    
    // Extract cell references
    const cellRegex = /[Rr](\d+)[Cc](\d+)|cell[s]?\s*(\d+)/g;
    let match;
    while ((match = cellRegex.exec(message)) !== null) {
      if (match[1] && match[2]) {
        info.push({
          type: 'cell',
          label: `R${match[1]}C${match[2]}`,
          value: `Row ${match[1]}, Column ${match[2]}`
        });
      } else if (match[3]) {
        const cellNum = parseInt(match[3]);
        const row = Math.floor(cellNum / 9) + 1;
        const col = (cellNum % 9) + 1;
        info.push({
          type: 'cell',
          label: `Cell ${match[3]}`,
          value: `R${row}C${col} (Row ${row}, Column ${col})`
        });
      }
    }

    // Extract digit information
    const digitRegex = /digit[s]?\s*(\d+)|value[s]?\s*(\d+)/gi;
    let digitMatch;
    while ((digitMatch = digitRegex.exec(message)) !== null) {
      const digit = digitMatch[1] || digitMatch[2];
      if (digit) {
        info.push({
          type: 'digit',
          label: `Digit ${digit}`,
          value: `The number ${digit} in question`
        });
      }
    }

    // Extract candidate information
    const candRegex = /candidate[s]?\s*\[([^\]]+)\]/gi;
    let candMatch;
    while ((candMatch = candRegex.exec(message)) !== null) {
      info.push({
        type: 'candidates',
        label: 'Candidates',
        value: candMatch[1]
      });
    }

    return info;
  };

  const diagnostics = parseFailure(failureMessage);

  return (
    <div className="space-y-6">
      {/* Step-by-step breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h4 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Step-by-Step Analysis
        </h4>
        
        <div className="space-y-4">
          {diagnostics.steps.map((step, idx) => {
            const Icon = step.icon;
            const colorClasses = {
              blue: 'bg-blue-950/50 border-blue-800/50 text-blue-300',
              emerald: 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300',
              red: 'bg-red-950/50 border-red-800/50 text-red-300',
              orange: 'bg-orange-950/50 border-orange-800/50 text-orange-300'
            };
            
            return (
              <div key={idx} className={`rounded-lg p-4 border ${colorClasses[step.color]}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-2 text-white">
                      Step {idx + 1}: {step.title}
                    </div>
                    <p className="text-sm leading-relaxed">
                      {step.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Information */}
      {diagnostics.gridInfo.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h4 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
            Grid Elements Involved
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diagnostics.gridInfo.map((info, idx) => {
              const typeColors = {
                cell: 'bg-blue-900/30 border-blue-700/50 text-blue-200',
                digit: 'bg-purple-900/30 border-purple-700/50 text-purple-200',
                candidates: 'bg-amber-900/30 border-amber-700/50 text-amber-200'
              };
              
              return (
                <div key={idx} className={`rounded-lg p-3 border ${typeColors[info.type]}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-1">
                    {info.type}
                  </div>
                  <div className="font-bold text-sm mb-1">{info.label}</div>
                  <div className="text-xs opacity-90">{info.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gradient-to-r from-red-950/50 to-orange-950/50 rounded-xl p-4 border border-red-800/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-orange-200 mb-2">In Plain English</h4>
            <p className="text-sm text-orange-100 leading-relaxed">
              {getPlainEnglishSummary(suiteName, failureMessage)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPlainEnglishSummary(suite, message) {
  // Generate a plain English summary based on the test suite and message
  if (message.includes('Hidden Single') && message.includes('multiple cells')) {
    return "The test found a problem where the logic incorrectly identified a 'Hidden Single' - a situation where a digit should only fit in one cell. However, the digit actually appeared as a possibility in multiple cells, so it wasn't truly hidden. This means the detection logic needs to be more careful about checking all cells in the row, column, or box.";
  }
  
  if (message.includes('Naked Pair') && message.includes('eliminates')) {
    return "A Naked Pair was found (two cells with the same two candidates), but the test failed because the elimination logic didn't remove all the expected candidates from other cells. When two cells can only contain the same two numbers, those numbers should be eliminated from all other cells in that row, column, or box.";
  }
  
  if (message.includes('candidate') && message.includes('should not have')) {
    return "The test checked whether candidates were properly generated and eliminated. A candidate number was found in a cell where it shouldn't be possible based on Sudoku rules. This usually means the elimination logic isn't correctly removing candidates when a number is placed in a peer cell (same row, column, or box).";
  }
  
  if (message.includes('No technique found')) {
    return "The test set up a specific puzzle situation where a solving technique should have been detected, but the logic engine didn't find it. This suggests the pattern-matching algorithm may need adjustment to recognize this particular configuration.";
  }
  
  return "The test detected a mismatch between what the Sudoku solving logic produced and what was expected. This indicates the algorithm may not be correctly implementing the rules for this particular solving technique.";
}