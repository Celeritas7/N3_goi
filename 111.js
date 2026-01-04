<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>N1 語彙マスター</title>
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#1e293b">
  <meta name="description" content="JLPT N3 Vocabulary Study App">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="N3語彙">
  
  <!-- PWA Icons -->
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f43f5e' rx='20' width='100' height='100'/><text x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-weight='bold'>N1</text></svg>">
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f43f5e' rx='20' width='100' height='100'/><text x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-weight='bold'>N1</text></svg>">
  
  <!-- Manifest for PWA -->
  <link rel="manifest" href="data:application/json,{&quot;name&quot;:&quot;N1 語彙マスター&quot;,&quot;short_name&quot;:&quot;N1語彙&quot;,&quot;start_url&quot;:&quot;.&quot;,&quot;display&quot;:&quot;standalone&quot;,&quot;background_color&quot;:&quot;%231e293b&quot;,&quot;theme_color&quot;:&quot;%231e293b&quot;}">
  
  <!-- Supabase JS -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  </script>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  
  <style>
    * { font-family: 'Noto Sans JP', system-ui, sans-serif; }
    body { overscroll-behavior: none; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    .animate-slideUp { animation: slideUp 0.3s ease-out; }
    .animate-pulse { animation: pulse 1.5s infinite; }
    .card-flip { transition: transform 0.6s; transform-style: preserve-3d; }
    .card-flip.flipped { transform: rotateY(180deg); }
    input, select, button { font-size: 16px; } /* Prevent iOS zoom */
  </style>
</head>
<body class="bg-slate-100 min-h-screen">
  <div id="app"></div>

  <script type="module">
    // ===== SUPABASE CONFIG =====
    const SUPABASE_URL = 'https://ulgrfumbwjovbjzjiems.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3JmdW1id2pvdmJqemppZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyNjcsImV4cCI6MjA4Mjk0ODI2N30.ix5Vh4Y3GXNbQbzVtTD_WSko0L3cr5q_eCnTuDEMh7M';
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // ===== USER ID (simple device-based ID) =====
    function getUserId() {
      let userId = localStorage.getItem('n1vocab_user_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('n1vocab_user_id', userId);
      }
      return userId;
    }
    
    // ===== PAGE TO WEEK/DAY MAPPING =====
    const PAGE_TO_WEEK_DAY = {};
    (() => {
      let currentWeek = 1, currentDay = 1;
      for (let page = 12; page <= 160; page++) {
        PAGE_TO_WEEK_DAY[page] = { week: currentWeek, day: currentDay, label: `${currentWeek}週${currentDay}日` };
        if (page % 2 === 1) {
          currentDay++;
          if (currentDay > 7) { currentDay = 1; currentWeek++; }
        }
      }
    })();
    
    function getWeekDay(pageNo) {
      const page = parseInt(pageNo) || 0;
      if (PAGE_TO_WEEK_DAY[page]) return PAGE_TO_WEEK_DAY[page];
      if (page < 12) return { week: 1, day: 1, label: '1週1日' };
      const adjustedPage = page - 12;
      const dayIndex = Math.floor(adjustedPage / 2);
      const week = Math.floor(dayIndex / 7) + 1;
      const day = (dayIndex % 7) + 1;
      return { week, day, label: `${week}週${day}日` };
    }
    
    // ===== MARKING CATEGORIES =====
    const MARKING_CATEGORIES = {
      0: { label: 'Not marked', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200', icon: '○' },
      1: { label: 'Monthly Review', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400', icon: '✓' },
      2: { label: "Can't use in conversation", color: 'bg-amber-100 text-amber-700', border: 'border-amber-400', icon: '💬' },
      3: { label: "Can't write kanji", color: 'bg-orange-100 text-orange-700', border: 'border-orange-400', icon: '✍' },
      4: { label: 'Understand but cannot use', color: 'bg-rose-100 text-rose-700', border: 'border-rose-400', icon: '🤔' },
      5: { label: "Don't know at all", color: 'bg-red-200 text-red-800', border: 'border-red-500', icon: '❌' },
    };
    
    // ===== CSV PARSER =====
    function parseCSV(csvText) {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
      
      return lines.slice(1).map((line, idx) => {
        const values = [];
        let current = '', inQuotes = false;
        for (let char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else current += char;
        }
        values.push(current.trim());
        
        const row = {};
        headers.forEach((h, i) => row[h] = values[i] || '');
        
        const pageNo = parseInt(row['Page no.'] || row['Page no'] || '0');
        const weekDay = getWeekDay(pageNo);
        
        // Extract supporting words from sentence
        const sentence = row['Sentence'] || '';
        const kanji = row['Kanji'] || '';
        const kanjiClean = kanji.replace(/[＊\*\+\(\)（）①②③④⑤]/g, '');
        let word1 = '', word2 = '';
        if (sentence && kanjiClean) {
          const regex = new RegExp(`(${kanjiClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|～)`);
          const parts = sentence.split(regex);
          word1 = (parts[0] || '').trim();
          word2 = (parts.slice(2).join('') || '').trim();
        }
        
        return {
          id: idx + 1,
          srNo: row['Sr no'] || idx + 1,
          raw: row['Raw'] || '',
          kanji: row['Kanji'] || '',
          hint: row['Hint'] || '',
          sentence: row['Sentence'] || '',
          hiragana: row['Hiragana'] || '',
          meaning: row['Meaning'] || '',
          pageNo,
          week: weekDay.week,
          day: weekDay.day,
          weekDayLabel: weekDay.label,
          supportWord1: word1,
          supportWord2: word2 || row['Hint'] || '',
          marking: 0,
        };
      });
    }
    
    // ===== MAIN APP =====
    class N1VocabApp {
      constructor() {
        this.data = [];
        this.markings = {};
        this.userId = getUserId();
        this.view = 'database';
        this.searchTerm = '';
        this.filterWeek = null;
        this.filterDay = null;
        this.filterMarking = null;
        this.showMarkedOnly = false;
        this.flashcardIndex = 0;
        this.flashcardRevealed = false;
        this.selectedWord = null;
        this.syncing = false;
        this.lastSync = null;
        this.showUserIdModal = false;
        
        this.init();
      }
      
      async init() {
        this.render();
        await this.loadData();
        await this.syncFromCloud();
        this.render();
      }
      
      // ===== DATA LOADING =====
      async loadData() {
        const savedData = localStorage.getItem('n1vocab_data');
        if (savedData) {
          this.data = JSON.parse(savedData);
        }
        
        const savedMarkings = localStorage.getItem('n1vocab_markings');
        if (savedMarkings) {
          this.markings = JSON.parse(savedMarkings);
        }
      }
      
      saveDataLocally() {
        localStorage.setItem('n1vocab_data', JSON.stringify(this.data));
        localStorage.setItem('n1vocab_markings', JSON.stringify(this.markings));
      }
      
      // ===== CLOUD SYNC =====
      async syncFromCloud() {
        try {
          this.syncing = true;
          this.render();
          
          const { data, error } = await supabase
            .from('vocabulary')
            .select('word_id, marking')
            .eq('user_id', this.userId);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            data.forEach(row => {
              this.markings[row.word_id] = row.marking;
            });
            this.saveDataLocally();
          }
          
          this.lastSync = new Date();
          this.syncing = false;
          this.render();
        } catch (err) {
          console.error('Sync error:', err);
          this.syncing = false;
          this.render();
        }
      }
      
      async syncMarkingToCloud(wordId, marking) {
        try {
          const { error } = await supabase
            .from('vocabulary')
            .upsert({
              user_id: this.userId,
              word_id: wordId,
              marking: marking,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,word_id' });
          
          if (error) throw error;
          this.lastSync = new Date();
        } catch (err) {
          console.error('Sync marking error:', err);
        }
      }
      
      // ===== MARKING UPDATE =====
      async updateMarking(wordId, marking) {
        this.markings[wordId] = marking;
        this.saveDataLocally();
        this.render();
        await this.syncMarkingToCloud(wordId, marking);
      }
      
      // ===== FILE HANDLING =====
      handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.data = parseCSV(e.target.result);
          this.saveDataLocally();
          this.render();
        };
        reader.readAsText(file);
      }
      
      // ===== FILTERING =====
      getFilteredData() {
        return this.data.filter(word => {
          if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            const matches = word.kanji.toLowerCase().includes(term) ||
              word.hiragana.toLowerCase().includes(term) ||
              word.meaning.toLowerCase().includes(term) ||
              word.raw.toLowerCase().includes(term);
            if (!matches) return false;
          }
          if (this.filterWeek && word.week !== this.filterWeek) return false;
          if (this.filterDay && word.day !== this.filterDay) return false;
          const wordMarking = this.markings[word.id] || 0;
          if (this.filterMarking !== null && wordMarking !== this.filterMarking) return false;
          if (this.showMarkedOnly && wordMarking === 0) return false;
          return true;
        });
      }
      
      getWeeks() {
        const weeks = new Set(this.data.map(w => w.week));
        return Array.from(weeks).sort((a, b) => a - b);
      }
      
      // ===== CHANGE USER ID =====
      changeUserId(newId) {
        if (newId && newId.trim()) {
          this.userId = newId.trim();
          localStorage.setItem('n1vocab_user_id', this.userId);
          this.markings = {};
          this.syncFromCloud();
        }
        this.showUserIdModal = false;
        this.render();
      }
      
      // ===== RENDER =====
      render() {
        const app = document.getElementById('app');
        const filteredData = this.getFilteredData();
        const weeks = this.getWeeks();
        
        app.innerHTML = `
          <!-- Header -->
          <header class="bg-slate-900 text-white sticky top-0 z-40 shadow-xl">
            <div class="max-w-7xl mx-auto px-3 py-3">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-lg font-bold">
                    N1
                  </div>
                  <div>
                    <h1 class="text-lg font-bold">N1 語彙マスター</h1>
                    <p class="text-xs text-slate-400">${this.data.length} words ${this.syncing ? '<span class="animate-pulse">⟳ Syncing...</span>' : '☁️'}</p>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <label class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <input type="file" accept=".csv" class="hidden" onchange="app.handleFileUpload(this.files[0])">
                  </label>
                  <button onclick="app.showUserIdModal = true; app.render();" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" title="Sync Settings">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </button>
                </div>
              </div>
              
              <!-- Navigation -->
              <nav class="flex gap-1 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
                ${['database', 'kanji-grid', 'hiragana-grid', 'study', 'flashcard'].map(v => `
                  <button onclick="app.view = '${v}'; app.render();" class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors ${this.view === v ? 'bg-white text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}">
                    ${v === 'database' ? '📖' : v === 'kanji-grid' ? '漢' : v === 'hiragana-grid' ? 'あ' : v === 'study' ? '📚' : '🔄'}
                    ${v === 'database' ? 'Database' : v === 'kanji-grid' ? 'Kanji' : v === 'hiragana-grid' ? 'Hiragana' : v === 'study' ? 'Study' : 'Flash'}
                  </button>
                `).join('')}
              </nav>
            </div>
          </header>
          
          <!-- Filters -->
          <div class="bg-white border-b border-slate-200 sticky top-[104px] z-30 shadow-sm">
            <div class="max-w-7xl mx-auto px-3 py-2">
              <div class="flex flex-wrap items-center gap-2">
                <div class="relative flex-1 min-w-[150px]">
                  <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input type="text" placeholder="Search..." value="${this.searchTerm}" oninput="app.searchTerm = this.value; app.render();" class="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                </div>
                
                <select onchange="app.filterWeek = this.value ? parseInt(this.value) : null; app.render();" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">All Weeks</option>
                  ${weeks.map(w => `<option value="${w}" ${this.filterWeek === w ? 'selected' : ''}>Week ${w}</option>`).join('')}
                </select>
                
                <select onchange="app.filterDay = this.value ? parseInt(this.value) : null; app.render();" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">All Days</option>
                  ${[1,2,3,4,5,6,7].map(d => `<option value="${d}" ${this.filterDay === d ? 'selected' : ''}>Day ${d}</option>`).join('')}
                </select>
                
                <select onchange="app.filterMarking = this.value !== '' ? parseInt(this.value) : null; app.render();" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">All Marks</option>
                  ${Object.entries(MARKING_CATEGORIES).map(([k, v]) => `<option value="${k}" ${this.filterMarking === parseInt(k) ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
                </select>
                
                <button onclick="app.showMarkedOnly = !app.showMarkedOnly; app.render();" class="px-3 py-2 rounded-xl text-sm transition-colors ${this.showMarkedOnly ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200'}">
                  ${this.showMarkedOnly ? '👁' : '👁‍🗨'} Marked
                </button>
                
                <span class="text-xs text-gray-500">${filteredData.length}</span>
              </div>
            </div>
          </div>
          
          <!-- Main Content -->
          <main class="max-w-7xl mx-auto px-3 py-4 pb-24">
            ${this.renderView(filteredData)}
          </main>
          
          <!-- Marking Legend (Mobile Bottom) -->
          <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-30 md:hidden">
            <div class="flex justify-around text-xs">
              ${Object.entries(MARKING_CATEGORIES).slice(1).map(([k, v]) => `
                <button onclick="app.filterMarking = app.filterMarking === ${k} ? null : ${k}; app.render();" class="flex flex-col items-center gap-0.5 p-1 rounded ${this.filterMarking === parseInt(k) ? 'bg-slate-200' : ''}">
                  <span class="text-lg">${v.icon}</span>
                  <span class="text-[10px] text-gray-500">${k}</span>
                </button>
              `).join('')}
            </div>
          </div>
          
          <!-- Word Modal -->
          ${this.selectedWord ? this.renderWordModal() : ''}
          
          <!-- User ID Modal -->
          ${this.showUserIdModal ? this.renderUserIdModal() : ''}
        `;
      }
      
      renderView(filteredData) {
        switch (this.view) {
          case 'database': return this.renderDatabaseView(filteredData);
          case 'kanji-grid': return this.renderGridView(filteredData, true);
          case 'hiragana-grid': return this.renderGridView(filteredData, false);
          case 'study': return this.renderStudyView(filteredData);
          case 'flashcard': return this.renderFlashcardView(filteredData);
          default: return '';
        }
      }
      
      renderDatabaseView(data) {
        if (data.length === 0) {
          return `<div class="text-center py-20 text-gray-500">
            <p class="text-4xl mb-4">📚</p>
            <p>No words found. ${this.data.length === 0 ? 'Import your CSV file to get started!' : 'Try adjusting your filters.'}</p>
          </div>`;
        }
        
        return `<div class="space-y-2">
          ${data.slice(0, 100).map(word => {
            const marking = this.markings[word.id] || 0;
            const m = MARKING_CATEGORIES[marking];
            return `
              <div class="p-3 rounded-xl border-2 ${m.border} ${m.color} cursor-pointer hover:shadow-md transition-all" onclick="app.selectedWord = app.data.find(w => w.id === ${word.id}); app.render();">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span class="text-xl font-bold text-gray-900">${word.kanji}</span>
                      <span class="text-gray-600">${word.hiragana}</span>
                      <span class="px-1.5 py-0.5 bg-white/50 rounded text-xs">${word.weekDayLabel}</span>
                    </div>
                    <p class="text-sm text-gray-700 truncate">${word.meaning}</p>
                  </div>
                  <div class="flex gap-1 flex-shrink-0">
                    ${[1,2,3,4,5].map(mk => `
                      <button onclick="event.stopPropagation(); app.updateMarking(${word.id}, ${marking === mk ? 0 : mk});" class="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${marking === mk ? MARKING_CATEGORIES[mk].color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-white/50 hover:bg-white'}">
                        ${MARKING_CATEGORIES[mk].icon}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
          ${data.length > 100 ? `<p class="text-center text-gray-500 py-4">Showing first 100 of ${data.length} results. Use filters to narrow down.</p>` : ''}
        </div>`;
      }
      
      renderGridView(data, showKanji) {
        const grouped = {};
        data.forEach(w => {
          if (!grouped[w.weekDayLabel]) grouped[w.weekDayLabel] = [];
          grouped[w.weekDayLabel].push(w);
        });
        
        const weeks = this.getWeeks();
        const weekDays = [];
        weeks.forEach(w => {
          for (let d = 1; d <= 7; d++) weekDays.push(`${w}週${d}日`);
        });
        
        const maxRows = Math.max(...Object.values(grouped).map(arr => arr.length), 1);
        
        return `<div class="overflow-x-auto -mx-3 px-3">
          <table class="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="sticky left-0 bg-slate-800 text-white p-2 text-xs font-medium border border-slate-600 z-10">#</th>
                ${weekDays.slice(0, 21).map(wd => `
                  <th class="bg-slate-800 text-white p-2 text-xs font-medium border border-slate-600 min-w-[80px]">${wd}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: Math.min(maxRows, 25) }).map((_, rowIdx) => `
                <tr>
                  <td class="sticky left-0 bg-slate-100 p-1.5 text-center text-xs font-medium border border-slate-300 z-10">${rowIdx + 1}</td>
                  ${weekDays.slice(0, 21).map(wd => {
                    const words = grouped[wd] || [];
                    const word = words[rowIdx];
                    if (!word) return `<td class="p-1.5 border border-slate-200 bg-white"></td>`;
                    const marking = this.markings[word.id] || 0;
                    const m = MARKING_CATEGORIES[marking];
                    return `
                      <td class="p-1.5 border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${marking > 0 ? m.color : 'bg-white'}" onclick="app.selectedWord = app.data.find(w => w.id === ${word.id}); app.render();">
                        <span class="text-xs font-medium">${showKanji ? word.kanji : word.hiragana}</span>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
      }
      
      renderStudyView(data) {
        if (data.length === 0) {
          return `<div class="text-center py-20 text-gray-500"><p>No words match your filters.</p></div>`;
        }
        
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${data.slice(0, 50).map(word => {
            const marking = this.markings[word.id] || 0;
            const m = MARKING_CATEGORIES[marking];
            return `
              <div class="p-4 rounded-2xl border-2 ${m.border} bg-white shadow-sm hover:shadow-md transition-all cursor-pointer" onclick="app.selectedWord = app.data.find(w => w.id === ${word.id}); app.render();">
                <div class="flex items-center gap-2 mb-2 text-xs text-gray-500">
                  <span class="px-2 py-0.5 rounded ${m.color}">${word.weekDayLabel}</span>
                  ${marking > 0 ? `<span>${m.icon}</span>` : ''}
                </div>
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                  ${word.supportWord1 ? `<span class="text-gray-400 text-sm">${word.supportWord1}</span>` : ''}
                  <span class="text-2xl font-bold text-gray-900">${word.kanji}</span>
                  ${word.supportWord2 ? `<span class="text-gray-400 text-sm">${word.supportWord2}</span>` : ''}
                </div>
                <div class="text-sm text-gray-600 mb-1">${word.hiragana}</div>
                <div class="text-gray-700 text-sm">${word.meaning}</div>
              </div>
            `;
          }).join('')}
        </div>`;
      }
      
      renderFlashcardView(data) {
        if (data.length === 0) {
          return `<div class="text-center py-20 text-gray-500">
            <p>No words match your filters.</p>
            <button onclick="app.filterMarking = null; app.filterWeek = null; app.showMarkedOnly = false; app.render();" class="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg">Clear Filters</button>
          </div>`;
        }
        
        if (this.flashcardIndex >= data.length) this.flashcardIndex = 0;
        const word = data[this.flashcardIndex];
        const marking = this.markings[word.id] || 0;
        const m = MARKING_CATEGORIES[marking];
        
        return `
          <div class="max-w-lg mx-auto">
            <div class="text-center mb-4 text-gray-500 text-sm">
              Card ${this.flashcardIndex + 1} of ${data.length}
            </div>
            
            <div class="min-h-[350px] p-6 rounded-3xl border-2 ${m.border} bg-white shadow-xl cursor-pointer transition-all hover:shadow-2xl" onclick="app.flashcardRevealed = !app.flashcardRevealed; app.render();">
              <div class="flex items-center justify-between mb-4">
                <span class="px-2 py-1 rounded-full text-xs ${m.color}">${word.weekDayLabel}</span>
                <div class="flex gap-1">
                  ${[1,2,3,4,5].map(mk => `
                    <button onclick="event.stopPropagation(); app.updateMarking(${word.id}, ${marking === mk ? 0 : mk});" class="w-8 h-8 rounded-xl flex items-center justify-center transition-all ${marking === mk ? MARKING_CATEGORIES[mk].color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-100 hover:bg-gray-200'}">
                      ${MARKING_CATEGORIES[mk].icon}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <div class="text-center py-6">
                ${word.supportWord1 ? `<p class="text-gray-400 mb-2">${word.supportWord1}</p>` : ''}
                <h2 class="text-5xl font-bold text-gray-900 mb-2">${word.kanji}</h2>
                ${word.supportWord2 ? `<p class="text-gray-400">${word.supportWord2}</p>` : ''}
                
                ${this.flashcardRevealed ? `
                  <div class="mt-6 pt-6 border-t-2 border-dashed border-gray-200 animate-fadeIn">
                    <p class="text-xl text-gray-600 mb-2">${word.hiragana}</p>
                    <p class="text-lg text-gray-800">${word.meaning}</p>
                    ${word.hint ? `<p class="mt-3 text-gray-500 text-sm">💡 ${word.hint}</p>` : ''}
                    ${word.sentence ? `<p class="mt-3 p-3 bg-slate-50 rounded-xl text-gray-600 text-sm">📝 ${word.sentence}</p>` : ''}
                  </div>
                ` : `<p class="text-gray-400 mt-6">Tap to reveal</p>`}
              </div>
            </div>
            
            <div class="flex items-center justify-center gap-3 mt-6">
              <button onclick="app.flashcardIndex = Math.max(0, app.flashcardIndex - 1); app.flashcardRevealed = false; app.render();" ${this.flashcardIndex === 0 ? 'disabled' : ''} class="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors">
                ◀
              </button>
              <button onclick="app.flashcardIndex = Math.floor(Math.random() * ${data.length}); app.flashcardRevealed = false; app.render();" class="px-5 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                Random
              </button>
              <button onclick="app.flashcardIndex = Math.min(${data.length - 1}, app.flashcardIndex + 1); app.flashcardRevealed = false; app.render();" ${this.flashcardIndex === data.length - 1 ? 'disabled' : ''} class="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors">
                ▶
              </button>
            </div>
          </div>
        `;
      }
      
      renderWordModal() {
        const word = this.selectedWord;
        const marking = this.markings[word.id] || 0;
        const m = MARKING_CATEGORIES[marking];
        
        return `
          <div class="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4" onclick="app.selectedWord = null; app.render();">
            <div class="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-slideUp" onclick="event.stopPropagation();">
              <div class="p-5 ${m.color} rounded-t-3xl md:rounded-t-3xl sticky top-0">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm opacity-75 mb-1">${word.weekDayLabel} • Page ${word.pageNo}</p>
                    <h2 class="text-3xl font-bold">${word.kanji}</h2>
                    <p class="text-lg mt-1">${word.hiragana}</p>
                  </div>
                  <button onclick="app.selectedWord = null; app.render();" class="p-2 hover:bg-black/10 rounded-xl transition-colors">✕</button>
                </div>
              </div>
              
              <div class="p-5 space-y-4">
                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-1">Meaning</h3>
                  <p class="text-gray-800">${word.meaning}</p>
                </div>
                
                ${word.hint ? `
                  <div>
                    <h3 class="text-sm font-medium text-gray-500 mb-1">Hint</h3>
                    <p class="text-gray-700">💡 ${word.hint}</p>
                  </div>
                ` : ''}
                
                ${word.sentence ? `
                  <div>
                    <h3 class="text-sm font-medium text-gray-500 mb-1">Example</h3>
                    <p class="text-gray-700 p-3 bg-slate-50 rounded-xl">📝 ${word.sentence}</p>
                  </div>
                ` : ''}
                
                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Mark as</h3>
                  <div class="grid grid-cols-2 gap-2">
                    ${Object.entries(MARKING_CATEGORIES).map(([k, v]) => `
                      <button onclick="app.updateMarking(${word.id}, ${parseInt(k)}); app.selectedWord = app.data.find(w => w.id === ${word.id});" class="p-2.5 rounded-xl text-left text-sm transition-all ${marking === parseInt(k) ? v.color + ' ring-2 ring-gray-400' : 'bg-gray-100 hover:bg-gray-200'}">
                        ${v.icon} ${v.label}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      renderUserIdModal() {
        return `
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="app.showUserIdModal = false; app.render();">
            <div class="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl animate-fadeIn" onclick="event.stopPropagation();">
              <h2 class="text-xl font-bold mb-4">☁️ Cloud Sync Settings</h2>
              
              <div class="mb-4">
                <label class="text-sm font-medium text-gray-600 block mb-1">Your Sync ID</label>
                <input type="text" id="userIdInput" value="${this.userId}" class="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-sm">
                <p class="text-xs text-gray-500 mt-1">Share this ID to sync across devices, or enter a friend's ID to use their progress.</p>
              </div>
              
              <div class="flex gap-2">
                <button onclick="app.showUserIdModal = false; app.render();" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button onclick="app.changeUserId(document.getElementById('userIdInput').value);" class="flex-1 px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-colors">Save & Sync</button>
              </div>
              
              <div class="mt-4 pt-4 border-t border-gray-200">
                <button onclick="navigator.clipboard.writeText('${this.userId}'); alert('Copied!');" class="w-full px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl transition-colors text-sm">
                  📋 Copy Sync ID
                </button>
              </div>
            </div>
          </div>
        `;
      }
    }
    
    // Initialize app
    window.app = new N1VocabApp();
  </script>
</body>
</html>