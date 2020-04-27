export interface Series {
  name: string;
  group: string;
  location: string;
  type: 'monadic' | 'dyadic';
  table_name: string;

  category?: string;
  metadata?: Record<string, string>;
}

