export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class FileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileParseError";
  }
}
