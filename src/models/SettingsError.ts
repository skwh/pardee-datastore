export class SettingsError extends Error {
  constructor(msg: string) {
    super(msg);
  }

  static MISSING_DATA_SECTION_ERROR = "Missing section 'dataseries' or 'template', one or the other is required.";
  static MALFORMED_TEMPLATE_ERROR = "Template section is missing required fields."

  static MISSING_FIELD_TEMPLATE_ERROR(field: string): SettingsError {
    return new SettingsError(`Template section is missing required field '${field}'`);
  }

  static FILE_NOT_FOUND_ERROR(filename: string): SettingsError {
    return new SettingsError(`File '${filename}' does not exist!`);
  }
}
