/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs'

import express, { Request, Response, RequestHandler } from 'express'
import compression from 'compression'
import ExpressCache from 'express-cache-middleware'
import CacheManager from 'cache-manager'
import RedisStore from 'cache-manager-redis-store'

import { AppDependencies, AppOptions } from './models/ApplicationData'
import { GroupsRouter } from './routers/Groups.router'
import { make_response, Response_Category } from './api'
import { CategoryRouter } from './routers/Category.router'
import { readdirSyncRecursive } from './utils'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const Server = function(deps: AppDependencies, options: AppOptions) {
  const { helmet, cors } = deps

  const server = express()
  server.use(helmet())
  server.use(compression())
  server.use(options.httpLogger)

  const cors_with_options = cors(options.corsOptions)

  const static_file_paths: string[] = []

  if (options.serve_static_path) {
    console.info('Serving static content from', options.serve_static_path)
    static_file_paths.push(
                        ...readdirSyncRecursive('/', options.serve_static_path))
    server.use('/', express.static(options.serve_static_path))
  }

  if (options.redis) {
    const cacheMiddleware = new ExpressCache(
      CacheManager.caching({
        store: RedisStore,
        host: options.redis.host,
        port: options.redis.port,
        auth_pass: options.redis.auth_pass,
        db: options.redis.db,
        ttl: options.redis.ttl
      }),
      {
        hydrate: (req, res, data): Promise<string | Buffer> => {
          if (static_file_paths.includes(req.path)) {
            res.contentType(req.path)
          } else {
            res.contentType('application/json')
          }
          return Promise.resolve(data)
        },
        except: (cacheKey: string): boolean => cacheKey.includes('query')
      }
    )
    // Use forked version of express-cache-middleware for 
    //  attaching other request handlers before the cache hook
    cacheMiddleware.attach(server, cors_with_options)
    console.info('Caching attached.')
  }

  server.get('/keys', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Keys, 
                           options.config.labels.key))
  })

  server.get('/cokeys', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Cokeys, 
                           options.config.labels.cokey))
  })

  server.get('/range/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Range, 
                           options.config.labels.range))
  })

  server.get('/special/values', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Special, 
                           options.config.labels.special))
  })

  if (options.config.categories !== undefined) {
    server.use('/categories', 
               cors_with_options, 
               CategoryRouter(options.config.categories, deps, options))
  }

  server.use('/groups', cors_with_options, GroupsRouter(deps, options))

  server.get('/dataseries/monadic', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Dataseries,
                           options.config.dataseries.monadic))
  })

  server.get('/dataseries/dyadic', cors_with_options, (_, res) => {
    res.json(make_response(Response_Category.Dataseries,
                           options.config.dataseries.dyadic))
  })
  
  server.use((_, res) => {
    if (options.history_mode && options.serve_static_path) {
      res.sendFile(options.serve_static_path + '/index.html')
    } else {
      res.sendStatus(404)
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.use((err: any, 
              _req: Request, 
              res: Response, 
              _next: RequestHandler) => {
    // If the error involved the JSON parser, return a 400 bad request
    if (err.type === 'entity.parse.failed') {
      res.sendStatus(400)
      return
    }

    console.error(err)
    res.sendStatus(500)
  })

  return server
}
