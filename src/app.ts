import * as express from "express";
import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";
import path from "path";

import httpLogger from "../lib/http-logger";

import { App, CorsOptions, AppDependencies, AppOptions } from "./server";
import { Database } from './db/db';
import { load_metadata_to_table, ApplicationConfig } from "./metadata";

const CONFIG_FOLDER : string = '../config';

let config_path = process.env.CONFIG_FOLDER || CONFIG_FOLDER;
let serve_static = process.env.SERVE_STATIC;
let cors_origin = process.env.CORS_ORIGIN || '*';
let clear_old = process.env.CLEAR_OLD ? true : false;

const corsOptions : CorsOptions = {
  "origin": cors_origin,
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
};

async function connect_to_database(db: Database) : Promise<boolean> {
  try {
    const client = await db.pool.connect();
    client.release();
    return true;
  } catch (e) {
    return false;
  }
}

const appDependencies : AppDependencies = {
  express: express,
  helmet: helmet,
  slugify: slugify,
  cors: cors
}

async function start_app(db: Database): Promise<void> {
  try {
    let applicationConfig: ApplicationConfig = await load_metadata_to_table(db, config_path, clear_old);

    if (applicationConfig === null) {
      throw new Error("Application config was not loaded!");
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

    app.listen(8000, () => console.log(' == Server running =='));

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

function main(): void {
  let db: Database = new Database();

  console.log("Server application started. Waiting for database connection.");

  setTimeout(async () => {
    try {
      let connected = await connect_to_database(db);
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
