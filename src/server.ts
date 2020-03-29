import express from 'express';

import { ApplicationConfig } from './metadata';
import { Series } from "./models/Series";
import { DataseriesRouter } from './routers/Dataseries';
import { GroupsRouter } from './routers/Groups';
import { Database } from './db/db';
import { make_response, Response_Category } from './api';

export interface SeriesMap {
  [key: string]: Series;
}

function create_series_map(ss: Series[], slugify: (str: string, options: any) => string): SeriesMap {
  const rtn: SeriesMap = {};
  ss.forEach(s => {
    if (s.slug === undefined) {
      s.slug = slugify(s.name, { lower: true });
    }
    rtn[s.slug] = s;
  });
  return rtn;
}

export interface CorsOptions {
  origin: string;
  methods: string;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const App = function(deps: AppDependencies, options: AppOptions) {
  const { helmet, cors, slugify } = deps;

  const app = express();
  app.use(helmet());
  app.use(options.httpLogger);

  const cors_with_options = cors(options.corsOptions);

  const seriesList = options.config.groups.flatMap(g => g.series);
  const seriesMap = create_series_map(seriesList, slugify);

  if (options.serve_static_path) {
    console.info("Serving static content from", options.serve_static_path);
    app.use('/', express.static(options.serve_static_path));
  }

  app.get('/keys', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Keys, options.config.labels.key));
  });

  app.get('/range/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Range, options.config.labels.range));
  });

  app.get('/special/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Special, options.config.labels.special));
  });

  app.use('/groups', cors_with_options, GroupsRouter(options, cors));

  app.use('/dataseries', cors_with_options, DataseriesRouter(options.database, seriesMap, cors, options.corsOptions));
  
  app.use((_, res) => {
    res.sendStatus(404);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.sendStatus(500);
  });

  return app;
}