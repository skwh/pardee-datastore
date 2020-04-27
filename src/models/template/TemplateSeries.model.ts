// A series template, where some names are changed and all types are string
export interface TemplateSeries {
  name: string;
  group: string;
  location: string;
  type: string;
  category?: string;
  metadata?: Record<string, string>;
}