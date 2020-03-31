import Router from "express-promise-router";
import generator from "json-2-csv";
import express from "express";

import { Group, Series } from '../models/Series';
import { AppOptions, AppDependencies } from "../models/ApplicationData";
import { find_object_in_label_list, Column_Label_Values } from "../settings/parse";
import { make_response, Response_Category } from "../api";
import { has_prop } from "../utils";
import { query_to_sql, Query } from "../db/query";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function GroupsRouter(dependencies: AppDependencies, options: AppOptions) {
  const { config, corsOptions, database } = options;
  const { cors } = dependencies;
  const cors_with_options = cors(corsOptions);

  const groups_router = Router();

  const download_key_map: {
    [key: string]: {
      [key: number]: {
        filename: string;
        download: boolean;
        data: unknown;
      };
    };
  } = {};

  function make_download_key(group: Group, series: Series): string {
    return `${group.name}_${series.slug}`;
  }

  function generate_id(): number {
    return Math.floor(Math.random() * 10000000);
  }

  function add_key_to_download_map(group: Group, series: Series, data: object, filename: string, download: boolean): number {
    const download_key = make_download_key(group, series);
    const download_id = generate_id();
    if (download_key_map[download_key] === undefined) {
      download_key_map[download_key] = {};
    }
    download_key_map[download_key][download_id] = {
      filename: filename,
      download: download,
      data: data
    };
    return download_id;
  }

  function find_group(name: string): Group {
    return config.groups.find(g => g.name == name);
  }

  function find_series_in_group(group: Group, name: string): Series {
    return group.series.find(s => s.name == name);
  }

  groups_router.get('/values', cors_with_options, (req, res) => {
    res.json(make_response(Response_Category.Groups, options.config.groups.map(g => g.name)));
  });

  groups_router.param('group', (req, res, next, value) => {
    const found_group = find_group(value);
    if (found_group === undefined) {
      res.sendStatus(404);
      return;
    } else {
      req.group = found_group;
      next();
    }
  });

  groups_router.param('series', (req, res, next, value) => {
    const found_series = find_series_in_group(req.group, value);
    if (found_series === undefined) {
      res.sendStatus(404);
      return;
    } else {
      req.series = found_series;
      next();
    }
  })

  groups_router.get('/:group', cors(corsOptions), (req, res) => {
    res.json({
      name: req.group.name,
      series: req.group.series.map(s => s.name)
    });
  });

  groups_router.get('/:group/keys/:key/values', cors_with_options, (req, res) => {
    const { key } = req.params;
    const found_column_key = find_object_in_label_list(Column_Label_Values.KEY, config.labels, key);
    if (found_column_key === undefined) {
      res.sendStatus(404);
      return;
    }

    res.json(make_response(Response_Category.Values, req.group.domainKeyValues[found_column_key.alias]));
  });

  groups_router.get('/:group/dataseries/values', cors(corsOptions), (req, res) => {
    res.json(make_response(Response_Category.Dataseries, req.group.series.map(s => s.name)));
  });

  groups_router.get('/:group/dataseries/:series', cors_with_options, async (req, res) => {
    const { download } = req.query;
    
    // Series is injected by the param method above
    const series_table_name = req.series.table_name;

    const { rows } = await database.query(`SELECT * FROM ${series_table_name}`);

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

  groups_router.get('/:group/dataseries/:series/info', cors_with_options, (req, res) => {
    res.json({
      name: req.series.name,
      category: req.series.category,
      group: req.series.groupName,
      description: req.series.description,
      unit: req.series.units,
      other: req.series.other
    });
  })

  groups_router.get('/:group/dataseries/:series/query/result', cors_with_options, (req, res) => {
    const { id } = req.query;
    const download_key = make_download_key(req.group, req.series);
    if (!id || !has_prop(download_key_map[download_key], id)) {
      res.sendStatus(404);
      return;
    }
    const { filename, data, download } = download_key_map[download_key][id];

    res.format({
      'text/csv': async () => {
        const csv = await generator.json2csvAsync(data as object[]);
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

    delete download_key_map[download_key][id];
  });

  groups_router.options('/:group/dataseries/:series/query', cors_with_options);

  groups_router.post('/:group/dataseries/:series/query', cors_with_options, express.json(), async (req, res) => {
    const { download } = req.query;
    const series_table_name = req.series.table_name;

    const QUERY = query_to_sql(series_table_name, req.body as Query);

    console.debug("performing query: ", QUERY);

    const { rows } = await database.query(QUERY);

    const filename = series_table_name + '.';
    const id = add_key_to_download_map(req.group, req.series, rows, filename, download);

    const constructed_url = req.baseUrl + req.path + `/result?id=${id}`

    res.send(constructed_url);
  });

  return groups_router;

}