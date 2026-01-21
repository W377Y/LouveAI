
import React, { useState, useEffect, useMemo } from 'react';
import { Category, SongItem, Repertory, GeneratorConfig } from './types';
import { generateRepertory, regenerateSong } from './geminiService';
import SongCard from './components/SongCard';

const STORAGE_KEY = 'louveai_repertories_v3';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'calendar'>('create');
  const [savedRepertories, setSavedRepertories] = useState<Repertory[]>([]);
  
  const [config, setConfig] = useState<GeneratorConfig>({
    categoryCounts: {
      [Category.HARPA]: 1,
      [Category.CAMINHO]: 1,
      [Category.VERDADE]: 1,
      [Category.VIDA]: 1,
      [Category.GRATIDAO]: 1,
      [Category.OUTROS]: 0,
    },
    globalPrompt: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [repertory, setRepertory] = useState<Repertory | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [serviceDetails, setServiceDetails] = useState({ name: '', date: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSavedRepertories(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRepertories));
  }, [savedRepertories]);

  const recentSongTitles = useMemo(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const titles = new Set<string>();
    savedRepertories.forEach(rep => {
      if (rep.createdAt > thirtyDaysAgo) {
        rep.songs.forEach(s => titles.add(s.title.toLowerCase()));
      }
    });
    return Array.from(titles);
  }, [savedRepertories]);

  const handleGenerate = async () => {
    const total = Object.values(config.categoryCounts).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
    if (total === 0) return alert("Selecione as músicas do culto.");
    setLoading(true);
    try {
      const songs = await generateRepertory({ ...config, recentSongs: recentSongTitles });
      setRepertory({
        id: Math.random().toString(36).substr(2, 9),
        songs: songs.map(s => ({ ...s, isRecentRepeat: recentSongTitles.includes(s.title.toLowerCase()) })),
        status: 'draft',
        createdAt: Date.now()
      });
      setEditingId(null);
    } catch (e) {
      alert("Erro ao preparar o altar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSong = async (songId: string) => {
    if (!repertory) return;
    setLoading(true);
    try {
      const currentSong = repertory.songs.find(s => s.id === songId)!;
      let newSong = await regenerateSong(currentSong, config.globalPrompt, "Troque mantendo o momento do culto", recentSongTitles);
      newSong.isRecentRepeat = recentSongTitles.includes(newSong.title.toLowerCase());
      setRepertory({ ...repertory, songs: repertory.songs.map(s => s.id === songId ? newSong : s) });
    } finally {
      setLoading(false);
    }
  };

  // Fix for line 193: Implement missing handleIndividualAdjust function
  const handleIndividualAdjust = async (songId: string, prompt: string) => {
    if (!repertory) return;
    setLoading(true);
    try {
      const currentSong = repertory.songs.find(s => s.id === songId)!;
      let newSong = await regenerateSong(currentSong, config.globalPrompt, prompt, recentSongTitles);
      newSong.isRecentRepeat = recentSongTitles.includes(newSong.title.toLowerCase());
      setRepertory({ ...repertory, songs: repertory.songs.map(s => s.id === songId ? newSong : s) });
    } catch (e) {
      alert("Erro ao ajustar a música. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const updateCount = (cat: Category, delta: number) => {
    setConfig(c => ({...c, categoryCounts: {...c.categoryCounts, [cat]: Math.max(0, (c.categoryCounts[cat]||0)+delta)}}));
  };

  const saveToCalendar = () => {
    if (!repertory || !serviceDetails.name || !serviceDetails.date) return;
    const finalRep = { ...repertory, serviceName: serviceDetails.name, scheduledDate: serviceDetails.date, status: 'approved' as const };
    setSavedRepertories(prev => editingId ? prev.map(r => r.id === editingId ? finalRep : r) : [finalRep, ...prev]);
    setRepertory(null); setEditingId(null); setShowCalendarModal(false); setActiveTab('calendar');
  };

  return (
    <div className="min-h-screen pb-32 bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-xl text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">LouveAI</h1>
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-[0.1em]">Sequência Litúrgica 2026</p>
            </div>
          </div>
        </div>
        <div className="flex px-4">
          <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'create' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400'}`}>Montagem</button>
          <button onClick={() => { setActiveTab('calendar'); setRepertory(null); }} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'calendar' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400'}`}>Histórico</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-8">
        {activeTab === 'create' ? (
          <>
            {!repertory ? (
              <div className="space-y-6">
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    1. Abertura do Culto
                  </h2>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Harpa Cristã</p>
                      <p className="text-[10px] text-slate-400 font-medium">Hinos tradicionais e congregacionais</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCount(Category.HARPA, -1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">-</button>
                      <span className="font-bold">{config.categoryCounts[Category.HARPA] || 0}</span>
                      <button onClick={() => updateCount(Category.HARPA, 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">+</button>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    2. Louvor (Tabernáculo)
                  </h2>
                  <div className="space-y-3">
                    {[Category.CAMINHO, Category.VERDADE, Category.VIDA].map(cat => (
                      <div key={cat} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="max-w-[70%]">
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{cat.split(':')[0]}</p>
                          <p className="text-[10px] text-slate-500">{cat.split(':')[1]}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateCount(cat, -1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">-</button>
                          <span className="font-bold">{config.categoryCounts[cat] || 0}</span>
                          <button onClick={() => updateCount(cat, 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    3. Ofertas e Dízimos
                  </h2>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Gratidão / Fidelidade</p>
                      <p className="text-[10px] text-slate-400 font-medium">Momento de entrega e consagração</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCount(Category.GRATIDAO, -1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">-</button>
                      <span className="font-bold">{config.categoryCounts[Category.GRATIDAO] || 0}</span>
                      <button onClick={() => updateCount(Category.GRATIDAO, 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">+</button>
                    </div>
                  </div>
                </section>

                <button onClick={handleGenerate} disabled={loading} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl flex justify-center items-center gap-3 hover:scale-[1.02] transition-all">
                  GERAR REPERTÓRIO DO CULTO
                </button>
              </div>
            ) : (
              <div className="space-y-4 pb-24">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3 mb-6">
                  <div className="bg-amber-100 p-2 rounded-full text-amber-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <p className="text-xs text-amber-800 font-medium leading-tight">O repertório foi organizado na ordem: Harpa → Jornada do Louvor → Dízimos.</p>
                </div>

                {repertory.songs.map((song, idx) => (
                  <div key={song.id}>
                    <SongCard song={song} index={idx} onRegenerate={handleRegenerateSong} onEditPrompt={handleIndividualAdjust} />
                  </div>
                ))}

                <button onClick={() => setShowCalendarModal(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-amber-600 text-white font-black py-4 rounded-2xl shadow-2xl z-40">
                  APROVAR E AGENDAR
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {savedRepertories.map(rep => (
              <div key={rep.id} onClick={() => { setRepertory(rep); setEditingId(rep.id); setServiceDetails({name: rep.serviceName||'', date: rep.scheduledDate||''}); setActiveTab('create'); }} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 transition-all">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-black text-slate-800">{rep.serviceName}</h3>
                   <span className="text-[10px] font-black text-slate-400">{new Date(rep.scheduledDate! + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rep.songs.map((s, i) => <span key={i} className="text-[8px] bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-bold">{s.title}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {activeTab === 'create' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input 
              value={config.globalPrompt} 
              onChange={e => setConfig(c => ({...c, globalPrompt: e.target.value}))}
              placeholder="Ex: Culto de Jovens - Tema: Santidade"
              className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button onClick={handleGenerate} disabled={loading} className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-6">Consagrar para o Calendário</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nome do Culto" value={serviceDetails.name} onChange={e => setServiceDetails({...serviceDetails, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none" />
              <input type="date" value={serviceDetails.date} onChange={e => setServiceDetails({...serviceDetails, date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none" />
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowCalendarModal(false)} className="flex-1 py-4 font-bold text-slate-400">Voltar</button>
                <button onClick={saveToCalendar} className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-100">SALVAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 font-black text-slate-800 text-lg">Organizando a Liturgia...</p>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Harpa → Louvor → Dízimos</p>
        </div>
      )}
    </div>
  );
};

export default App;
