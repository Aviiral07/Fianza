import React, { useEffect, useState } from "react";

interface PhotoUploadProps {
  title: string;
  onImageSelect?: (file: File | null, imageUrl?: string) => void;
}

interface ImageUploadResponse {
  secure_url?: string;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  title,
  onImageSelect,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`${API_BASE_URL}/uploads/images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = (await response.json()) as ImageUploadResponse;

      if (!response.ok || !data.secure_url) {
        throw new Error(data.message || "Image upload failed.");
      }

      setPreview(data.secure_url);
      onImageSelect?.(file, data.secure_url);
    } catch (uploadError) {
      setPreview(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload">
      <h3>{title}</h3>

      <label className="upload-box">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={uploading}
          hidden
        />

        <span>{uploading ? "Uploading to Cloudinary..." : "📷 Click to Upload Photo"}</span>
        <p>Image files supported</p>
      </label>

      {error && <p className="photo-upload-error" role="alert">{error}</p>}

      {preview && (
        <div>
          <img
            src={preview}
            alt="Uploaded property"
            style={{
              width: "220px",
              marginTop: "15px",
              borderRadius: "10px",
            }}
          />

          <p>{uploading ? "Uploading image..." : "Photo uploaded successfully!"}</p>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;