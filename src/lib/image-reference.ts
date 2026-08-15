export const IMAGE_REFERENCE_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxUrlChars: 2048,
} as const;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type SupportedImageMimeType = typeof SUPPORTED_IMAGE_MIME_TYPES[number];
export type ImageReferenceError =
  | "IMAGE_TYPE_UNSUPPORTED"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_DATA_INVALID"
  | "IMAGE_URL_INVALID"
  | "IMAGE_URL_TOO_LONG";

export type ImageReferenceResult =
  | { ok: true; value: string; kind: "empty" | "data" | "url" }
  | { ok: false; code: ImageReferenceError; message: string };

export type ImageFileMetadata = { type: string; size: number };

export function imageUploadHelpText(): string {
  return `PNG, JPG ou WEBP até ${IMAGE_REFERENCE_LIMITS.maxBytes / (1024 * 1024)} MB`;
}

export function validateImageFileMetadata(file: ImageFileMetadata): ImageReferenceResult {
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type as SupportedImageMimeType)) {
    return {
      ok: false,
      code: "IMAGE_TYPE_UNSUPPORTED",
      message: "Use uma imagem PNG, JPG ou WEBP.",
    };
  }
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > IMAGE_REFERENCE_LIMITS.maxBytes) {
    return {
      ok: false,
      code: "IMAGE_TOO_LARGE",
      message: `A imagem deve ter no máximo ${IMAGE_REFERENCE_LIMITS.maxBytes / (1024 * 1024)} MB.`,
    };
  }
  return { ok: true, value: "", kind: "empty" };
}

function decodedBase64Bytes(base64: string): number | null {
  if (base64.length === 0 || base64.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null;
  const firstPadding = base64.indexOf("=");
  if (firstPadding !== -1 && firstPadding < base64.length - 2) return null;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

export function validateImageReference(value: unknown): ImageReferenceResult {
  if (typeof value !== "string") {
    return { ok: false, code: "IMAGE_DATA_INVALID", message: "A referência da imagem deve ser texto." };
  }

  const normalized = value.trim();
  if (normalized === "") return { ok: true, value: "", kind: "empty" };

  if (normalized.startsWith("data:")) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(normalized);
    if (!match) {
      return { ok: false, code: "IMAGE_DATA_INVALID", message: "A imagem incorporada é inválida ou usa um formato não suportado." };
    }

    const mime = match[1].toLowerCase();
    if (!SUPPORTED_IMAGE_MIME_TYPES.includes(mime as SupportedImageMimeType)) {
      return { ok: false, code: "IMAGE_TYPE_UNSUPPORTED", message: "Use uma imagem PNG, JPG ou WEBP." };
    }

    const bytes = decodedBase64Bytes(match[2]);
    if (bytes === null) {
      return { ok: false, code: "IMAGE_DATA_INVALID", message: "A imagem incorporada contém dados base64 inválidos." };
    }
    if (bytes > IMAGE_REFERENCE_LIMITS.maxBytes) {
      return {
        ok: false,
        code: "IMAGE_TOO_LARGE",
        message: `A imagem deve ter no máximo ${IMAGE_REFERENCE_LIMITS.maxBytes / (1024 * 1024)} MB.`,
      };
    }
    return { ok: true, value: normalized, kind: "data" };
  }

  if (normalized.length > IMAGE_REFERENCE_LIMITS.maxUrlChars) {
    return {
      ok: false,
      code: "IMAGE_URL_TOO_LONG",
      message: `A URL da imagem deve ter no máximo ${IMAGE_REFERENCE_LIMITS.maxUrlChars} caracteres.`,
    };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return { ok: false, code: "IMAGE_URL_INVALID", message: "Use uma URL HTTPS sem credenciais incorporadas." };
    }
    return { ok: true, value: parsed.toString(), kind: "url" };
  } catch {
    return { ok: false, code: "IMAGE_URL_INVALID", message: "Use uma URL HTTPS válida ou envie uma imagem suportada." };
  }
}
