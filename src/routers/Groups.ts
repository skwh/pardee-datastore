import Router from "express-promise-router";

import { Group } from '../models/Series';
import { AppOptions } from "../server";
import { find_object_in_label_list, Column_Label_Values } from "../settings/parse";
import { make_response, Response_Category } from "../api";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function GroupsRouter(options: AppOptions, cors) {
  const { config, corsOptions } = options;

  const groups_router = Router();

  function find_group(name: string): Group {
    return config.groups.find(g => g.name == name);
  }

  groups_router.get('/groups/values', cors(corsOptions), (req, res) => {
    res.json(make_response(Response_Category.Groups, options.config.groups.map(g => g.name)));
  });

  groups_router.get('/groups/:group', cors(corsOptions), (req, res) => {
    const { group } = req.params;
    const found_group = find_group(group);
    if (found_group === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json(found_group);
  });

  groups_router.get('/groups/:group/keys/:key/value', cors(corsOptions), (req, res) => {
    const { group, key } = req.params;
    const found_group = find_group(group);
    const found_column_key = find_object_in_label_list(Column_Label_Values.KEY, config.labels, key);
    if (found_group === undefined || found_column_key === undefined) {
      res.sendStatus(404);
      return;
    }

    res.json(make_response(Response_Category.Values, found_group.domainKeyValues[found_column_key.alias]));
  });

  groups_router.get('/groups/:group/dataseries', cors(corsOptions), (req, res) => {
    const { group } = req.params;
    const found_group = find_group(group);
    if (found_group === undefined) {
      res.sendStatus(404);
      return;
    }

    res.json(make_response(Response_Category.Dataseries, found_group.series.map(s => s.name)));
  });

  return groups_router;

}