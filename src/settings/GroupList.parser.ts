import { Either, Left, Right, isLeft } from '../lib/Either';

import { UnsafeGroup } from '../models/unsafe/Unsafe.model';
import { ParsedGroup } from '../models/parsed/Parsed.model';
import { ParseError } from '../models/error/Parse.error';
import { DataseriesParser } from './Dataseries.parser';
import { UnsafeSeries } from '../models/unsafe/Unsafe.model';
import { restrict_santize_name } from './Parser.utils';

interface SafeGroup {
  name: string;
  dataseries: Record<string, unknown>[];
}

function unsafeIsSafe(group: UnsafeGroup): group is SafeGroup {
  return group.name !== undefined 
      && group.dataseries !== undefined;
}

export function GroupListParser(unsafe_groups: UnsafeGroup[],
                                absolute_application_path: string): 
                                Either<ParseError, ParsedGroup[]> {
  const groups: ParsedGroup[] = [];

  for (const group of unsafe_groups) {
    if (!unsafeIsSafe(group)) {
      return Left(
        ParseError.MissingParamsError(group, 'group', ['name', 'dataseries']));
    }

    const parsed_series = DataseriesParser(group.dataseries as UnsafeSeries[], 
                                           absolute_application_path,
                                           group.name);
    if (isLeft(parsed_series)) {
      return parsed_series;
    }

    const sanitized_name = restrict_santize_name(group.name);
    if (isLeft(sanitized_name)) {
      return sanitized_name;
    }

    const parsed_group = {
      name: sanitized_name.value,
      dataseries: parsed_series.value
    };

    groups.push(parsed_group);
  }

  return Right(groups);
}