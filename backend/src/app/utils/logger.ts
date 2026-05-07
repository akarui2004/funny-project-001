class Logger {
  static #instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.#instance) {
      Logger.#instance = new Logger();
    }
    return Logger.#instance;
  }
}