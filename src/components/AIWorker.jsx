// src/components/AIWorker.jsx - Updated with Smart Auto-Start and Re-Analyze Logic
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Terminal, CheckCircle, X, Zap, TrendingUp, Activity, Clock, Target } from 'lucide-react';
import { geminiService } from '../services/GeminiService';

export function AIWorker({ 
  stock, 
  onAnalysisComplete, 
  onAnalysisStart,
  onClose,
  isActive = false,
  savedLogs = null,
  savedResult = null,
  autoStart = false
}) {
  const [logs, setLogs] = useState(savedLogs || []);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(!!savedResult);
  const [result, setResult] = useState(savedResult);
  const logsEndRef = useRef(null);
  
  // Prevent double calls with ref
  const analysisInProgress = useRef(false);

  // ✅ UPDATED: Smart auto-start logic - only start if no existing analysis
  useEffect(() => {
    const hasExistingAnalysis = savedResult || (savedLogs && savedLogs.length > 0);
    
    if (autoStart && !analyzing && !complete && !hasExistingAnalysis && !analysisInProgress.current) {
      console.log('🚀 Auto-starting analysis for', stock.ticker);
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        performRealAIAnalysis();
      }, 500);
    } else if (hasExistingAnalysis) {
      console.log('📄 Showing existing analysis for', stock.ticker);
      // Don't auto-start - user can see existing results immediately
    }
  }, [autoStart, stock.ticker, savedResult, savedLogs]);

  // Load saved logs when component mounts
  useEffect(() => {
    if (savedLogs && savedLogs.length > 0) {
      setLogs(savedLogs);
      setComplete(!!savedResult);
      setResult(savedResult);
    }
  }, [savedLogs, savedResult]);

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { 
      id: Date.now() + Math.random(),
      timestamp, 
      message, 
      type
    };
    setLogs(prev => [...prev, newLog]);
    return newLog;
  };

  // Real AI analysis with double-call protection
  const performRealAIAnalysis = async () => {
    // Prevent double calls
    if (analyzing || analysisInProgress.current) {
      console.log('🛡️ Analysis already in progress, ignoring duplicate call');
      return;
    }
    
    analysisInProgress.current = true;
    setAnalyzing(true);
    setComplete(false);
    setLogs([]); // Clear previous logs
    onAnalysisStart?.(stock.ticker);

    const allLogs = [];

    try {
      const log1 = addLog(`🤖 Starting AI analysis for ${stock.ticker}...`, 'system');
      allLogs.push(log1);
      
      const log2 = addLog(`📊 Price: $${stock.currentPrice?.toFixed(2)} (${stock.changePercent > 0 ? '+' : ''}${stock.changePercent?.toFixed(2)}%)`, 'info');
      allLogs.push(log2);
      
      const log3 = addLog(`📰 Analyzing ${stock.newsCount} news articles...`, 'info');
      allLogs.push(log3);
      
      const log4 = addLog(`🧠 Sending to Gemini AI...`, 'system');
      allLogs.push(log4);

      // Call real Gemini API with progress callback
      const aiResult = await geminiService.analyzeStock(stock, (progressMessage) => {
        const progressLog = addLog(progressMessage, 'progress');
        allLogs.push(progressLog);
      });
      
      const log5 = addLog(`✅ AI analysis complete`, 'success');
      allLogs.push(log5);
      
      const log6 = addLog(`🎯 Signal: ${aiResult.signal.toUpperCase()} (${aiResult.buyPercentage}%)`, 'result');
      allLogs.push(log6);
      
      const log7 = addLog(`💭 ${aiResult.reasoning}`, 'reasoning');
      allLogs.push(log7);
      
      // ✅ Show EOD movement instead of absolute price
      if (aiResult.eodMovement !== undefined && aiResult.eodMovement !== null) {
        const movementDirection = aiResult.eodMovement > 0 ? '📈' : aiResult.eodMovement < 0 ? '📉' : '➡️';
        const log8 = addLog(`${movementDirection} EOD Movement: ${aiResult.eodMovement > 0 ? '+' : ''}${aiResult.eodMovement.toFixed(1)}%`, 'forecast');
        allLogs.push(log8);
      }

      // Add saved logs to result
      const finalResult = {
        ...aiResult,
        savedLogs: allLogs
      };

      setComplete(true);
      setResult(finalResult);
      onAnalysisComplete?.(stock.ticker, finalResult);

    } catch (error) {
      const errorLog = addLog(`❌ Analysis failed: ${error.message}`, 'error');
      allLogs.push(errorLog);
      
      // Return fallback result
      const fallbackResult = {
        buyPercentage: 30,
        signal: 'hold',
        reasoning: 'AI service unavailable',
        eodMovement: 0, // ✅ Updated field name
        confidence: 0.2,
        savedLogs: allLogs
      };
      
      setResult(fallbackResult);
      onAnalysisComplete?.(stock.ticker, fallbackResult);
    } finally {
      setAnalyzing(false);
      analysisInProgress.current = false; // Reset protection
    }
  };

  // Reset protection when component unmounts
  useEffect(() => {
    return () => {
      analysisInProgress.current = false;
    };
  }, []);

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-300';
      case 'result': return 'text-purple-300';
      case 'reasoning': return 'text-yellow-300';
      case 'forecast': return 'text-emerald-300';
      case 'system': return 'text-gray-400';
      case 'progress': return 'text-cyan-300';
      default: return 'text-gray-300';
    }
  };

  const closeTerminal = () => {
    if (onClose) {
      onClose();
    } else {
      // Fallback: Try to close by clicking outside
      setSelectedStock && setSelectedStock(null);
    }
  };

  const getSignalColor = (buyPercentage) => {
    if (!buyPercentage) return 'text-gray-400';
    if (buyPercentage >= 80) return 'text-green-400';
    if (buyPercentage >= 60) return 'text-blue-400';
    if (buyPercentage >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getSignalIcon = (buyPercentage) => {
    if (!buyPercentage) return '❓';
    if (buyPercentage >= 80) return '🚀';
    if (buyPercentage >= 60) return '📈';
    if (buyPercentage >= 40) return '⚡';
    return '🤔';
  };

  // ✅ Format EOD movement
  const formatEodMovement = (movement) => {
    if (movement === undefined || movement === null) return 'N/A';
    const sign = movement > 0 ? '+' : '';
    return `${sign}${movement.toFixed(1)}%`;
  };

  // ✅ Get EOD movement color and icon
  const getEodMovementColor = (movement) => {
    if (movement === undefined || movement === null) return 'text-gray-400';
    if (movement > 0) return 'text-green-400';
    if (movement < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getEodMovementIcon = (movement) => {
    if (movement === undefined || movement === null) return '➡️';
    if (movement > 0) return '📈';
    if (movement < 0) return '📉';
    return '➡️';
  };

  return (
    <div 
      className="ultra-glass border border-gray-600/50 rounded-2xl shadow-2xl overflow-hidden"
      style={{ 
        width: '700px',
        maxHeight: '85vh',
        background: 'rgba(22, 27, 38, 0.95)',
        backdropFilter: 'blur(24px)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-gray-600/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-white">{stock.ticker}</span>
                <span className="text-lg text-gray-300">${stock.currentPrice?.toFixed(2)}</span>
                <span className={`text-sm font-medium ${
                  stock.changePercent > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-400">AI Market Analysis</span>
                {analyzing && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                    <span className="text-purple-400 text-sm font-medium">Analyzing...</span>
                  </div>
                )}
                {complete && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Complete</span>
                  </div>
                )}
                {savedLogs && (
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">SAVED</span>
                )}
              </div>
            </div>
          </div>
          
          {/* ✅ UPDATED: Enhanced button layout with re-analyze */}
          <div className="flex items-center space-x-3">
            {!analyzing && !complete && (
              <button
                onClick={performRealAIAnalysis}
                className="neo-button bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300"
              >
                <Brain className="w-4 h-4" />
                <span>Analyze with AI</span>
              </button>
            )}
            
            {/* ✅ NEW: Re-analyze button appears when analysis is complete */}
            {complete && !analyzing && (
              <button
                onClick={performRealAIAnalysis}
                className="neo-button bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300"
              >
                <Zap className="w-4 h-4" />
                <span>Re-analyze</span>
              </button>
            )}

            <button
              onClick={closeTerminal}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Output with modern styling */}
      <div className="neo-terminal-content bg-gray-900/90 p-6 h-96 overflow-y-auto">
        <div className="text-green-400 text-sm mb-4 font-mono flex items-center space-x-2">
          <Terminal className="w-4 h-4" />
          <span>AI-TRADER v3.0 › {stock.ticker}</span>
          <span className="text-gray-500">•</span>
          <span className="text-blue-400">${stock.currentPrice?.toFixed(2)}</span>
        </div>
        
        {logs.map((log) => (
          <div key={log.id} className="mb-3 neo-news-item border-l-0 pl-0 py-2">
            <div className={`${getLogColor(log.type)} text-sm leading-relaxed flex items-start space-x-3`}>
              <span className="text-gray-500 text-xs font-mono mt-0.5 min-w-[65px]">
                {log.timestamp}
              </span>
              <span className="flex-1">{log.message}</span>
            </div>
          </div>
        ))}
        
        {analyzing && (
          <div className="flex items-center space-x-3 text-cyan-400 text-sm animate-pulse">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
            <span>Processing real-time data...</span>
          </div>
        )}
        
        {/* ✅ UPDATED: Better messaging for different states */}
        {logs.length === 0 && !analyzing && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            {savedResult ? (
              <div>
                <div className="text-gray-300 text-sm mb-2">
                  Analysis saved from previous session
                </div>
                <div className="text-gray-500 text-xs">
                  Click "Re-analyze" to run fresh analysis or view results below
                </div>
              </div>
            ) : (
              <div>
                <div className="text-gray-400 text-sm">
                  Click "Analyze with AI" to start real-time analysis using Google Gemini
                </div>
                <div className="text-gray-500 text-xs mt-2">
                  Analysis includes technical indicators, news sentiment, and market context
                </div>
              </div>
            )}
          </div>
        )}
        
        <div ref={logsEndRef} />
      </div>

      {/* ✅ Enhanced Summary with EOD Movement */}
      {complete && result && (
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-t border-gray-600/50 p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* AI Signal */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2 flex items-center justify-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>AI Signal</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{getSignalIcon(result.buyPercentage)}</span>
                <div>
                  <div className={`text-xl font-bold ${getSignalColor(result.buyPercentage)}`}>
                    {result.buyPercentage}%
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                    {result.signal.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ EOD Movement (instead of Confidence) */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2 flex items-center justify-center space-x-1">
                <Target className="w-4 h-4" />
                <span>EOD Movement</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{getEodMovementIcon(result.eodMovement)}</span>
                <div>
                  <div className={`text-xl font-bold ${getEodMovementColor(result.eodMovement)}`}>
                    {formatEodMovement(result.eodMovement)}
                  </div>
                  <div className="text-xs text-gray-400">
                    From current price
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Time & Confidence */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2 flex items-center justify-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Completed</span>
              </div>
              <div className="text-sm text-gray-300">
                {new Date(result.analysisTimestamp).toLocaleTimeString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Confidence: {Math.round(result.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-500">
                {result.hasTechnicalData ? `${result.technicalBars} bars` : 'No tech data'}
                <span className="mx-1">•</span>
                {result.hasFullArticle ? 'Full article' : 'Summary only'}
              </div>
            </div>
          </div>
          
          {/* Reasoning */}
          <div className="mt-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
            <div className="text-sm text-gray-400 mb-1">AI Reasoning:</div>
            <div className="text-sm text-gray-200 leading-relaxed">
              "{result.reasoning}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}