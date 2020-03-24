import express from "express";
import Router from "express-promise-router";
import generator from "json-2-csv";

import { Database } from "../db/db";
import { query_to_sql, Query } from "../db/query";
import { SeriesMap } from "../server";
import { make_response, Response_Category } from "../api";
import { ColumnNameMap } from "../settings/parse";
import { Series } from "../models/Series";

export function DataseriesRouter(d: Database, seriesMap : SeriesMap, cors, corsOptions) {
  let dataseries_router = Router();

  let download_key_map : { 
    [key: string] : {
      [key: number] : {
        filename: string
        download: boolean
        data: any
      }
    }
  } = {};

  Object.keys(seriesMap).forEach(v => download_key_map[v] = {});

  function add_key_to_download_map(series: string, data: object, filename: string, download: boolean): number {
    let id = generate_id();
    while (download_key_map[series].hasOwnProperty(id)) {
      id = generate_id();
    }
    download_key_map[series][id] = {
      download: download,
      filename: filename,
      data: data
    };
    return id;
  }

  function generate_id() : number {
    return Math.floor(Math.random() * 10000000);
  }

  dataseries_router.get('/values', cors(corsOptions), (_, res, __) => {
    res.json(make_response(Response_Category.Values, Object.values(seriesMap).map((s : Series) => {
      return {
        original: s.name,
        name: s.slug
      } as ColumnNameMap;
    })));
  });

  dataseries_router.get('/:series', cors(corsOptions), async (req, res, __) => {
    let { series } = req.params;
    let { download } = req.query;
    if (!seriesMap.hasOwnProperty(series)) {
      res.sendStatus(404);
      return;
    }
    let series_table_name = seriesMap[series].table_name;

    const { rows } = await d.query(`SELECT * FROM ${series_table_name}`);

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

  dataseries_router.get('/:series/query/result', cors(corsOptions), async (req, res, __) => {
    let { series } = req.params;
    let { id } = req.query;
    if (!id || !seriesMap.hasOwnProperty(series) || !download_key_map[series].hasOwnProperty(id)) {
      res.sendStatus(404);
      return;
    }
    let { filename, data, download } = download_key_map[series][id];

    res.format({
      'text/csv': async () => {
        let csv = await generator.json2csvAsync(data);
        if (download) {
          filename += 'csv';
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          filename += "json";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.json(data);
      }
    });

    delete download_key_map[series][id];
  });

  dataseries_router.options('/:series/query', cors(corsOptions));
  
  dataseries_router.post('/:series/query', cors(corsOptions), express.json(), async (req, res, __) => {
    let { series } = req.params;
    let { download } = req.query;
    if (!seriesMap.hasOwnProperty(series)) {
      res.sendStatus(404);
      return;
    }
    let series_table_name = seriesMap[series].table_name;

    const QUERY = query_to_sql(series_table_name, req.body as Query);

    console.debug("performing query: ", QUERY);

    const { rows } = await d.query(QUERY);

    let filename = series_table_name+'.';
    let id = add_key_to_download_map(series, rows, filename, download);
    
    let constructed_url = req.baseUrl + req.path + `/result?id=${id}`
    
    console.debug("created query entry num", id);
    console.debug("file name is ", filename);
    console.debug("rows length is", rows.length);

    res.send(constructed_url);
  });

  return dataseries_router;
}