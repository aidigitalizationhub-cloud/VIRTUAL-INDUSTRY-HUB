import { describe, it, expect } from 'vitest';
import { validateUpload } from './uploadGuard';

describe('validateUpload', () => {
  it('accepts a valid .docx with a matching MIME type', () => {
    const res = validateUpload({
      name: 'abstract.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 1024,
    });
    expect(res.ok).toBe(true);
  });

  it('accepts a valid .txt with an absent MIME type', () => {
    const res = validateUpload({ name: 'notes.txt', sizeBytes: 10 });
    expect(res.ok).toBe(true);
  });

  it('rejects a missing or blank name', () => {
    expect(validateUpload({ name: '   ', sizeBytes: 10 }).ok).toBe(false);
  });

  it('rejects an empty file', () => {
    expect(validateUpload({ name: 'a.txt', sizeBytes: 0 }).ok).toBe(false);
  });

  it('rejects files over the 15MB limit', () => {
    const res = validateUpload({ name: 'big.txt', sizeBytes: 16 * 1024 * 1024 });
    expect(res.ok).toBe(false);
  });

  it('rejects executables, scripts and archives by extension', () => {
    expect(validateUpload({ name: 'evil.exe', sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ name: 'shell.sh', sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ name: 'payload.zip', sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ name: '.htaccess', sizeBytes: 10 }).ok).toBe(false);
  });

  it('rejects a mismatched MIME type', () => {
    const res = validateUpload({ name: 'a.txt', mimeType: 'application/x-msdownload', sizeBytes: 10 });
    expect(res.ok).toBe(false);
  });
});