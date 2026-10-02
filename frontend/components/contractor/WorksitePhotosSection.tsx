'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getWorksitePhotos,
  uploadWorksitePhotos,
  deleteWorksitePhoto,
  type WorksitePhotoItem,
} from '@/lib/api/worksitePhotos';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconUpload,
  IconEye,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconFolder,
} from '@/components/ui/Icons';
import './WorksitePhotosSection.css';

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function WorksitePhotosSection() {
  const [photos, setPhotos] = useState<WorksitePhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Staged files for batch upload
  const [stagedFiles, setStagedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [previewPhoto, setPreviewPhoto] = useState<WorksitePhotoItem | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<WorksitePhotoItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    try {
      const res = await getWorksitePhotos();
      setPhotos(res.data || []);
    } catch (err) {
      console.error('Failed to load worksite photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Cleanup object URLs for staged files to prevent memory leaks
  useEffect(() => {
    return () => {
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [stagedFiles]);

  const remainingSlots = Math.max(0, MAX_PHOTOS - photos.length);
  const isLimitReached = photos.length >= MAX_PHOTOS;

  const validateFiles = (incomingFiles: File[]): { valid: File[]; error?: string } => {
    if (incomingFiles.length === 0) return { valid: [] };

    // Check remaining quota
    const totalRemaining = remainingSlots - stagedFiles.length;
    if (totalRemaining <= 0) {
      return {
        valid: [],
        error: `Maximum limit of ${MAX_PHOTOS} photos reached. You cannot add more photos.`,
      };
    }

    if (incomingFiles.length > totalRemaining) {
      return {
        valid: [],
        error: `You can only add ${totalRemaining} more photo(s). You selected ${incomingFiles.length}. Please select up to ${totalRemaining} photo(s).`,
      };
    }

    const validFiles: File[] = [];

    for (const file of incomingFiles) {
      // Validate file extension and MIME type
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type) || isValidExt;

      if (!isValidMime) {
        return {
          valid: [],
          error: `"${file.name}" has an unsupported format. Only JPG, JPEG, PNG, and WebP are allowed.`,
        };
      }

      // Validate 10 MB per file limit
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: [],
          error: `"${file.name}" exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        };
      }

      if (file.size === 0) {
        return {
          valid: [],
          error: `"${file.name}" is empty.`,
        };
      }

      validFiles.push(file);
    }

    return { valid: validFiles };
  };

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList) return;
    setErrorMsg('');
    setSuccessMsg('');

    const filesArray = Array.from(filesList);
    const { valid, error } = validateFiles(filesArray);

    if (error) {
      setErrorMsg(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newStaged = valid.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveStaged = (index: number) => {
    setStagedFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadStaged = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      stagedFiles.forEach(({ file }) => {
        formData.append('photos', file);
      });

      const res = await uploadWorksitePhotos(formData);
      const uploadedCount = res.data?.length || stagedFiles.length;

      setSuccessMsg(
        `Successfully uploaded ${uploadedCount} worksite photo${uploadedCount > 1 ? 's' : ''}!`
      );
      // Clean up staged
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setStagedFiles([]);

      // Reload photos list
      await fetchPhotos();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload photos.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeletePhoto) return;
    const photoId = confirmDeletePhoto.id;
    setDeletingId(photoId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await deleteWorksitePhoto(photoId);
      setSuccessMsg('Worksite photo deleted successfully.');
      setConfirmDeletePhoto(null);
      await fetchPhotos();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete photo.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="worksite-photos-container">
      <div className="worksite-photos-card">
        {/* Header */}
        <div className="worksite-photos-header">
          <div className="worksite-photos-header-left">
            <div className="worksite-header-icon-box">
              <IconFolder size={20} />
            </div>
            <div>
              <h3 className="worksite-photos-title">Worksite Photos</h3>
              <p className="worksite-photos-subtitle">
                Showcase active and completed industrial project worksites to build manufacturer trust
              </p>
            </div>
          </div>

          <div
            className={`worksite-counter-pill ${
              isLimitReached ? 'limit-reached' : 'has-capacity'
            }`}
          >
            <span className="worksite-counter-dot" />
            <span>
              {photos.length} / {MAX_PHOTOS} photos
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="worksite-capacity-bar-wrap">
          <div className="worksite-capacity-track">
            <div
              className={`worksite-capacity-fill ${isLimitReached ? 'full' : ''}`}
              style={{ width: `${(photos.length / MAX_PHOTOS) * 100}%` }}
            />
          </div>
          <span className="worksite-capacity-text">
            {isLimitReached
              ? 'Maximum 10 / 10 limit reached'
              : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} available`}
          </span>
        </div>

        <div className="worksite-photos-body">
          {/* Alerts */}
          {errorMsg && (
            <div className="worksite-alert worksite-alert--error">
              <IconAlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="worksite-alert worksite-alert--success">
              <IconCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Section: disabled or hidden if 10/10 reached */}
          {isLimitReached ? (
            <div className="worksite-alert worksite-alert--warning" style={{ margin: 0 }}>
              <IconAlertTriangle size={18} />
              <div>
                <strong>Maximum upload limit reached (10 / 10 photos).</strong>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px' }}>
                  To upload new worksite photos, please delete one or more existing photos below.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Drag & Drop Upload Zone */}
              <div
                className={`worksite-upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  className="worksite-upload-input"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <div className="worksite-upload-icon-wrap">
                  <IconUpload size={22} />
                </div>
                <p className="worksite-upload-prompt">
                  Click to select or drag and drop worksite photos here
                </p>
                <p className="worksite-upload-sub">
                  Select multiple photos at once (up to {remainingSlots - stagedFiles.length} more)
                </p>
                <div className="worksite-upload-limits">
                  <span>JPG, PNG, WebP</span>
                  <span>•</span>
                  <span>Max 10 MB per photo</span>
                  <span>•</span>
                  <span>Max 10 photos total</span>
                </div>
              </div>

              {/* Staged Files Preview */}
              {stagedFiles.length > 0 && (
                <div className="worksite-staged-area">
                  <div className="worksite-staged-header">
                    <span>Ready to Upload ({stagedFiles.length} selected)</span>
                    <button
                      type="button"
                      className="worksite-btn-sec"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        stagedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
                        setStagedFiles([]);
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="worksite-staged-list">
                    {stagedFiles.map((staged, idx) => (
                      <div key={idx} className="worksite-staged-card">
                        <img
                          src={staged.preview}
                          alt={staged.file.name}
                          className="worksite-staged-thumb"
                        />
                        <button
                          type="button"
                          className="worksite-staged-remove-btn"
                          title="Remove photo"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStaged(idx);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="worksite-staged-actions">
                    <button
                      type="button"
                      className="worksite-btn-prim"
                      disabled={uploading}
                      onClick={handleUploadStaged}
                    >
                      {uploading ? (
                        <>Uploading Photos…</>
                      ) : (
                        <>
                          <IconUpload size={14} /> Upload {stagedFiles.length} Photo
                          {stagedFiles.length > 1 ? 's' : ''} to Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Existing Photos Gallery Grid */}
          {loading ? (
            <LoadingState label="Loading worksite photos…" />
          ) : photos.length === 0 ? (
            <EmptyState
              icon={<IconFolder size={32} />}
              title="No Worksite Photos Uploaded"
              subtitle="Upload up to 10 photos of your active fabrication shops, plant installations, or project work to demonstrate operational scale."
            />
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Gallery ({photos.length} {photos.length === 1 ? 'Photo' : 'Photos'})
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Click any photo to preview full size
                </span>
              </div>

              <div className="worksite-gallery-grid">
                {photos.map((photo) => (
                  <div key={photo.id} className="worksite-photo-card">
                    <div
                      className="worksite-photo-thumb-wrap"
                      onClick={() => setPreviewPhoto(photo)}
                      title="Click to preview full size"
                    >
                      <img
                        src={photo.url}
                        alt={photo.fileName}
                        className="worksite-photo-thumb"
                        loading="lazy"
                      />
                      <div className="worksite-photo-overlay">
                        <IconEye size={16} />
                        <span>Preview</span>
                      </div>
                    </div>

                    <div className="worksite-photo-info">
                      <p className="worksite-photo-filename" title={photo.fileName}>
                        {photo.fileName}
                      </p>
                      <div className="worksite-photo-meta-row">
                        <span>{formatSize(photo.sizeBytes)}</span>
                        <span>
                          {new Date(photo.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="worksite-photo-delete-btn"
                        disabled={deletingId === photo.id}
                        onClick={() => setConfirmDeletePhoto(photo)}
                      >
                        <IconTrash size={12} />
                        <span>{deletingId === photo.id ? 'Deleting…' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Preview Modal */}
      {previewPhoto && (
        <div className="worksite-modal-backdrop" onClick={() => setPreviewPhoto(null)}>
          <div className="worksite-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="worksite-modal-header">
              <h4 className="worksite-modal-title">{previewPhoto.fileName}</h4>
              <button
                type="button"
                className="worksite-modal-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="worksite-modal-image-wrap">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.fileName}
                className="worksite-modal-image"
              />
            </div>
            <div className="worksite-modal-footer">
              <span>
                Size: {formatSize(previewPhoto.sizeBytes)} • Uploaded:{' '}
                {new Date(previewPhoto.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                className="worksite-photo-delete-btn"
                onClick={() => {
                  setConfirmDeletePhoto(previewPhoto);
                  setPreviewPhoto(null);
                }}
              >
                <IconTrash size={13} /> Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeletePhoto && (
        <div className="worksite-modal-backdrop" onClick={() => setConfirmDeletePhoto(null)}>
          <div className="worksite-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="worksite-confirm-icon-box">
              <IconTrash size={24} />
            </div>
            <h4 className="worksite-confirm-title">Delete Worksite Photo?</h4>
            <p className="worksite-confirm-text">
              Are you sure you want to delete <strong>&ldquo;{confirmDeletePhoto.fileName}&rdquo;</strong>?
              This image will be permanently removed from your profile and Cloudflare R2 vault.
              A slot will be freed up for a new upload.
            </p>
            <div className="worksite-confirm-actions">
              <button
                type="button"
                className="worksite-btn-sec"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmDeletePhoto(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="worksite-btn-danger"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteConfirmed}
              >
                {deletingId ? 'Deleting…' : 'Yes, Delete Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
