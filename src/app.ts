import express from "express";
import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";
import path from "path";

import { App } from "./server";
import { Database } from './db/db';
import httpLogger from "../lib/http-logger";
import { load_metadata_to_table, ApplicationConfig } from "./metadata";
const CONFIG_FOLDER : string = '../config';

let config_path = process.env.CONFIG_FOLDER || CONFIG_FOLDER;
let serve_static = process.env.SERVE_STATIC;
let cors_origin = process.env.CORS_ORIGIN || '*';

const corsOptions = {
  "origin": cors_origin,
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
};

(async() => {
  let db: Database;
  let attempts = 0;
  function connect_to_database(tries: number) {
    try {
      db = new Database();
    } catch (e) {
      tries += 1;
      if (tries > 5) {
        throw new Error("Could not connect to database after 5 attempts!");
      } else {
        console.log("Database not ready. Trying again in 5...");
        setTimeout(() => connect_to_database(tries), 5000);
      }
    }
  }
  
  while (attempts < 5) {
    connect_to_database(attempts);
  }

  let applicationConfig : ApplicationConfig = await load_metadata_to_table(db, config_path);

  if (applicationConfig === null) {
    throw new Error("Application config was not loaded!");
  }

  const app = App(express, db, helmet, httpLogger, cors, corsOptions, applicationConfig, slugify);

  if (serve_static) {
    app.use(express.static(path.join(__dirname, serve_static)));
  }
  
  app.listen(8000, () => console.log('running'));
})();


