const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const storageDirectory = path.resolve(
  __dirname,
  '../../',
  process.env.STORAGE_DIR || 'storage',
);
const configuredFileSize = Number.parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
const maxFileSize = Number.isSafeInteger(configuredFileSize) && configuredFileSize > 0
  ? configuredFileSize
  : 10 * 1024 * 1024;

fs.mkdirSync(storageDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDirectory),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
      const isUnexpectedFile = error.code === 'LIMIT_UNEXPECTED_FILE';

      if (isTooLarge || isUnexpectedFile) {
        return res.status(isTooLarge ? 413 : 400).json({
          error: {
            code: isTooLarge ? 'FILE_TOO_LARGE' : 'TOO_MANY_FILES',
            message: isTooLarge
              ? 'O arquivo excede o tamanho máximo permitido.'
              : 'Envie somente um arquivo no campo file.',
          },
        });
      }

      return res.status(400).json({
        error: { code: 'INVALID_UPLOAD', message: 'A requisição de upload é inválida.' },
      });
    }

    return next(error);
  });
}

router.post('/upload', documentsController.validateOwner, handleUpload, documentsController.upload);
router.get('/documents', documentsController.validateOwner, documentsController.list);
router.get('/documents/:id/download', documentsController.validateOwner, documentsController.download);

module.exports = router;