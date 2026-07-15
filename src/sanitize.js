const MAX_MESSAGE_LENGTH = 600;

export function sanitizeText(value, maxLength = MAX_MESSAGE_LENGTH) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value)
    .replace(/\bSCT[A-Za-z0-9._-]+/g, "[serverchan-sendkey]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|access[_-]?token|auth[_-]?token|password)\s*[:=]\s*['"]?[^'"\s]+/gi, "$1=[redacted]")
    .replace(/([?&](?:key|token|secret|sendkey)=)[^&\s]+/gi, "$1[redacted]")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function sanitizeError(error) {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return { message: sanitizeText(error) };
  }

  return {
    message: sanitizeText(error.message || "Unknown error"),
    codexErrorInfo: error.codexErrorInfo ?? null,
    additionalDetails: sanitizeText(error.additionalDetails || ""),
  };
}
