import Router from 'express-promise-router'

import { findMaybe, isNothing, Nothing, Just } from '../lib/Maybe'

import { AppDependencies, AppOptions } from '../models/ApplicationData'
import { make_response, Response_Category } from '../api'
import { Category } from '../models/Category.model'
import { RequestHandler } from 'express'

// quick & dirty model for returning total structure of categories
interface CategoryJsonModel {
  categories: {
    name: string;
    dataseries: {
      name: string;
      groups: string[];
    }[];
  }[];
}

export function CategoryRouter(categories: Category[], 
                               dependencies: AppDependencies, 
                               options: AppOptions): RequestHandler {
  const category_router = Router()
  const { cors } = dependencies
  const { corsOptions } = options

  const cors_with_options = cors(corsOptions)

  const category_json_model = ((): CategoryJsonModel => {
    return {
      categories: categories.map(c => {
        return {
          name: c.name.original,
          dataseries: Object.values(c.series).map(ref => {
            return {
              name: ref.name,
              groups: Array.from(ref.groups.values())
            }
          })
        }
      })
    }
  })()

  category_router.get('/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Categories, 
                           categories.map(c => c.name)))
  })

  category_router.get('/all', cors_with_options, (_, res) => {
    res.json(category_json_model)
  })

  category_router.param('category', (req, res, next, value) => {
    const found_category = findMaybe(categories, c => c.name.alias === value)
    if (isNothing(found_category)) {
      res.sendStatus(404)
      return
    } else {
      req.category = found_category.value
      next()
    }
  })

  category_router.get('/:category/dataseries', cors_with_options, 
                                                                 (req, res) => {
    res.json(make_response(Response_Category.Dataseries, 
                           Object.keys(req.category.series)))
  })

  category_router.param('series', (req, res, next, value) => {
    const found_series = req.category.series[value] === undefined ? Nothing : 
                                              Just(req.category.series[value])
    if (isNothing(found_series)) {
      res.sendStatus(404)
      return
    } else {
      req.seriesRef = found_series.value
      next()
    }
  })

  category_router.get('/:category/dataseries/:series/groups', cors_with_options,
                                                                 (req, res) => {
    res.json(make_response(Response_Category.Groups,
                          Array(...req.seriesRef.groups.values())))
  })

  return category_router
}
