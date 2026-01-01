import React, { useEffect, useState } from 'react';
import { testHiddenSingleFalsePositive, testHiddenSingleTruePositive } from '../components/sudoku/logicEngine.test';

export default function TestHiddenSingle() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = () => {
    setRunning(true);
    setResults([]);
    
    // Capture console logs
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      const test1 = testHiddenSingleFalsePositive();
      const test2 = testHiddenSingleTruePositive();
      
      logs.push('\n=== Final Results ===');
      logs.push(`False Positive Test: ${test1 ? '✓ PASS' : '❌ FAIL'}`);
      logs.push(`True Positive Test: ${test2 ? '✓ PASS' : '❌ FAIL'}`);
      
      setResults(logs);
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      setResults(logs);
    } finally {
      console.log = originalLog;
      setRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Hidden Single Logic Tests</h1>
        
        <button
          onClick={runTests}
          disabled={running}
          className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          {running ? 'Running...' : 'Run Tests Again'}
        </button>

        <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm">
          {results.length === 0 ? (
            <p className="text-gray-400">Running tests...</p>
          ) : (
            results.map((log, idx) => (
              <div 
                key={idx} 
                className={`${
                  log.includes('✓') ? 'text-green-400' : 
                  log.includes('❌') ? 'text-red-400' : 
                  log.includes('===') ? 'text-yellow-400 font-bold mt-4' :
                  'text-gray-300'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}