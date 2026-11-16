import { HttpError } from "./http-error.js";

/**
 * Read a required string field, trimmed, and enforce a maximum length.
 * @param {unknown} body
 * @param {string} field
 * @param {number} max
 */
export function requiredText(body, field, max) {
  const raw = /** @type {Record<string, unknown> | undefined} */ (body)?.[field];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new HttpError(400, `'${field}' is required.`);
  if (value.length > max) throw new HttpError(400, `'${field}' must be at most ${max} characters.`);
  return value;
}
