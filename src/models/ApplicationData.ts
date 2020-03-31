import { CorsOptions } from 'cors';

import { Database } from '../db/db';
import { Group } from './Series';
import { LabelList } from '../settings/parse';

export interface ApplicationConfig {
  groups: Group[];
  labels: LabelList;
}

export type Middleware = (req: any, res: any, next: any) => any;

export interface AppDependencies {
  helmet: () => any;
  cors: (options: CorsOptions) => any;
  slugify: (str: string, options: any) => string;
}

export interface AppOptions {
  database: Database;
  serve_static_path: string | undefined;
  httpLogger: Middleware;
  corsOptions: CorsOptions;
  config: ApplicationConfig;
}