import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";
import path from "path";

import httpLogger from "./lib/http-logger";

import { App, CorsOptions, AppDependencies, AppOptions } from "./server";
import { Database } from './db/db';
import { load_metadata_to_table, ApplicationConfig } from "./metadata";

const CONFIG_FOLDER = 'config';

const config_path = process.env.CONFIG_FOLDER || CONFIG_FOLDER;
const serve_static = process.env.SERVE_STATIC;
const cors_origin = process.env.CORS_ORIGIN || '*';
const clear_old = process.env.CLEAR_OLD ? true : false;
const no_serve = process.env.NO_SERVE ? true : false;

const corsOptions: CorsOptions = {
  "origin": cors_origin,
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
};

async function connect_to_database(db: Database): Promise<boolean> {
  try {
    const client = await db.pool.connect();
    client.release();
    return true;
  } catch (e) {
    return false;
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
  const absolute_application_path = path.resolve('.');

  try {
    const final_config_path = path.join(absolute_application_path, config_path);
    const applicationConfig: ApplicationConfig = await load_metadata_to_table(db, final_config_path, clear_old);

    if (applicationConfig === null) {
      throw new Error("Application config was not loaded!");
    } else {
      console.debug("Application Config Loaded", applicationConfig);
    }

    if (no_serve) {
      console.debug(applicationConfig);
      return;
    }

    let static_path = undefined;
    if (serve_static) {
      static_path = path.join(__dirname, '..', serve_static);
    }

    const appOptions: AppOptions = {
      database: db,
      corsOptions: corsOptions,
      serve_static_path: static_path,
      httpLogger: httpLogger,
      config: applicationConfig
    }

    const app = App(appDependencies, appOptions);

    app.listen(8000, () => console.info(' == Server running =='));

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

function main(): void {
  const db: Database = new Database();

  console.info("Server application started. Waiting for database connection.");

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => {
    try {
      const connected = await connect_to_database(db);
      if (!connected) {
        throw new Error("Could not connect to database after 5 seconds.");
      } else {
        start_app(db);
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }, 5000);
}

main();
