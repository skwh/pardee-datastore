import { find_missing_params } from '../../utils'

export class ParseError extends Error {
  constructor(msg: string, ...info: any[]) {
    super(msg + info)
  }

  static MissingParamsError(object: any, name: string, params: string[]): 
                                                                    ParseError {
    const missing_params = find_missing_params(object, params)
    return new ParseError(
                `A ${name} is missing param(s) ${Object.keys(missing_params)}`)
  }
}
