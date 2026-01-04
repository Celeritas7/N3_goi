import React, { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, Grid3X3, Calendar, Star, Filter, Upload, Download, Eye, EyeOff, ChevronLeft, ChevronRight, RotateCcw, Settings, X, Check, Layers } from 'lucide-react';

// Page to Week/Day mapping (irregular pattern as specified)
const PAGE_TO_WEEK_DAY = {};
(() => {
  let currentWeek = 1;
  let currentDay = 1;
  for (let page = 12; page <= 160; page++) {
    const weekDay = `${currentWeek}週${currentDay}日`;
    PAGE_TO_WEEK_DAY[page] = { week: currentWeek, day: currentDay, label: weekDay };
    
    // Move to next day every 2 pages (pages come in pairs)
    if (page % 2 === 1) {
      currentDay++;
      if (currentDay > 7) {
        currentDay = 1;
        currentWeek++;
      }
    }
  }
})();

const getWeekDay = (pageNo) => {
  const page = parseInt(pageNo);
  if (PAGE_TO_WEEK_DAY[page]) return PAGE_TO_WEEK_DAY[page];
  // For pages outside the main range, calculate approximately
  if (page < 12) return { week: 1, day: 1, label: '1週1日' };
  const adjustedPage = page - 12;
  const dayIndex = Math.floor(adjustedPage / 2);
  const week = Math.floor(dayIndex / 7) + 1;
  const day = (dayIndex % 7) + 1;
  return { week, day, label: `${week}週${day}日` };
};

// Marking categories with colors
const MARKING_CATEGORIES = {
  0: { label: 'Not marked', color: 'bg-gray-100 text-gray-600', border: 'border-gray-300' },
  1: { label: 'Monthly Review', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400', icon: '✓' },
  2: { label: "Can't use in conversation", color: 'bg-amber-100 text-amber-700', border: 'border-amber-400', icon: '💬' },
  3: { label: "Can't write kanji", color: 'bg-orange-100 text-orange-700', border: 'border-orange-400', icon: '✍' },
  4: { label: 'Understand but cannot use', color: 'bg-rose-100 text-rose-700', border: 'border-rose-400', icon: '🤔' },
  5: { label: "Don't know at all", color: 'bg-red-200 text-red-800', border: 'border-red-500', icon: '❌' },
};

// Extract supporting words from sentence
const extractSupportingWords = (sentence, kanji) => {
  if (!sentence || !kanji) return { word1: '', word2: '' };
  const kanjiClean = kanji.replace(/[＊\*\+\(\)（）①②③④⑤]/g, '');
  const parts = sentence.split(new RegExp(`(${kanjiClean}|～)`));
  const word1 = parts[0] || '';
  const word2 = parts.slice(2).join('') || '';
  return { word1: word1.trim(), word2: word2.trim() };
};

// Sample data parser
const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
  
  return lines.slice(1).map((line, idx) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    
    const pageNo = parseInt(row['Page no.'] || row['Page no'] || '0');
    const weekDay = getWeekDay(pageNo);
    const { word1, word2 } = extractSupportingWords(row['Sentence'], row['Kanji']);
    
    return {
      id: idx + 1,
      srNo: row['Sr no'] || idx + 1,
      raw: row['Raw'] || '',
      kanji: row['Kanji'] || '',
      hint: row['Hint'] || '',
      sentence: row['Sentence'] || '',
      hiragana: row['Hiragana'] || '',
      meaning: row['Meaning'] || '',
      pageNo: pageNo,
      week: weekDay.week,
      day: weekDay.day,
      weekDayLabel: weekDay.label,
      supportWord1: word1,
      supportWord2: word2 || row['Hint'] || '',
      marking: 0,
    };
  });
};

// Default sample data
const DEFAULT_DATA = `Sr no,Raw,Kanji,Hint,Sentence,Hiragana,Meaning,Page no.
1,相子,相子,,,あいこ,"draw, tie",148
2,合図,合図,,,あいず,"sign, signal",87
3,愛想がいい＊,愛想がいい,/悪い、人に接する時の態度、表情,彼女はいつも愛想がいい人です。,あいそがいい,"Friendly, sociable, pleasant demeanor",12
4,間柄,間柄,,,あいだがら,"Relationship, connection",89
5,相次ぐ＊,相次ぐ,,,あいつぐ,To happen in succession,92
6,生憎,生憎,,,あいにく,"unfortunately, sorry, but",58
7,合間,合間,,,あいま,"interval, break, pause",73
8,敢えて,敢えて,,,あえて,"Boldly, daringly",58
9,仰向け＊,仰向け,,寝るとき、私は通常仰向けに寝ます。,あおむけ,"Face up, lying on one's back",17
10,垢+,垢,,,あか,"Grime, dirt",139`;

export default function N1VocabApp() {
  const [data, setData] = useState([]);
  const [markings, setMarkings] = useState({});
  const [view, setView] = useState('database');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarking, setFilterMarking] = useState(null);
  const [filterWeek, setFilterWeek] = useState(null);
  const [filterDay, setFilterDay] = useState(null);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  // Load data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('n1vocab_data');
    const savedMarkings = localStorage.getItem('n1vocab_markings');
    
    if (savedData) {
      setData(JSON.parse(savedData));
    } else {
      setData(parseCSV(DEFAULT_DATA));
    }
    
    if (savedMarkings) {
      setMarkings(JSON.parse(savedMarkings));
    }
  }, []);

  // Save markings whenever they change
  useEffect(() => {
    if (Object.keys(markings).length > 0) {
      localStorage.setItem('n1vocab_markings', JSON.stringify(markings));
    }
  }, [markings]);

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target.result;
        const parsedData = parseCSV(csvText);
        setData(parsedData);
        localStorage.setItem('n1vocab_data', JSON.stringify(parsedData));
      };
      reader.readAsText(file);
    }
  };

  // Export markings
  const exportMarkings = () => {
    const exportData = {
      markings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'n1vocab_markings.json';
    a.click();
  };

  // Update marking for a word
  const updateMarking = (wordId, marking) => {
    setMarkings(prev => ({
      ...prev,
      [wordId]: marking
    }));
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    return data.filter(word => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          word.kanji.toLowerCase().includes(term) ||
          word.hiragana.toLowerCase().includes(term) ||
          word.meaning.toLowerCase().includes(term) ||
          word.raw.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // Week filter
      if (filterWeek && word.week !== filterWeek) return false;
      
      // Day filter
      if (filterDay && word.day !== filterDay) return false;
      
      // Marking filter
      const wordMarking = markings[word.id] || 0;
      if (filterMarking !== null && wordMarking !== filterMarking) return false;
      
      // Show marked only
      if (showMarkedOnly && wordMarking === 0) return false;
      
      return true;
    });
  }, [data, searchTerm, filterWeek, filterDay, filterMarking, showMarkedOnly, markings]);

  // Get unique weeks
  const weeks = useMemo(() => {
    const weekSet = new Set(data.map(w => w.week));
    return Array.from(weekSet).sort((a, b) => a - b);
  }, [data]);

  // Group data by week and day for grid view
  const groupedByWeekDay = useMemo(() => {
    const groups = {};
    filteredData.forEach(word => {
      const key = word.weekDayLabel;
      if (!groups[key]) groups[key] = [];
      groups[key].push(word);
    });
    return groups;
  }, [filteredData]);

  // Render database view
  const renderDatabaseView = () => (
    <div className="space-y-2">
      {filteredData.map(word => {
        const marking = markings[word.id] || 0;
        const markingInfo = MARKING_CATEGORIES[marking];
        return (
          <div
            key={word.id}
            className={`p-4 rounded-xl border-2 ${markingInfo.border} ${markingInfo.color} cursor-pointer hover:shadow-lg transition-all duration-200`}
            onClick={() => setSelectedWord(word)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-gray-900">{word.kanji}</span>
                  <span className="text-lg text-gray-600">{word.hiragana}</span>
                  <span className="px-2 py-0.5 bg-white/50 rounded text-xs">{word.weekDayLabel}</span>
                </div>
                <p className="text-gray-700">{word.meaning}</p>
                {word.hint && <p className="text-sm text-gray-500 mt-1">💡 {word.hint}</p>}
              </div>
              <div className="flex flex-col gap-1">
                {[1,2,3,4,5].map(m => (
                  <button
                    key={m}
                    onClick={(e) => { e.stopPropagation(); updateMarking(word.id, marking === m ? 0 : m); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                      marking === m 
                        ? MARKING_CATEGORIES[m].color + ' ring-2 ring-offset-1 ring-gray-400' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {MARKING_CATEGORIES[m].icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render weekly grid view
  const renderWeeklyGrid = (showKanji = true) => {
    const weekDays = [];
    for (let w = 1; w <= Math.max(...weeks, 1); w++) {
      for (let d = 1; d <= 7; d++) {
        weekDays.push(`${w}週${d}日`);
      }
    }
    
    const maxRows = Math.max(...Object.values(groupedByWeekDay).map(arr => arr.length), 1);
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-800 text-white p-2 text-sm font-medium border border-slate-600">No.</th>
              {weekDays.slice(0, 14).map(wd => (
                <th key={wd} className="bg-slate-800 text-white p-2 text-sm font-medium border border-slate-600 min-w-[100px]">
                  {wd}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(maxRows, 30) }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="sticky left-0 bg-slate-100 p-2 text-center text-sm font-medium border border-slate-300">
                  {rowIdx + 1}
                </td>
                {weekDays.slice(0, 14).map(wd => {
                  const words = groupedByWeekDay[wd] || [];
                  const word = words[rowIdx];
                  if (!word) return <td key={wd} className="p-2 border border-slate-200 bg-white"></td>;
                  
                  const marking = markings[word.id] || 0;
                  const markingInfo = MARKING_CATEGORIES[marking];
                  
                  return (
                    <td
                      key={wd}
                      className={`p-2 border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${marking > 0 ? markingInfo.color : 'bg-white'}`}
                      onClick={() => setSelectedWord(word)}
                    >
                      <span className="text-sm font-medium">
                        {showKanji ? word.kanji : word.hiragana}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render study cards view
  const renderStudyCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredData.map(word => {
        const marking = markings[word.id] || 0;
        const markingInfo = MARKING_CATEGORIES[marking];
        return (
          <div
            key={word.id}
            className={`p-6 rounded-2xl border-2 ${markingInfo.border} bg-white shadow-sm hover:shadow-md transition-all cursor-pointer`}
            onClick={() => setSelectedWord(word)}
          >
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded ${markingInfo.color}`}>{word.weekDayLabel}</span>
              {marking > 0 && <span>{markingInfo.icon} {markingInfo.label}</span>}
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              {word.supportWord1 && (
                <span className="text-gray-500 text-sm">{word.supportWord1}</span>
              )}
              <span className="text-3xl font-bold text-gray-900">{word.kanji}</span>
              {word.supportWord2 && (
                <span className="text-gray-500 text-sm">{word.supportWord2}</span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 mb-2">{word.hiragana}</div>
            <div className="text-gray-700">{word.meaning}</div>
            
            {word.sentence && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-gray-600">
                📝 {word.sentence}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render flashcard mode
  const renderFlashcard = () => {
    const currentWord = filteredData[flashcardIndex];
    if (!currentWord) {
      return (
        <div className="text-center py-20 text-gray-500">
          <p>No words match your filters.</p>
          <button
            onClick={() => { setFilterMarking(null); setFilterWeek(null); setShowMarkedOnly(false); }}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      );
    }
    
    const marking = markings[currentWord.id] || 0;
    const markingInfo = MARKING_CATEGORIES[marking];
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 text-gray-500">
          Card {flashcardIndex + 1} of {filteredData.length}
        </div>
        
        <div
          className={`min-h-[400px] p-8 rounded-3xl border-2 ${markingInfo.border} bg-white shadow-xl cursor-pointer transition-all hover:shadow-2xl`}
          onClick={() => setFlashcardRevealed(!flashcardRevealed)}
        >
          <div className="flex items-center justify-between mb-6">
            <span className={`px-3 py-1 rounded-full text-sm ${markingInfo.color}`}>
              {currentWord.weekDayLabel}
            </span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(m => (
                <button
                  key={m}
                  onClick={(e) => { e.stopPropagation(); updateMarking(currentWord.id, marking === m ? 0 : m); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    marking === m 
                      ? MARKING_CATEGORIES[m].color + ' ring-2 ring-offset-2 ring-gray-400' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {MARKING_CATEGORIES[m].icon}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-center py-8">
            {currentWord.supportWord1 && (
              <p className="text-gray-400 text-lg mb-2">{currentWord.supportWord1}</p>
            )}
            <h2 className="text-6xl font-bold text-gray-900 mb-4">{currentWord.kanji}</h2>
            {currentWord.supportWord2 && (
              <p className="text-gray-400 text-lg mb-4">{currentWord.supportWord2}</p>
            )}
            
            {flashcardRevealed && (
              <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 animate-fadeIn">
                <p className="text-2xl text-gray-600 mb-3">{currentWord.hiragana}</p>
                <p className="text-xl text-gray-800">{currentWord.meaning}</p>
                {currentWord.hint && (
                  <p className="mt-4 text-gray-500">💡 {currentWord.hint}</p>
                )}
                {currentWord.sentence && (
                  <p className="mt-4 p-4 bg-slate-50 rounded-xl text-gray-600">
                    📝 {currentWord.sentence}
                  </p>
                )}
              </div>
            )}
            
            {!flashcardRevealed && (
              <p className="text-gray-400 mt-8">Click to reveal</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => { setFlashcardIndex(Math.max(0, flashcardIndex - 1)); setFlashcardRevealed(false); }}
            disabled={flashcardIndex === 0}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => { setFlashcardIndex(Math.floor(Math.random() * filteredData.length)); setFlashcardRevealed(false); }}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Random
          </button>
          <button
            onClick={() => { setFlashcardIndex(Math.min(filteredData.length - 1, flashcardIndex + 1)); setFlashcardRevealed(false); }}
            disabled={flashcardIndex === filteredData.length - 1}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  };

  // Word detail modal
  const renderWordModal = () => {
    if (!selectedWord) return null;
    
    const marking = markings[selectedWord.id] || 0;
    const markingInfo = MARKING_CATEGORIES[marking];
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedWord(null)}>
        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className={`p-6 ${markingInfo.color} rounded-t-3xl`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm opacity-75 mb-1">{selectedWord.weekDayLabel} • Page {selectedWord.pageNo}</p>
                <h2 className="text-4xl font-bold">{selectedWord.kanji}</h2>
                <p className="text-xl mt-1">{selectedWord.hiragana}</p>
              </div>
              <button onClick={() => setSelectedWord(null)} className="p-2 hover:bg-black/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Meaning</h3>
              <p className="text-lg text-gray-800">{selectedWord.meaning}</p>
            </div>
            
            {selectedWord.hint && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Hint</h3>
                <p className="text-gray-700">💡 {selectedWord.hint}</p>
              </div>
            )}
            
            {selectedWord.sentence && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Example Sentence</h3>
                <p className="text-gray-700 p-3 bg-slate-50 rounded-xl">📝 {selectedWord.sentence}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Mark as</h3>
              <div className="grid grid-cols-1 gap-2">
                {[0,1,2,3,4,5].map(m => (
                  <button
                    key={m}
                    onClick={() => updateMarking(selectedWord.id, m)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      marking === m 
                        ? MARKING_CATEGORIES[m].color + ' ring-2 ring-gray-400' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-medium">
                      {m === 0 ? '○' : MARKING_CATEGORIES[m].icon} {MARKING_CATEGORIES[m].label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-xl font-bold">
                N1
              </div>
              <div>
                <h1 className="text-xl font-bold">N1 語彙マスター</h1>
                <p className="text-xs text-slate-400">{data.length} words loaded</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors text-sm flex items-center gap-2">
                <Upload size={16} />
                Import CSV
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={exportMarkings}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex gap-1 overflow-x-auto pb-1">
            {[
              { id: 'database', icon: BookOpen, label: 'Database' },
              { id: 'kanji-grid', icon: Grid3X3, label: 'Kanji Grid' },
              { id: 'hiragana-grid', icon: Grid3X3, label: 'Hiragana Grid' },
              { id: 'study', icon: Layers, label: 'Study Cards' },
              { id: 'flashcard', icon: RotateCcw, label: 'Flashcards' },
            ].map(nav => (
              <button
                key={nav.id}
                onClick={() => setView(nav.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm whitespace-nowrap transition-colors ${
                  view === nav.id 
                    ? 'bg-white text-slate-900' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <nav.icon size={16} />
                {nav.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-[120px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search kanji, hiragana, meaning..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            
            {/* Week Filter */}
            <select
              value={filterWeek || ''}
              onChange={(e) => setFilterWeek(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">All Weeks</option>
              {weeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
            
            {/* Day Filter */}
            <select
              value={filterDay || ''}
              onChange={(e) => setFilterDay(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">All Days</option>
              {[1,2,3,4,5,6,7].map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
            
            {/* Marking Filter */}
            <select
              value={filterMarking ?? ''}
              onChange={(e) => setFilterMarking(e.target.value !== '' ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">All Marks</option>
              {Object.entries(MARKING_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon || '○'} {v.label}</option>
              ))}
            </select>
            
            {/* Show Marked Only Toggle */}
            <button
              onClick={() => setShowMarkedOnly(!showMarkedOnly)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                showMarkedOnly 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {showMarkedOnly ? <Eye size={16} /> : <EyeOff size={16} />}
              Marked Only
            </button>
            
            {/* Results count */}
            <span className="text-sm text-gray-500">
              {filteredData.length} results
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'database' && renderDatabaseView()}
        {view === 'kanji-grid' && renderWeeklyGrid(true)}
        {view === 'hiragana-grid' && renderWeeklyGrid(false)}
        {view === 'study' && renderStudyCards()}
        {view === 'flashcard' && renderFlashcard()}
      </main>

      {/* Word Modal */}
      {renderWordModal()}
      
      {/* Marking Legend */}
      <div className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 max-w-xs">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Marking Guide</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(MARKING_CATEGORIES).slice(1).map(([k, v]) => (
            <div key={k} className={`flex items-center gap-2 px-2 py-1 rounded ${v.color}`}>
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
