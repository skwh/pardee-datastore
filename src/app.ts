import express from "express";
import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";
import path from "path";

import { App } from "./server";
import httpLogger from "../lib/http-logger";
import { load_metadata_to_table, ApplicationConfig } from "./metadata";
const CONFIG_FOLDER : string = '../test-config';

let conf = process.argv[2] || CONFIG_FOLDER;
let serve_static = process.argv[3];

(async() => {
  let applicationConfig : ApplicationConfig = await load_metadata_to_table(conf);

  if (applicationConfig === null) {
    throw new Error("Application config was not loaded!");
  }

  const app = App(express, helmet, httpLogger, cors, applicationConfig, slugify);

  if (serve_static) {
    app.use(express.static(path.join(__dirname, serve_static)));
  }
  
  app.listen(3000, () => console.log('running'));
})();


