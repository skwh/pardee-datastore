import { TemplateSeries } from './TemplateSeries.model';

export interface Template {
  path: string;
  columns: string[];
  dataseries: TemplateSeries;
}