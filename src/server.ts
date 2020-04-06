import express from 'express';

import { AppDependencies, AppOptions } from './models/ApplicationData';
import { GroupsRouter } from './routers/Groups';
import { make_response, Response_Category } from './api';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const Server = function(deps: AppDependencies, options: AppOptions) {
  const { helmet, cors } = deps;

  const server = express();
  server.use(helmet());
  server.use(options.httpLogger);

  const cors_with_options = cors(options.corsOptions);

  if (options.serve_static_path) {
    console.info("Serving static content from", options.serve_static_path);
    server.use('/', express.static(options.serve_static_path));
  }

  server.get('/keys', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Keys, options.config.labels.key));
  });

  server.get('/range/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Range, options.config.labels.range));
  });

  server.get('/special/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Special, options.config.labels.special));
  });

  server.get('/categories/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Categories, options.config.categories.map(c => c.name)))
  });

  server.param('category', (req, res, next, value) => {
    const found_category = options.config.categories.find(c => c.name === value);
    if (found_category === undefined) {
      res.sendStatus(404);
      return;
    } else {
      req.category = found_category;
      next();
    }
  })

  server.get('/categories/:category/dataseries', cors_with_options, (req, res) => {
    res.json(make_response(Response_Category.Dataseries, req.category.series.map(s => s.name)));
  });

  server.use('/groups', cors_with_options, GroupsRouter(deps, options));
  
  server.use((_, res) => {
    res.sendStatus(404);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  server.use((err, _req, res, _next) => {
    console.error(err);
    res.sendStatus(500);
  });

  return server;
}