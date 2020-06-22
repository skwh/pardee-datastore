import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import slugify from 'slugify'
import path from 'path'
import { Pool } from 'pg'

import httpLogger from './lib/http-logger'
import { isNothing } from './lib/Maybe'

import { Database } from './db/db'
import { MetadataLoader } from './metadata'
import { AppDependencies, AppOptions } from './models/ApplicationData'
import { Server } from './server'
import { load_yaml } from './utils'
import { SettingsParser } from './settings/parser'
import { isLeft } from './lib/Either'

const CONFIG_FOLDER = 'config'

const config_path = process.env.CONFIG_FOLDER || CONFIG_FOLDER
const serve_static = process.env.SERVE_STATIC
const cors_origin = process.env.CORS_ORIGIN || '*'
const clear_old = process.env.CLEAR_OLD ? true : false
const only_clear = process.env.ONLY_CLEAR ? true : false
const no_serve = process.env.NO_SERVE ? true : false
const strict = process.env.STRICT_LOAD ? true : false

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

async function start_app(db: Database): Promise<void> {
  // this is the path from which the application is run.
  // since the application should be run with npm in the root directory,
  // this should be "sth./pardee-datastore/"
  const absolute_application_path = path.resolve('.')

  console.info('Got database connection. Parsing settings file.')

  try {
    const final_config_path = path.join(absolute_application_path, config_path)
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

    const config  = await metadata_loader.load_metadata_to_table()

    if (isNothing(config)) {
      throw new Error('Application config was not loaded!')
    } else {
      console.info('Settings loaded to database successfully.')
    }

    const applicationConfig = config.value

    if (no_serve) {
      console.debug(applicationConfig)
      return
    }

    let static_path: string | undefined = undefined
    if (serve_static) {
      static_path = path.join(__dirname, '..', serve_static)
    }

    const appOptions: AppOptions = {
      database: db,
      corsOptions: corsOptions,
      serve_static_path: static_path,
      httpLogger: httpLogger,
      config: applicationConfig
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
