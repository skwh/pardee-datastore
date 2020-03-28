import express from "express";
import Router from "express-promise-router";
import generator from "json-2-csv";

import { Database } from "../db/db";
import { query_to_sql, Query } from "../db/query";
import { SeriesMap } from "../server";
import { make_response, Response_Category } from "../api";
import { ColumnNameMap } from "../settings/parse";
import { Series } from "../models/Series";
import { has_prop } from "../utils";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function DataseriesRouter(d: Database, seriesMap: SeriesMap, cors, corsOptions) {
  const dataseries_router = Router();

  const download_key_map: { 
    [key: string]: {
      [key: number]: {
        filename: string;
        download: boolean;
        data: any;
      };
    };
  } = {};

  Object.keys(seriesMap).forEach(v => download_key_map[v] = {});

  function generate_id(): number {
    return Math.floor(Math.random() * 10000000);
  }

  function add_key_to_download_map(series: string, data: object, filename: string, download: boolean): number {
    let id = generate_id();
    while (has_prop(download_key_map[series], ""+id)) {
      id = generate_id();
    }
    download_key_map[series][id] = {
      download: download,
      filename: filename,
      data: data
    };
    return id;
  }

  dataseries_router.get('/values', cors(corsOptions), (_, res) => {
    res.json(make_response(Response_Category.Values, Object.values(seriesMap).map((s: Series) => {
      return {
        original: s.name,
        alias: s.slug
      } as ColumnNameMap;
    })));
  });

  dataseries_router.get('/:series', cors(corsOptions), async (req, res) => {
    const { series } = req.params;
    const { download } = req.query;
    if (!has_prop(seriesMap, series)) {
      res.sendStatus(404);
      return;
    }
    const series_table_name = seriesMap[series].table_name;

    const { rows } = await d.query(`SELECT * FROM ${series_table_name}`);

    res.format({
      'text/csv': async () => {
        const csv = await generator.json2csvAsync(rows);
        if (download) {
          const filename = series_table_name + ".csv";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          const filename = series_table_name + ".json";
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }
        res.json(rows);
      }
    })
  });

  dataseries_router.get('/:series/key/:key/values', cors(corsOptions), (req, res) => {
    const { series, key } = req.params;
    if (!has_prop(seriesMap, series)) {
      res.sendStatus(404);
      return;
    }
    const seriesObject = seriesMap[series];

    const matched_values = seriesObject.group.domainKeyValues[key];
    if (matched_values === undefined) {
      res.sendStatus(404);
      return;
    }

    res.json(make_response(Response_Category.Values, matched_values));
  });

  dataseries_router.get('/:series/query/result', cors(corsOptions), (req, res) => {
    const { series } = req.params;
    const { id } = req.query;
    if (!id || !has_prop(seriesMap, series) || !has_prop(download_key_map[series], id)) {
      res.sendStatus(404);
      return;
    }
    const { filename, data, download } = download_key_map[series][id];

    res.format({
      'text/csv': async () => {
        const csv = await generator.json2csvAsync(data);
        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
        }
        res.json(data);
      }
    });

    delete download_key_map[series][id];
  });

  dataseries_router.options('/:series/query', cors(corsOptions));
  
  dataseries_router.post('/:series/query', cors(corsOptions), express.json(), async (req, res) => {
    const { series } = req.params;
    const { download } = req.query;
    if (!has_prop(seriesMap, series)) {
      res.sendStatus(404);
      return;
    }
    const series_table_name = seriesMap[series].table_name;

    const QUERY = query_to_sql(series_table_name, req.body as Query);

    console.debug("performing query: ", QUERY);

    const { rows } = await d.query(QUERY);

    const filename = series_table_name+'.';
    const id = add_key_to_download_map(series, rows, filename, download);
    
    const constructed_url = req.baseUrl + req.path + `/result?id=${id}`

    res.send(constructed_url);
  });

  return dataseries_router;
}