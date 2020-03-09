import express from "express";
import cors from "cors";
import helmet from "helmet";
import slugify from "slugify";

import httpLogger from "../lib/http-logger";
import { load_metadata_to_table } from "./metadata";
import { Series } from "./models/Series";

const CONFIG_FOLDER : string = '../test-config';

let conf = process.argv[2] || CONFIG_FOLDER;

const app = express();
app.use(helmet());
app.use(httpLogger);

(async() => {
  let applicationConfig = await load_metadata_to_table(conf);
  
  if (applicationConfig === null) {
    throw new Error("Application config was not loaded!");
  }

  let seriesMap : Map<string, Series> = new Map();

  applicationConfig.series.forEach(s => {
    if (s.slug === undefined) {
      s.slug = slugify(s.name, { lower: true });
    }
    seriesMap.set(s.slug, s);
  })

  app.get('/keys', cors(), (_, res, __) => {
    res.json({
      'keys': applicationConfig.labels.key
    });
  });

  app.get('/key/:key/values', cors(), (req, res, __) => {
    let key = req.params.key.toLowerCase();
    let matched_values = applicationConfig.domain.find(v => v.key == key).domain_values;
    if (matched_values === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json({
      'values' : matched_values
    });
  });

  app.get('/range/values', cors(), (_, res, __) => {
    res.json({
      'range' : applicationConfig.labels.range
    });
  });

  app.get('/special/values', cors(), (_, res, __) => {
    res.json({
      'special' : applicationConfig.labels.special
    })
  });

  app.get('/dataseries/values', cors(), (_, res, __) => {
    res.json({
      'series' : seriesMap.keys()
    });
  });

  app.get('/dataseries/:series', cors() , (req, res, __) => {
    if (!seriesMap.hasOwnProperty(req.params.series)) {
      res.sendStatus(404);
      return;
    }
    res.json({ 'message' : 'i woulda sent you something but i dont have that setup yet'});
  });

  app.use((_, res, __) => {
    res.sendStatus(404);
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.sendStatus(500);
  });

  applicationConfig.series.forEach(series => {
    console.log(series.name);
    if (series.slug !== undefined) {
      console.log("also, slug is " + series.slug);
    }
  });

  app.listen(3000, () => console.log('running'));
})();


