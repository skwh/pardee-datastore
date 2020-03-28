export class SettingsError extends Error {
  constructor(msg: string) {
    super("DataSeries settings error: " + msg);
  }

  static MISSING_DATA_SECTION_ERROR = "Missing section 'dataseries' or 'template', one or the other is required.";
  static MALFORMED_TEMPLATE_ERROR = "Template section is missing required fields."
  static MISSING_TEMPLATE_ERROR(field: string): string {
    return `Template section is missing required field ${field}`;
  }
}
