import React, { useState } from 'react';
import { runAllTests, testSuites } from '../components/sudoku/testSuite';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function TestSuite() {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [expandedSuites, setExpandedSuites] = useState({});
  const [currentTest, setCurrentTest] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const runTests = async () => {
    setRunning(true);
    setResults(null);
    setExpandedSuites({});
    setCurrentTest(null);
    
    const allResults = {};
    let totalTests = 0;
    let passedTests = 0;
    let currentTestNumber = 0;
    
    // Count total tests
    for (const suite of Object.values(testSuites)) {
      totalTests += suite.tests.length;
    }
    
    setProgress({ current: 0, total: totalTests });

    // Run tests one by one
    for (const [suiteName, suite] of Object.entries(testSuites)) {
      allResults[suiteName] = {
        tests: [],
        passed: 0,
        total: suite.tests.length
      };
      
      for (const test of suite.tests) {
        currentTestNumber++;
        setCurrentTest({ suiteName, testName: test.name });
        setProgress({ current: currentTestNumber, total: totalTests });
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        try {
          const result = test.run();
          if (result.pass) {
            passedTests++;
            allResults[suiteName].passed++;
          }
          
          allResults[suiteName].tests.push({
            name: test.name,
            ...result
          });
        } catch (error) {
          allResults[suiteName].tests.push({
            name: test.name,
            pass: false,
            message: `Error: ${error.message}`,
            stack: error.stack
          });
        }
        
        // Update results in real-time
        setResults({
          suites: { ...allResults },
          summary: {
            total: totalTests,
            passed: passedTests,
            failed: currentTestNumber - passedTests,
            percentage: ((passedTests / currentTestNumber) * 100).toFixed(1)
          }
        });
      }
    }
    
    setRunning(false);
    setCurrentTest(null);
    
    // Auto-expand failed suites
    const failed = {};
    Object.entries(allResults).forEach(([name, suite]) => {
      if (suite.passed < suite.total) {
        failed[name] = true;
      }
    });
    setExpandedSuites(failed);
  };

  const toggleSuite = (suiteName) => {
    setExpandedSuites(prev => ({
      ...prev,
      [suiteName]: !prev[suiteName]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to={createPageUrl('SudokuMentor')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Logic Test Suite</h1>
          </div>
          
          <button
            onClick={runTests}
            disabled={running}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${running 
                ? 'bg-slate-700 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {running ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run All Tests
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="text-slate-400 text-sm mb-1">Total Tests</div>
              <div className="text-3xl font-bold">{results.summary.total}</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 rounded-xl p-6 border border-emerald-800/50">
              <div className="text-emerald-300 text-sm mb-1">Passed</div>
              <div className="text-3xl font-bold text-emerald-400">{results.summary.passed}</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-900/30 to-rose-900/30 rounded-xl p-6 border border-red-800/50">
              <div className="text-red-300 text-sm mb-1">Failed</div>
              <div className="text-3xl font-bold text-red-400">{results.summary.failed}</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl p-6 border border-blue-800/50">
              <div className="text-blue-300 text-sm mb-1">Pass Rate</div>
              <div className="text-3xl font-bold text-blue-400">{results.summary.percentage}%</div>
            </div>
          </motion.div>
        )}

        {/* Test Suites */}
        {!results && !running && (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-xl text-slate-400 mb-2">No tests run yet</p>
            <p className="text-slate-500">Click "Run All Tests" to start testing</p>
          </div>
        )}

        {running && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl border border-slate-800 p-8"
          >
            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-xl text-slate-300 font-semibold">Running Tests...</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-center mt-2 text-sm text-slate-500">
                {((progress.current / progress.total) * 100).toFixed(0)}% complete
              </div>
            </div>
            
            {/* Current Test */}
            {currentTest && (
              <motion.div
                key={`${currentTest.suiteName}-${currentTest.testName}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-1">Currently Testing:</div>
                    <div className="font-semibold text-slate-200">{currentTest.suiteName}</div>
                    <div className="text-sm text-blue-400">{currentTest.testName}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {results && (
          <div className="space-y-4">
            {Object.entries(results.suites).map(([suiteName, suite]) => (
              <motion.div
                key={suiteName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
              >
                {/* Suite Header */}
                <button
                  onClick={() => toggleSuite(suiteName)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSuites[suiteName] ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <h3 className="text-lg font-semibold">{suiteName}</h3>
                    <span className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      ${suite.passed === suite.total 
                        ? 'bg-emerald-900/50 text-emerald-400' 
                        : 'bg-red-900/50 text-red-400'
                      }
                    `}>
                      {suite.passed}/{suite.total} passed
                    </span>
                  </div>
                  
                  {suite.passed === suite.total ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </button>

                {/* Suite Tests */}
                <AnimatePresence>
                  {expandedSuites[suiteName] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-800"
                    >
                      <div className="p-6 space-y-3">
                        {suite.tests.map((test, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`
                              p-4 rounded-lg border
                              ${test.pass 
                                ? 'bg-emerald-950/20 border-emerald-900/50' 
                                : 'bg-red-950/20 border-red-900/50'
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              {test.pass ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                              )}
                              
                              <div className="flex-1">
                                <div className="font-medium mb-1">{test.name}</div>
                                <div className={`
                                  text-sm
                                  ${test.pass ? 'text-emerald-300' : 'text-red-300'}
                                `}>
                                  {test.message}
                                </div>
                                {test.stack && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                                      Show stack trace
                                    </summary>
                                    <pre className="mt-2 text-xs text-slate-400 bg-slate-950/50 p-2 rounded overflow-x-auto">
                                      {test.stack}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Test Coverage Info */}
        <div className="mt-8 bg-slate-900/50 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-3">Test Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-2">Tested Techniques:</p>
              <ul className="space-y-1 text-slate-300">
                {Object.keys(testSuites).map(name => (
                  <li key={name} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-slate-400 mb-2">What's Tested:</p>
              <ul className="space-y-1 text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Candidate generation and elimination
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  All solving techniques (Basic to Expert)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Step application and grid updates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Puzzle solver correctness
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Forcing chains and hypothesis mode
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}