import Router from 'express-promise-router';
import generator from 'json-2-csv';
import express, { RequestHandler } from 'express';

import { Maybe, findMaybe, isNothing } from '../lib/Maybe';

import { AppOptions, AppDependencies } from '../models/ApplicationData';
import { make_response, Response_Category } from '../api';
import { has_prop } from '../utils';
import { QueryParser } from '../db/Query.parser';
import { Group } from '../models/Group.model';
import { Series } from '../models/Series.model';
import { Column_Label_Values, LabelList } from '../models/ColumnValues.enum';
import { isLeft } from '../lib/Either';
import { SqlQueryTransformer } from '../db/Query.to.Sql';
import { ColumnNameMap } from '../models/ColumnNameMap.model';
import { UnsafeQuery } from '../models/unsafe/Unsafe.model';

function find_object_in_label_list(labelType: Column_Label_Values, 
                                   list: LabelList, alias: string): 
                                   Maybe<ColumnNameMap> {
  return findMaybe(list[labelType], o => o.alias === alias);
}

export function GroupsRouter(dependencies: AppDependencies,
                             options: AppOptions): RequestHandler {
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
    return `${group.name}_${series.name}`;
  }

  function generate_id(): number {
    return Math.floor(Math.random() * 10000000);
  }

  function add_key_to_download_map(group: Group, 
                                   series: Series, 
                                   data: object, 
                                   filename: string, 
                                   download: boolean): number {
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

  function find_group(name: string): Maybe<Group> {
    return findMaybe(config.groups, (g: Group) => g.name == name);
  }

  function find_series_in_group(group: Group, name: string): Maybe<Series> {
    return findMaybe(group.dataseries, (s: Series) => s.name == name);
  }

  groups_router.get('/values', cors_with_options, (req, res) => {
    res.json(make_response(Response_Category.Groups,
                           options.config.groups.map(g => g.name)));
  });

  groups_router.param('group', (req, res, next, value) => {
    const found_group = find_group(value);
    if (isNothing(found_group)) {
      res.sendStatus(404);
      return;
    } else {
      req.group = found_group.value;
      next();
    }
  });

  groups_router.param('series', (req, res, next, value) => {
    const found_series = find_series_in_group(req.group, value);
    if (isNothing(found_series)) {
      res.sendStatus(404);
      return;
    } else {
      req.series = found_series.value;
      next();
    }
  });

  groups_router.param('key', (req, res, next, value) => {
    const found_key = find_object_in_label_list(Column_Label_Values.key, 
                                                config.labels, 
                                                value);
    if (isNothing(found_key)) {
      res.sendStatus(404);
      return;
    } else {
      req.key = found_key.value;
      next();
    }
  });

  groups_router.param('cokey', (req, res, next, value) => {
    const found_cokey = find_object_in_label_list(Column_Label_Values.cokey, 
                                                  config.labels, 
                                                  value);
    if (isNothing(found_cokey)) {
      res.sendStatus(404);
      return;
    } else {
      req.cokey = found_cokey.value;
      next();
    }
  });

  groups_router.get('/:group', 
                    cors_with_options, 
                    (req, res) => {
    res.json({
      name: req.group.name,
      series: req.group.dataseries.map(s => s.name)
    });
  });

  groups_router.get('/:group/keys/:key/values', 
                    cors_with_options, 
                    (req, res) => {
    const values = req.group.domain_keys[req.key.alias];
    if (values === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json(make_response(Response_Category.Values, values));
  });

  groups_router.get('/:group/cokeys/:cokey/values', 
                    cors_with_options, 
                    (req, res) => {
    const cokeys = req.group.codomain_keys[req.cokey.alias];
    if (cokeys === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json(make_response(Response_Category.Cokeys, cokeys));
  });

  groups_router.get('/:group/dataseries/values', 
                    cors_with_options, 
                    (req, res) => {
    res.json(make_response(Response_Category.Dataseries, 
                           req.group.dataseries.map(s => s.name)));
  });

  groups_router.get('/:group/dataseries/:series', 
                    cors_with_options, 
                    async (req, res) => {
    const { download } = req.query;
    
    // Series is injected by the param method above
    const series_table_name = req.series.table_name;

    const { rows } = await database.query(`SELECT * FROM ${series_table_name}`);

    res.format({
      'text/csv': async () => {
        const csv = await generator.json2csvAsync(rows);
        if (download) {
          const filename = series_table_name + '.csv';
          res.setHeader('Content-Disposition', 
                        `attachment; filename="${filename}"`);
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          const filename = series_table_name + '.json';
          res.setHeader('Content-Disposition',
                        `attachment; filename="${filename}"`);
        }
        res.json(rows);
      }
    });
  });

  groups_router.get('/:group/dataseries/:series/info', 
                    cors_with_options, 
                    (req, res) => {
    res.json({
      name: req.series.name,
      category: req.series.category,
      group: req.series.group,
      type: req.series.type,
      metadata: req.series.metadata
    });
  });

  groups_router.get('/:group/dataseries/:series/query/result', 
                    cors_with_options, 
                    (req, res) => {
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
          res.setHeader('Content-Disposition',
                        `attachment; filename="${filename}.csv"`);
        }
        res.send(csv);
      },

      'default': () => {
        if (download) {
          res.setHeader('Content-Disposition', 
                        `attachment; filename="${filename}.json"`);
        }
        res.json(data);
      }
    });

    delete download_key_map[download_key][id];
  });

  groups_router.options('/:group/dataseries/:series/query', cors_with_options);

  groups_router.post('/:group/dataseries/:series/query', 
                     cors_with_options, 
                     express.json(), 
                     async (req, res) => {
    const { download } = req.query;
    const series_table_name = req.series.table_name;

    const parsed_query = QueryParser(req.body as UnsafeQuery, 
                                     options.config.shared_column_names, 
                                     req.group.combined_key_values, 
                                     req.series.type);
    if (isLeft(parsed_query)) {
      res.status(400).send(parsed_query.value.message);
      return;
    }

    const QUERY = SqlQueryTransformer(parsed_query.value, series_table_name);
    
    console.debug('performing query: ', QUERY);

    const { rows } = await database.query(QUERY);
    const filename = series_table_name;
    const id = add_key_to_download_map(req.group, 
                                       req.series, 
                                       rows, 
                                       filename, 
                                       download);

    const constructed_url = req.baseUrl + req.path + `/result?id=${id}`;

    res.send(constructed_url);
  });

  return groups_router;
}