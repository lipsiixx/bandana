// Приём файлов напрямую из браузера (админка), сохранение в uploads/ —
// замена bot/helpers/telegram.js::savePhoto/saveVideoFromUrl, которые скачивали
// файл из Telegram. Формат имени и fileUrl (`/uploads/<fileName>`) сохранены
// такими же, как у бота, чтобы не трогать остальной код/модели.
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function makeUpload({ fieldName, allowedMimes, extension, maxSizeBytes }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}${extension}`),
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => {
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(new Error(`Недопустимый тип файла: ${file.mimetype}`));
      }
      cb(null, true);
    },
  }).single(fieldName);
}

const uploadPhoto = makeUpload({
  fieldName: "photo",
  allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  extension: ".jpg",
  maxSizeBytes: 10 * 1024 * 1024,
});

const uploadVideo = makeUpload({
  fieldName: "video",
  allowedMimes: ["video/mp4", "video/quicktime", "video/webm"],
  extension: ".mp4",
  maxSizeBytes: 200 * 1024 * 1024,
});

module.exports = { uploadPhoto, uploadVideo, UPLOADS_DIR };
