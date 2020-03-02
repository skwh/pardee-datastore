export class SettingsError extends Error {
  constructor(msg: string) {
    super("DataSeries settings error: " + msg);
  }
}
