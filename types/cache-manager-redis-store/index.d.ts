import { Store } from 'cache-manager'

declare namespace cacheManagerRedisStore {
  function create(...args: unknown[]): Store;
}

export default cacheManagerRedisStore