import { Either, Left, Right } from '../lib/Either'
import { ParseError } from '../models/error/Parse.error'
import { sanitize_name } from '../utils'
import { SETTINGS_RESERVED_KEYWORDS } from '../models/Reserved.keywords'

export function restrict_santize_name(name: string, 
                                      object_type: 'Dataseries' | 'Group'): 
                                      Either<ParseError, string> {
  const new_name = sanitize_name(name)
  if (new_name in SETTINGS_RESERVED_KEYWORDS) {
    return Left(
      new ParseError(
        `${object_type} may not be named ${new_name} (reserved keyword).`))
  }
  return Right(new_name)
}