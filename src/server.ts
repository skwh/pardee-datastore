import express from 'express';

import { ApplicationConfig } from './metadata';
import { Series } from "./models/Series";
import { DataseriesRouter } from './routers/Dataseries';
import { Database } from './db/db';
import { make_response, Response_Category } from './api';

export interface SeriesMap {
  [key : string] : Series
}

function create_series_map(ss: Series[], slugify: (str: string, options: any) => string) : SeriesMap {
  let rtn : SeriesMap = {};
  ss.forEach(s => {
    if (s.slug === undefined) {
      s.slug = slugify(s.name, { lower: true });
    }
    rtn[s.slug] = s;
  });
  return rtn;
}

export interface CorsOptions {
  origin: string
  methods: string
  preflightContinue: boolean
  optionsSuccessStatus: number
}

export type Middleware = (req: any, res: any, next: any) => any;

export interface AppDependencies {
  helmet: () => any
  cors: (options: CorsOptions) => any
  slugify: (str : string, options: any) => string
}

export interface AppOptions {
  database: Database
  serve_static_path: string | undefined
  httpLogger: Middleware
  corsOptions: CorsOptions
  config: ApplicationConfig
}

export const App = function(deps: AppDependencies, options: AppOptions) {
  let { helmet, cors, slugify } = deps;

  let app = express();
  app.use(helmet());
  app.use(options.httpLogger);

  let cors_with_options = cors(options.corsOptions);
  
  let seriesMap : SeriesMap = create_series_map(options.config.series, slugify);

  if (options.serve_static_path) {
    console.log("Serving static content from", options.serve_static_path);
    app.use('/', express.static(options.serve_static_path));
  }

  app.get('/keys', cors_with_options, (_, res, __) => {
    res.json(make_response(Response_Category.Keys, options.config.labels.key));
  });

  app.get('/key/:key/values', cors_with_options, (req, res, __) => {
    let key = req.params.key.toLowerCase();
    let matched_keys = options.config.domain.find(v => v.key == key);
    if (matched_keys === undefined) {
      res.sendStatus(500);
      return;
    } 
    let matched_values = matched_keys.domain_values;
    if (matched_values === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json(make_response(Response_Category.Values, matched_values));
  });

  app.get('/range/values', cors_with_options, (_, res, __) => {
    res.json(make_response(Response_Category.Range, options.config.labels.range));
  });

  app.get('/special/values', cors_with_options, (_, res, __) => {
    res.json(make_response(Response_Category.Special, options.config.labels.special));
  });

  app.use('/dataseries', cors_with_options, DataseriesRouter(options.database, seriesMap, cors, options.corsOptions));
  
  app.use((_, res, __) => {
    res.sendStatus(404);
  });

  app.use((err, _, res, __) => {
    console.error(err);
    res.sendStatus(500);
  });

  return app;
}