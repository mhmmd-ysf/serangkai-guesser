'use strict';

/**
 * Base class for expected, user-facing failures. Subclasses carry a stable
 * `code` so callers can handle them programmatically (for example, map them to
 * HTTP status codes) without parsing message text. An optional `hint` carries
 * extra guidance shown to the user below the main message.
 */
class AppError extends Error {
  constructor(message, code, hint) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (hint) {
      this.hint = hint;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

/** A generated data artifact is missing or unreadable. */
class DataMissingError extends AppError {
  constructor(message, hint) {
    super(message, 'DATA_MISSING', hint);
  }
}

/** Required configuration (for example an environment variable) is absent. */
class ConfigError extends AppError {
  constructor(message, hint) {
    super(message, 'CONFIG_ERROR', hint);
  }
}

/** The requested dictionary source does not exist. */
class UnknownSourceError extends AppError {
  constructor(message, hint) {
    super(message, 'UNKNOWN_SOURCE', hint);
  }
}

/** The dictionary source returned an unexpected payload. */
class SourceResponseError extends AppError {
  constructor(message) {
    super(message, 'SOURCE_RESPONSE');
  }
}

module.exports = {
  AppError,
  DataMissingError,
  ConfigError,
  UnknownSourceError,
  SourceResponseError,
};
