
export enum Category {
  HARPA = "Harpa Cristã",
  CELEBRACAO = "Celebração",
  ADORACAO = "Adoração",
  AVIVAMENTO = "Avivamento",
  GRATIDAO = "Gratidão",
  OUTROS = "Outros"
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
  isRecentRepeat?: boolean; // Flag para indicar se tocou recentemente
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
  recentSongs?: string[]; // Títulos das músicas tocadas nos últimos 30 dias
}
