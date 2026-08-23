export class FootballProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FootballProviderError";
  }
}
