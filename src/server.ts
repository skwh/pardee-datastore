import express from 'express';

import { AppDependencies, AppOptions } from './models/ApplicationData';
import { GroupsRouter } from './routers/Groups';
import { make_response, Response_Category } from './api';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const App = function(deps: AppDependencies, options: AppOptions) {
  const { helmet, cors } = deps;

  const app = express();
  app.use(helmet());
  app.use(options.httpLogger);

  const cors_with_options = cors(options.corsOptions);

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

  app.use('/groups', cors_with_options, GroupsRouter(deps, options));
  
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