import express from "express";
import Router from "express-promise-router";
import generator from "json-2-csv";

import { query, query_to_sql } from "../db/db";

export function DataseriesRouter(seriesMap, cors) {
  let dataseries_router = Router();

  dataseries_router.get('/values', cors(), (_, res, __) => {
    res.json({
      'series': Object.keys(seriesMap)
    });
  });

  dataseries_router.get('/:series', cors(), async (req, res, __) => {
    let { series } = req.params;
    let download = req.query.download;
    if (!seriesMap.hasOwnProperty(series)) {
      res.sendStatus(404);
      return;
    }
    let series_table_name = seriesMap[series].table_name;

    const { rows } = await query(`SELECT * FROM ${series_table_name}`);

    res.format({
      'text/csv': async () => {
        let csv = await generator.json2csvAsync(rows);
        if (download) {
          let filename = series_table_name + ".csv";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          let filename = series_table_name + ".json";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.json(rows);
      }
    })
  });

  dataseries_router.post('/:series/query', cors(), express.json(), async (req, res, __) => {
    let { series } = req.params;
    let download = req.query.download;
    if (!seriesMap.hasOwnProperty(series)) {
      res.sendStatus(404);
      return;
    }
    let series_table_name = seriesMap[series].table_name;

    const QUERY = query_to_sql(series_table_name, req.body);
    const { rows } = await query(QUERY);

    res.format({
      'text/csv': async () => {
        let csv = await generator.json2csvAsync(rows);
        if (download) {
          let filename = series_table_name + ".csv";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          let filename = series_table_name + ".json";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.json(rows);
      }
    });
  });

  return dataseries_router;
}