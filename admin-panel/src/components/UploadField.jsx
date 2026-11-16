import { useState } from "react";
import { uploadApi } from "../api/adminApi";
import styles from "./UploadField.module.css";

// Загружает файл через /api/admin/upload/photo|video и отдаёт наружу
// {fileName, fileUrl}, которые записываются в соответствующие поля формы.
export default function UploadField({ kind, fileUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await (kind === "video" ? uploadApi.video(file) : uploadApi.photo(file));
      onUploaded({ fileName: result.fileName, fileUrl: result.fileUrl });
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.field}>
      {fileUrl ? (
        kind === "video" ? (
          <video src={fileUrl} className={styles.preview} controls />
        ) : (
          <img src={fileUrl} className={styles.preview} alt="" />
        )
      ) : (
        <div className={styles.placeholder}>нет файла</div>
      )}
      <input
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        onChange={handleChange}
        disabled={uploading}
      />
      {uploading && <span className={styles.status}>Загрузка...</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
