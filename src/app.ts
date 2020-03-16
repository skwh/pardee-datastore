import express from "express";
import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";
import path from "path";

import { App } from "./server";
import httpLogger from "../lib/http-logger";
import { load_metadata_to_table, ApplicationConfig } from "./metadata";
const CONFIG_FOLDER : string = '../config';

let config_path = process.argv[2] || CONFIG_FOLDER;
let serve_static = process.argv[3];
let cors_origin = process.argv[4] || '*';

const corsOptions = {
  "origin": cors_origin,
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
};

(async() => {
  let applicationConfig : ApplicationConfig = await load_metadata_to_table(config_path);

  if (applicationConfig === null) {
    throw new Error("Application config was not loaded!");
  }

  const app = App(express, helmet, httpLogger, cors, corsOptions, applicationConfig, slugify);

  if (serve_static) {
    app.use(express.static(path.join(__dirname, serve_static)));
  }
  
  app.listen(8000, () => console.log('running'));
})();


