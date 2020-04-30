import Router from 'express-promise-router';

import { findMaybe, isNothing } from '../lib/Maybe';

import { AppDependencies, AppOptions } from '../models/ApplicationData';
import { make_response, Response_Category } from '../api';
import { Category } from '../models/Category.model';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function CategoryRouter(categories: Category[], dependencies: AppDependencies, options: AppOptions) {
  const category_router = Router();
  const { cors } = dependencies;
  const { corsOptions } = options;

  const cors_with_options = cors(corsOptions);

  category_router.get('/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Categories, categories.map(c => c.name)));
  });

  category_router.param('category', (req, res, next, value) => {
    const found_category = findMaybe(categories, c => c.name === value);
    if (isNothing(found_category)) {
      res.sendStatus(404);
      return;
    } else {
      req.category = found_category.value;
      next();
    }
  });

  category_router.get('/:category/dataseries', cors_with_options, (req, res) => {
    res.json(make_response(Response_Category.Dataseries, req.category.series.map(s => s.name)));
  });

  return category_router;
}