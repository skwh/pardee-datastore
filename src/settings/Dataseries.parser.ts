import path from 'path';

import { Either, Left, Right } from '../lib/Either';

import { UnsafeSeries } from '../models/unsafe/Unsafe.model';
import { ParseError } from '../models/error/Parse.error';
import { Series } from '../models/Series.model';
import { sanitize_name, location_exists } from '../utils';

interface SafeSeries {
  name: string;
  location: string;
  type: string;
  group: string;

  metadata?: Record<string, string>;
}

function make_table_name(series: SafeSeries): string {
  const groupName = sanitize_name(series.group);
  const seriesName = sanitize_name(series.name);
  return `Series_${groupName}_${seriesName}`;
}

function unsafeIsSafe(series: UnsafeSeries): series is SafeSeries {
  return series.name     !== undefined 
      && series.location !== undefined 
      && series.type     !== undefined 
      && series.group    !== undefined;
}

function parse_series_type(type: string): type is 'monadic' | 'dyadic'  {
  return type === 'monadic' 
      || type === 'dyadic';
}

export function DataseriesParser(unsafe_series: UnsafeSeries[], 
                                 absolute_application_path: string, 
                                 group_name?: string): 
                                 Either<ParseError, Series[]> {
  const series_list: Series[] = [];

  for (const series of unsafe_series) {
    if (group_name) {
      series.group = group_name;
    }
    if (!unsafeIsSafe(series)) {
      return Left(ParseError.MissingParamsError(series, 'dataseries', ['name', 'location', 'type', 'group']));
    }

    const absolute_series_location = path.join(absolute_application_path, series.location);
    series.location = absolute_series_location;

    if (!location_exists(series.location)) {
      return Left(new ParseError(`Dataseries ${series.name} location ${series.location} does not exist.`));
    }

    if (!parse_series_type(series.type)) {
      return Left(new ParseError(`Dataseries ${series.name} type ${series.type} is not valid. Valid values are 'monadic' and 'dyadic'.`));
    }

    const table_name = make_table_name(series);

    const parsed_series: Series = {
      name: sanitize_name(series.name),
      group: series.group,
      location: series.location,
      type: series.type,
      table_name: table_name,

      metadata: series.metadata
    };

    series_list.push(parsed_series);
  }

  return Right(series_list);
}