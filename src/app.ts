import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import slugify from 'slugify'
import path from 'path'
import { Pool } from 'pg'

import httpLogger from './lib/http-logger'
import { isNothing } from './lib/Maybe'

import { Database } from './db/db'
import { MetadataLoader } from './metadata'
import { AppDependencies, AppOptions, ApplicationConfig, RedisOptions } from './models/ApplicationData'
import { Server } from './server'
import { load_yaml } from './utils'
import { SettingsParser } from './settings/parser'
import { isLeft } from './lib/Either'
import { ConfigCache } from './settings/ConfigCache'

const CONFIG_FOLDER = 'config'
const CACHE_FOLDER = 'tmp'

const config_path = process.env.CONFIG_FOLDER || CONFIG_FOLDER
const serve_static = process.env.SERVE_STATIC
const cors_origin = process.env.CORS_ORIGIN || '*'
const clear_old = process.env.CLEAR_OLD ? true : false
const only_clear = process.env.ONLY_CLEAR ? true : false
const no_serve = process.env.NO_SERVE ? true : false
const strict = process.env.STRICT_LOAD ? true : false
const clear_cache = process.env.CLEAR_CACHE ? true : false

const corsOptions: CorsOptions = {
  'origin': cors_origin,
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  'preflightContinue': false,
  'optionsSuccessStatus': 204
}

async function connect_to_database(db: Database): Promise<boolean> {
  try {
    const client = await db.pool.connect()
    client.release()
    return true
  } catch (e) {
    return false
  }
}

const appDependencies: AppDependencies = {
  helmet: helmet,
  slugify: slugify,
  cors: cors
}

async function full_metadata_load(db: Database, final_config_path: string): 
                                                    Promise<ApplicationConfig> {
  const final_settings_path = path.join(final_config_path, 'settings.yml')

  const yaml = load_yaml(final_settings_path)
  const settings = await SettingsParser(yaml, final_config_path)
  if (isLeft(settings)) {
    throw settings.value
  } else {
    console.info('Settings parsed successfully.')
  }

  const metadata_loader = new MetadataLoader(db,
    settings.value,
    final_config_path, {
    clear_old: clear_old,
    strict: strict,
    only_clear: only_clear
  })

  const config = await metadata_loader.load_metadata_to_table()

  if (isNothing(config)) {
    throw new Error('Application config was not loaded!')
  } else {
    console.info('Settings loaded to database successfully.')
  }

  return Promise.resolve(config.value)
}

async function start_app(db: Database): Promise<void> {
  // this is the path from which the application is run.
  // since the application should be run with npm in the root directory,
  // this should be "sth./pardee-datastore/"
  const absolute_application_path = path.resolve('.')

  console.info('Got database connection. Checking for cached settings.')

  try {

    let config: ApplicationConfig

    const final_config_path = path.join(absolute_application_path, config_path)
    const final_cache_path = path.join(absolute_application_path, CACHE_FOLDER)

    const cacheHandler = new ConfigCache(final_cache_path)

    if (clear_cache) {
      console.info('Clearing application config cache.')
      cacheHandler.clearApplicationConfigCache()
    }

    if (cacheHandler.checkCacheFileExists()) {
      console.info('Loading settings from cache.')
      const cache_result = cacheHandler.loadApplicationConfigFromCache()

      if (isLeft(cache_result)) {
        throw cache_result.value
      } else {
        config = cache_result.value
        console.info(`Settings loaded from cache file at ${cacheHandler.fullPath}`)
      }
    } else {
      console.info('No cache found, performing full metadata load.')
      config = await full_metadata_load(db, final_config_path)
      cacheHandler.saveApplicationConfigToCache(config)
    }

    const applicationConfig = config

    if (no_serve) {
      console.debug(applicationConfig)
      return
    }

    let static_path: string | undefined = undefined
    if (serve_static) {
      static_path = path.join(__dirname, '..', serve_static)
    }

    let redis_options: RedisOptions | undefined = undefined
    if (process.env.REDIS_HOST && process.env.REDIS_PORT /*&& process.env.REDIS_PASS*/) {
      const ttl = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL, 10) : 1000
      redis_options = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        // auth_pass: process.env.REDIS_PASS,
        db: 0,
        ttl: ttl
      }
    }

    const appOptions: AppOptions = {
      database: db,
      corsOptions: corsOptions,
      serve_static_path: static_path,
      httpLogger: httpLogger,
      config: applicationConfig,
      redis: redis_options
    }

    const app = Server(appDependencies, appOptions)

    app.listen(8000, () => console.info(' === Server running ==='))

  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

function main(): void {
  const db: Database = new Database(new Pool())

  console.info('Waiting for database connection.')

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => {
    try {
      const connected = await connect_to_database(db)
      if (!connected) {
        throw new Error('Could not connect to database after 5 seconds.')
      } else {
        start_app(db)
      }
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }, 5000)
}

main()
