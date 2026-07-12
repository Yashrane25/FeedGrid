import { useState, useRef } from "react";
import "./ImageUpload.css";

const ImageUpload = ({
  onFilesSelected,
  maxFiles = 1,
  accept = "image/*",
  isUploading = false,
  currentImages = [],
  onRemoveExisting,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localPreviews, setLocalPreviews] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    setError(null);
    const fileArray = Array.from(files);

    const totalAfter =
      currentImages.length + localPreviews.length + fileArray.length;

    if (totalAfter > maxFiles) {
      setError(`Maximum ${maxFiles} image${maxFiles > 1 ? "s" : ""} allowed`);
      return;
    }

    const validFiles = [];
    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be under 5MB");
        return;
      }
      validFiles.push(file);
    }

    const previews = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setLocalPreviews((prev) => [...prev, ...previews]);
    onFilesSelected(validFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isUploading) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeLocalPreview = (index) => {
    setLocalPreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].previewUrl);
      return updated;
    });
  };

  const totalImages = currentImages.length + localPreviews.length;
  const canAddMore = totalImages < maxFiles;

  return (
    <div className="image-upload">
      {/* Existing images from Cloudinary */}
      {currentImages.length > 0 && (
        <div className="image-upload__existing">
          <div className="image-upload__grid">
            {currentImages.map((url, index) => (
              <div key={index} className="image-upload__thumb">
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className="image-upload__thumb-img"
                />
                {onRemoveExisting && (
                  <button
                    type="button"
                    className="image-upload__remove-btn"
                    onClick={() => onRemoveExisting(url)}
                    title="Remove image"
                  >
                    ✕
                  </button>
                )}
                {index === 0 && (
                  <span className="image-upload__cover-badge">Cover</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local previews (selected but not yet uploaded) */}
      {localPreviews.length > 0 && (
        <div className="image-upload__previews">
          <div className="image-upload__grid">
            {localPreviews.map((preview, index) => (
              <div
                key={index}
                className="image-upload__thumb image-upload__thumb--pending"
              >
                <img
                  src={preview.previewUrl}
                  alt={preview.name}
                  className="image-upload__thumb-img"
                />
                {!isUploading && (
                  <button
                    type="button"
                    className="image-upload__remove-btn"
                    onClick={() => removeLocalPreview(index)}
                  >
                    ✕
                  </button>
                )}
                <span className="image-upload__pending-badge">
                  {isUploading ? "Uploading..." : "Ready"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropzone only show if more images can be added */}
      {canAddMore && (
        <div
          className={`image-upload__dropzone ${
            isDragging ? "image-upload__dropzone--dragging" : ""
          } ${isUploading ? "image-upload__dropzone--disabled" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleInputChange}
            className="image-upload__input"
            disabled={isUploading}
          />
          <div className="image-upload__dropzone-content">
            {isUploading ? (
              <>
                <div className="image-upload__spinner" />
                <p className="image-upload__dropzone-text">
                  Uploading to Cloudinary...
                </p>
              </>
            ) : (
              <>
                <div className="image-upload__icon">📷</div>
                <p className="image-upload__dropzone-text">
                  Drag and drop images here
                </p>
                <p className="image-upload__dropzone-sub">
                  or{" "}
                  <span className="image-upload__browse-link">
                    browse files
                  </span>
                </p>
                <p className="image-upload__dropzone-hint">
                  JPG, PNG, WebP · Max{" "}
                  {maxFiles > 1 ? `${maxFiles} images` : "1 image"} · 5MB each
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <div className="image-upload__error">{error}</div>}

      {/* Count indicator */}
      {maxFiles > 1 && (
        <div className="image-upload__count">
          {totalImages} / {maxFiles} images
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
