import { CorsOptions } from 'cors';

import { Database } from '../db/db';
import { Group, Category } from './Series';
import { LabelList } from '../settings/parse';
import { RequestHandler } from 'express';

export interface ApplicationConfig {
  groups: Group[];
  categories: Category[];
  labels: LabelList;
}

type SlugifyOptions = string | { replacement?: string; remove?: RegExp; lower?: boolean; strict?: boolean };

export type Middleware = RequestHandler;

export interface AppDependencies {
  helmet: () => Middleware;
  cors: (options: CorsOptions) => Middleware;
  slugify: (str: string, options: SlugifyOptions) => string;
}

export interface AppOptions {
  database: Database;
  serve_static_path: string | undefined;
  httpLogger: Middleware;
  corsOptions: CorsOptions;
  config: ApplicationConfig;
}