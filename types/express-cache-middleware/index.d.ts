import { Cache } from 'cache-manager'
import { Application, Request, Response, RequestHandler } from 'express'

declare namespace expressCacheMiddleware {
  export interface CacheOptions {
    getCacheKey?: (req: Request) => string;
    hydrate?: (req: Request, res: Response, data: Buffer | string) => Promise<Buffer | string>;
  }
}

declare class ExpressCacheMiddleware {
  constructor(cacheManager: Cache,
              options?: expressCacheMiddleware.CacheOptions)

  attach(app: Application, ...callbacks: RequestHandler[]): void
  cacheRoute(req: Request, res: Response, next: RequestHandler): Promise<void>
  cacheGet(key: string): Promise<unknown>
  cacheSet(key: string, value: unknown): Promise<unknown>
}

export as namespace ExpressCacheMiddleware

export = ExpressCacheMiddleware