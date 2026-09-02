export interface UploadFileInfo {
  name: string;
  mimeType?: string;
  sizeBytes: number;
}

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_EXTENSIONS = new Set(['txt', 'doc', 'docx']);

const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

const STORAGE_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const STORAGE_ALLOWED_EXTENSIONS = new Set([
  'txt', 'doc', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'
]);
const STORAGE_ALLOWED_MIME_PREFIXES = ['image/'];
const STORAGE_ALLOWED_MIME_TYPES = new Set([...ALLOWED_MIME_TYPES, 'application/pdf']);

/**
 * Server-side upload validation (size + extension + MIME whitelist).
 * Rejects executables, scripts and archive patterns by virtue of the whitelist.
 */
export const validateUpload = ({ name, mimeType, sizeBytes }: UploadFileInfo): UploadValidationResult => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'File name is required.' };
  }
  if (!sizeBytes || sizeBytes <= 0) {
    return { ok: false, error: 'File is empty.' };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB limit.` };
  }

  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `Unsupported file type: .${ext}. Please upload a .txt, .doc, or .docx file.` };
  }

  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: `Unsupported MIME type: ${mimeType}.` };
  }

  return { ok: true };
};

export const validateStorageUpload = ({ name, mimeType, sizeBytes }: UploadFileInfo): UploadValidationResult => {
  if (!name || !name.trim()) return { ok: false, error: 'File name is required.' };
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return { ok: false, error: 'File is empty.' };
  if (sizeBytes > STORAGE_MAX_UPLOAD_BYTES) return { ok: false, error: 'File exceeds the 15MB upload limit.' };

  const extension = (name.split('.').pop() || '').toLowerCase();
  if (!STORAGE_ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, error: `Unsupported file type: .${extension}.` };
  }

  if (mimeType && !STORAGE_ALLOWED_MIME_TYPES.has(mimeType) && !STORAGE_ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
    return { ok: false, error: `Unsupported MIME type: ${mimeType}.` };
  }

  return { ok: true };
};
