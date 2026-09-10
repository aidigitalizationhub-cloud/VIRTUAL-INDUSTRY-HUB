import React, { useEffect, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { IpDisclosureService, type IpFileRecord } from '../../services/ipDisclosureService';
import { useToast } from '../../contexts/ToastContext';

export const DisclosureFiles: React.FC<{ disclosureId: string }> = ({ disclosureId }) => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<IpFileRecord[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      setFiles(await IpDisclosureService.files(disclosureId));
    } catch {
      setFiles([]);
    }
  };

  useEffect(() => { load(); }, [disclosureId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const urlOrPath = await StorageService.uploadFile(f, 'projects');
      // StorageService returns a public URL for images or object path; normalise to bucket/path.
      let objectKey = String(urlOrPath);
      const marker = '/object/public/';
      const idx = objectKey.indexOf(marker);
      if (idx >= 0) {
        objectKey = decodeURIComponent(objectKey.slice(idx + marker.length).split('?')[0]);
        if (!objectKey.includes('/')) objectKey = `projects/${objectKey}`;
      } else if (!objectKey.includes('/')) {
        objectKey = `projects/${objectKey}`;
      } else if (!objectKey.startsWith('projects/') && !objectKey.startsWith('avatars/')) {
        objectKey = `projects/${objectKey}`;
      }
      await fetch(`/api/ip/disclosures/${encodeURIComponent(disclosureId)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          objectKey,
          originalName: f.name,
          mimeType: f.type || 'application/octet-stream',
          sizeBytes: f.size,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || 'File registration failed');
      });
      showToast('Confidential file attached.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-ug-navy">Confidential attachments</h4>
        <label className="flex items-center gap-2 text-xs font-bold text-ug-teal cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Upload
          <input type="file" className="hidden" onChange={onPick} disabled={uploading} />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-gray-400">No files yet. Files stay private and need a signed URL to open.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
              <span className="font-semibold text-gray-600 truncate">{f.original_name}</span>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">{f.scan_status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
