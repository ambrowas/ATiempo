const EXTERNAL_PATTERN = /^(https?:|file:|blob:|data:)/i;

const stripPrefix = (value: string) => {
  let output = value.trim();
  output = output.replace(/^app:\/\//i, "");
  output = output.replace(/^file:\/\//i, "file://");
  output = output.replace(/^\.?\/?public\//i, "");
  output = output.replace(/^\.?\/?dist\//i, "");
  output = output.replace(/^\.?\//, "");
  output = output.replace(/^\/+/, "");
  return output;
};

/**
 * Normalizes references to assets that live under /public so they can be loaded
 * correctly when the app runs with a `file://` origin.
 */
export const normalizeAssetPath = (raw?: string | null) => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (EXTERNAL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const stripped = stripPrefix(trimmed);
  if (!stripped) return undefined;
  return `./${stripped}`;
};

export const assetUrl = (raw?: string | null) => {
  const normalized = normalizeAssetPath(raw);
  if (!normalized) return undefined;
  if (EXTERNAL_PATTERN.test(normalized)) {
    return normalized;
  }
  return encodeURI(normalized);
};
