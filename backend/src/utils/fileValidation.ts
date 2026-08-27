/**
 * Validates uploaded contractor documents by sniffing real file content,
 * never trusting the client-supplied mimetype or filename extension —
 * a renamed .exe with a spoofed Content-Type must still fail this check.
 */

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Sniffs the first bytes of a buffer to determine its real file type. */
export function sniffMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 4) return null;

  // %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  // FF D8 FF (JPEG)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // 89 50 4E 47 0D 0A 1A 0A (PNG)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

export interface FileValidationResult {
  ok: boolean;
  mimeType?: AllowedMimeType;
  reason?: string;
}

export function validateDocumentFile(buffer: Buffer): FileValidationResult {
  if (buffer.length === 0) return { ok: false, reason: 'File is empty' };
  if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return { ok: false, reason: `File exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit` };
  }
  const mimeType = sniffMimeType(buffer);
  if (!mimeType) {
    return { ok: false, reason: 'Unsupported file type — only PDF, JPG, and PNG are accepted' };
  }
  return { ok: true, mimeType };
}

const CONTROL_CHARS_PATTERN = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']', 'g');

/**
 * A display-only filename — stripped of path separators and control
 * characters. Never used to build a storage path (see utils/r2.ts, which
 * generates the real key from a UUID), only shown back in the UI.
 */
export function sanitizeDisplayFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'document';
  const cleaned = base.replace(CONTROL_CHARS_PATTERN, '').trim();
  return cleaned.slice(0, 200) || 'document';
}
