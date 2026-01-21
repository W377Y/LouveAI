
import React, { useState, useEffect, useMemo } from 'react';
import { Category, SongItem, Repertory, GeneratorConfig } from './types';
import { generateRepertory, regenerateSong } from './geminiService';
import SongCard from './components/SongCard';

const STORAGE_KEY = 'louveai_repertories';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'calendar'>('create');
  const [savedRepertories, setSavedRepertories] = useState<Repertory[]>([]);
  
  const [config, setConfig] = useState<GeneratorConfig>({
    categoryCounts: {
      [Category.HARPA]: 0,
      [Category.CELEBRACAO]: 2,
      [Category.ADORACAO]: 2,
      [Category.AVIVAMENTO]: 0,
      [Category.GRATIDAO]: 0,
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
    if (stored) {
      setSavedRepertories(JSON.parse(stored));
    }
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

  const totalSelected = Object.values(config.categoryCounts).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);

  const checkRepetition = (songs: SongItem[]) => {
    return songs.map(s => ({
      ...s,
      isRecentRepeat: recentSongTitles.includes(s.title.toLowerCase())
    }));
  };

  const handleGenerate = async () => {
    if (totalSelected === 0) {
      alert("Selecione pelo menos uma música.");
      return;
    }
    setLoading(true);
    try {
      const configWithRecent = { ...config, recentSongs: recentSongTitles };
      let songs = await generateRepertory(configWithRecent);
      songs = checkRepetition(songs);
      
      setRepertory({
        id: Math.random().toString(36).substr(2, 9),
        songs,
        status: 'draft',
        createdAt: Date.now()
      });
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSong = async (songId: string) => {
    if (!repertory) return;
    setLoading(true);
    try {
      const currentSong = repertory.songs.find(s => s.id === songId)!;
      let newSong = await regenerateSong(currentSong, config.globalPrompt, "Troque por outra da mesma categoria", recentSongTitles);
      newSong.isRecentRepeat = recentSongTitles.includes(newSong.title.toLowerCase());
      
      const newSongs = repertory.songs.map(s => s.id === songId ? newSong : s);
      setRepertory({ ...repertory, songs: newSongs });
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualAdjust = async (songId: string, prompt: string) => {
    if (!repertory || !prompt) return;
    setLoading(true);
    try {
      const currentSong = repertory.songs.find(s => s.id === songId)!;
      let newSong = await regenerateSong(currentSong, config.globalPrompt, prompt, recentSongTitles);
      newSong.isRecentRepeat = recentSongTitles.includes(newSong.title.toLowerCase());

      const newSongs = repertory.songs.map(s => s.id === songId ? newSong : s);
      setRepertory({ ...repertory, songs: newSongs });
    } finally {
      setLoading(false);
    }
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    if (!repertory) return;
    const newSongs = [...repertory.songs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;
    [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
    setRepertory({ ...repertory, songs: newSongs });
  };

  const updateCount = (cat: Category, delta: number) => {
    setConfig(prev => ({
      ...prev,
      categoryCounts: {
        ...prev.categoryCounts,
        [cat]: Math.max(0, (prev.categoryCounts[cat] || 0) + delta)
      }
    }));
  };

  const saveToCalendar = () => {
    if (repertory && serviceDetails.name && serviceDetails.date) {
      const finalRep = {
        ...repertory,
        serviceName: serviceDetails.name,
        scheduledDate: serviceDetails.date,
        status: 'approved' as const
      };

      if (editingId) {
        setSavedRepertories(prev => prev.map(r => r.id === editingId ? finalRep : r));
      } else {
        setSavedRepertories(prev => [finalRep, ...prev]);
      }

      setRepertory(null);
      setEditingId(null);
      setShowCalendarModal(false);
      setActiveTab('calendar');
    }
  };

  const editSavedRepertory = (rep: Repertory) => {
    setRepertory(rep);
    setEditingId(rep.id);
    setServiceDetails({ name: rep.serviceName || '', date: rep.scheduledDate || '' });
    setActiveTab('create');
  };

  const deleteRepertory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja excluir este repertório?")) {
      setSavedRepertories(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 flex flex-col">
        <div className="px-4 py-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-lg text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">LouveAI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Gestão Profética de Louvor</p>
            </div>
          </div>
        </div>
        
        <div className="flex border-t border-slate-100">
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-tighter transition-all ${activeTab === 'create' ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/30' : 'text-slate-400'}`}
          >
            {repertory ? (editingId ? 'Editando Repertório' : 'Repertório Atual') : 'Novo Repertório'}
          </button>
          <button 
            onClick={() => { setActiveTab('calendar'); setRepertory(null); setEditingId(null); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-tighter transition-all ${activeTab === 'calendar' ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/30' : 'text-slate-400'}`}
          >
            Histórico de Cultos
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6">
        {activeTab === 'create' ? (
          <>
            {!repertory ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Montar Repertório</h2>
                <p className="text-sm text-slate-500 mb-6">A IA analisará o histórico para evitar repetições recentes.</p>
                
                <div className="space-y-3 mb-8">
                  {Object.values(Category).map(cat => (
                    <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">{cat}</span>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateCount(cat, -1)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">-</button>
                        <span className="w-6 text-center font-bold text-lg text-slate-800">{config.categoryCounts[cat] || 0}</span>
                        <button onClick={() => updateCount(cat, 1)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={loading || totalSelected === 0}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold py-5 rounded-2xl shadow-lg shadow-amber-200 flex justify-center items-center gap-3 transition-all transform active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       <span>Buscando Direção...</span>
                    </div>
                  ) : "Gerar Repertório Profético"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 pb-20 animate-in slide-in-from-bottom duration-500">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                   <button onClick={() => { setRepertory(null); setEditingId(null); }} className="text-slate-500 text-xs font-bold uppercase flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                     Cancelar
                   </button>
                   <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{repertory.songs.length} LOUVORES</span>
                </div>
                
                {repertory.songs.map((song, index) => (
                  <div key={song.id} className="relative group">
                    <SongCard 
                      song={song} 
                      index={index} 
                      onRegenerate={handleRegenerateSong}
                      onEditPrompt={handleIndividualAdjust}
                    />
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 p-1 rounded-lg shadow-xl z-10">
                      <button onClick={() => moveSong(index, 'up')} className="p-1 hover:text-amber-500 disabled:text-slate-200" disabled={index === 0}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                      </button>
                      <button onClick={() => moveSong(index, 'down')} className="p-1 hover:text-amber-500 disabled:text-slate-200" disabled={index === repertory.songs.length - 1}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => setShowCalendarModal(true)} 
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-green-600 text-white font-bold py-4 rounded-2xl shadow-2xl flex justify-center items-center gap-2 hover:bg-green-700 transition-all z-40"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  {editingId ? 'Salvar Alterações' : 'Finalizar e Agendar'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Meus Cultos</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">{savedRepertories.length} salvos</span>
            </div>
            {savedRepertories.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                Nenhum repertório agendado ainda.
              </div>
            ) : (
              <div className="grid gap-4">
                {savedRepertories.map(rep => (
                  <div 
                    key={rep.id} 
                    onClick={() => editSavedRepertory(rep)}
                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-amber-600 transition-colors">{rep.serviceName}</h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          {new Date(rep.scheduledDate! + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => deleteRepertory(rep.id, e)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rep.songs.map((s, idx) => (
                        <span key={s.id} className="text-[9px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100 font-bold uppercase">
                          {idx + 1}. {s.title}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toque para ver detalhes e editar</span>
                       <svg className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {activeTab === 'create' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-40">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input 
              type="text"
              value={config.globalPrompt}
              onChange={(e) => setConfig({...config, globalPrompt: e.target.value})}
              placeholder="Direcionamento espiritual (ex: Culto de Santa Ceia)"
              className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-400 outline-none border border-transparent focus:bg-white transition-all"
            />
            <button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="bg-slate-800 text-white p-3 rounded-2xl hover:bg-slate-700 disabled:bg-slate-300 transition-all shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{editingId ? 'Atualizar Agendamento' : 'Agendar Culto'}</h3>
            <p className="text-sm text-slate-500 mb-6">Defina os detalhes para salvar no seu calendário ministerial.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Nome do Culto</label>
                <input 
                  type="text" 
                  placeholder="Ex: Culto da Família" 
                  value={serviceDetails.name} 
                  onChange={(e) => setServiceDetails({...serviceDetails, name: e.target.value})} 
                  className="w-full border border-slate-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Data do Culto</label>
                <input 
                  type="date" 
                  value={serviceDetails.date} 
                  onChange={(e) => setServiceDetails({...serviceDetails, date: e.target.value})} 
                  className="w-full border border-slate-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCalendarModal(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                <button 
                  onClick={saveToCalendar} 
                  disabled={!serviceDetails.name || !serviceDetails.date}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-300 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[60] flex flex-col items-center justify-center text-amber-600 animate-in fade-in duration-300">
           <div className="relative">
             <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
             </div>
           </div>
           <p className="mt-6 font-bold text-lg animate-pulse tracking-tight">Ouvindo a voz do Espírito...</p>
           <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-medium">Analisando histórico de 30 dias</p>
        </div>
      )}
    </div>
  );
};

export default App;
