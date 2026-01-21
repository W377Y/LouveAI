
import React from 'react';
import { SongItem } from '../types';

interface SongCardProps {
  song: SongItem;
  index: number;
  onRegenerate: (id: string) => void;
  onEditPrompt: (id: string, prompt: string) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, index, onRegenerate, onEditPrompt }) => {
  const [prompt, setPrompt] = React.useState("");

  const handleYoutubeSearch = () => {
    const query = encodeURIComponent(`${song.title} ${song.artist} louvor`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  return (
    <div className={`bg-white border-l-4 ${song.isRecentRepeat ? 'border-red-400' : 'border-amber-400'} rounded-r-lg shadow-sm p-5 mb-4 hover:shadow-md transition-shadow`}>
      {song.isRecentRepeat && (
        <div className="bg-red-50 text-red-700 text-[10px] font-bold py-1 px-3 rounded-full mb-3 flex items-center gap-1 w-fit">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          MÚSICA TOCADA HÁ MENOS DE 30 DIAS
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Música {index + 1}</span>
          <h3 className="text-xl font-bold text-slate-800 leading-tight">{song.title}</h3>
          <p className="text-sm text-amber-600 font-medium mb-2">{song.artist}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded uppercase font-bold">{song.category}</span>
            {song.key && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Tom: {song.key}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleYoutubeSearch}
            className="text-red-500 hover:text-red-600 p-1.5 bg-red-50 rounded-lg transition-colors"
            title="Ver no YouTube"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          </button>
          <button 
            onClick={() => onRegenerate(song.id)}
            className="text-slate-400 hover:text-amber-600 p-1.5 bg-slate-50 rounded-lg transition-colors"
            title="Trocar música"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-4 italic text-slate-700 relative border border-slate-100">
        <div className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-amber-600 uppercase border border-slate-100 rounded-full">🕊️ Ministração</div>
        <p className="text-sm leading-relaxed mb-2 mt-1">"{song.ministration.text}"</p>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span>📖 {song.ministration.verse || 'Base bíblica sugerida'}</span>
          <span className="text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-full">{song.ministration.direction}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Personalizar esta faixa..."
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-slate-50/50"
        />
        <button 
          onClick={() => { onEditPrompt(song.id, prompt); setPrompt(""); }}
          className="bg-slate-800 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Ajustar
        </button>
      </div>
    </div>
  );
};

export default SongCard;
