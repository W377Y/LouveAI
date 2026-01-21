
export enum Category {
  CAMINHO = "1ª Porta: O Caminho (Átrio/Celebração)",
  VERDADE = "2ª Porta: A Verdade (Lugar Santo/Adoração)",
  VIDA = "3ª Porta: A Vida (Santo dos Santos/Intimidade)",
  HARPA = "Harpa Cristã",
  GRATIDAO = "Gratidão e Ações de Graças",
  OUTROS = "Outros (Avivamento/Missões)"
}

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  category: Category;
  key?: string;
  ministration: {
    text: string;
    verse?: string;
    direction: string;
  };
  isRecentRepeat?: boolean;
}

export interface Repertory {
  id: string;
  songs: SongItem[];
  status: 'draft' | 'approved';
  scheduledDate?: string;
  serviceName?: string;
  createdAt: number;
}

export interface GeneratorConfig {
  categoryCounts: Partial<Record<Category, number>>;
  globalPrompt: string;
  recentSongs?: string[];
}
