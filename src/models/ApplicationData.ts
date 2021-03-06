import { CorsOptions } from 'cors'

import { Database } from '../db/db'
import { Category } from './Category.model'
import { Group } from './Group.model'
import { RequestHandler } from 'express'
import { LabelList } from './ColumnValues.enum'

export interface ApplicationConfig {
  groups: Group[];
  labels: LabelList;
  shared_column_names: string[];
  categories?: Category[];
  dataseries: {
    monadic: string[];
    dyadic: string[];
  };
}

export interface RedisOptions {
  host: string;
  port: number;
  auth_pass: string;
  db: number;
  ttl: number;
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
  history_mode?: boolean;
  httpLogger: RequestHandler;
  corsOptions: CorsOptions;
  config: ApplicationConfig;
  redis?: RedisOptions;
}
