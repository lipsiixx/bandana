// Приём файлов напрямую из браузера (админка), сохранение в uploads/ —
// замена bot/helpers/telegram.js::savePhoto/saveVideoFromUrl, которые скачивали
// файл из Telegram. Формат имени и fileUrl (`/uploads/<fileName>`) сохранены
// такими же, как у бота, чтобы не трогать остальной код/модели.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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

// В отличие от makeUpload (одно фиксированное расширение на вид загрузки —
// годится для фото/видео, которые бот всегда конвертировал в jpg/mp4),
// аудио-исходники бывают mp3/wav/m4a/aac/ogg/flac — расширение сохраняем
// настоящее, но только из allowlist (защита от обхода fileFilter подделкой
// имени файла). Несколько файлов за раз — .array(), не .single().
function makeMultiUpload({ fieldName, allowedMimes, allowedExtensions, maxSizeBytes, maxCount }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = allowedExtensions.includes(ext) ? ext : "";
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
        return cb(new Error(`Недопустимый тип файла: ${file.mimetype}`));
      }
      cb(null, true);
    },
  }).array(fieldName, maxCount);

  // Эндпоинт публичный — ошибку multer (неверный тип/размер) нужно вернуть
  // как понятный 400, а не дать ей дойти до общего 500-хендлера в index.js.
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Ошибка загрузки файла",
        });
      }
      next();
    });
  };
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

const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
const AUDIO_MAX_SIZE_BYTES = 300 * 1024 * 1024;

const uploadOrderSourceFiles = makeMultiUpload({
  fieldName: "files",
  allowedMimes: AUDIO_MIMES,
  allowedExtensions: AUDIO_EXTENSIONS,
  maxSizeBytes: AUDIO_MAX_SIZE_BYTES,
  maxCount: 10,
});

const uploadOrderDeliveredFiles = makeMultiUpload({
  fieldName: "files",
  allowedMimes: AUDIO_MIMES,
  allowedExtensions: AUDIO_EXTENSIONS,
  maxSizeBytes: AUDIO_MAX_SIZE_BYTES,
  maxCount: 10,
});

module.exports = {
  uploadPhoto,
  uploadVideo,
  uploadOrderSourceFiles,
  uploadOrderDeliveredFiles,
  UPLOADS_DIR,
};
