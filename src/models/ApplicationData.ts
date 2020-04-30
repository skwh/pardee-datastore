import { CorsOptions } from 'cors';

import { Database } from '../db/db';
import { Category } from './Category.model';
import { Group } from './Group.model';
import { RequestHandler } from 'express';
import { LabelList } from './ColumnValues.enum';

export interface ApplicationConfig {
  groups: Group[];
  labels: LabelList;
  shared_column_names: string[];
  categories?: Category[];
}

type SlugifyOptions = string | 
   { replacement?: string; remove?: RegExp; lower?: boolean; strict?: boolean };

export interface AppDependencies {
  helmet: () => RequestHandler;
  cors: (options: CorsOptions) => RequestHandler;
  slugify: (str: string, options: SlugifyOptions) => string;
}

export interface AppOptions {
  database: Database;
  serve_static_path?: string;
  httpLogger: RequestHandler;
  corsOptions: CorsOptions;
  config: ApplicationConfig;
}