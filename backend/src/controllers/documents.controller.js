const documentsService = require('../services/documents.service');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOwner(req, res) {
  const owner = req.get('X-User-Id');

  if (!owner || !owner.trim() || owner.length > 128) {
    res.status(400).json({
      error: { code: 'INVALID_USER_ID', message: 'Informe um identificador de usuário válido.' },
    });
    return null;
  }

  return owner.trim();
}

function respondWithError(res, code, message, status = 500) {
  if (!res.headersSent) {
    res.status(status).json({ error: { code, message } });
  }
}

function validateOwner(req, res, next) {
  const owner = getOwner(req, res);

  if (!owner) {
    return;
  }

  req.owner = owner;
  return next();
}

function upload(req, res) {
  if (!req.file) {
    return respondWithError(res, 'FILE_REQUIRED', 'Envie um arquivo no campo file.', 400);
  }

  Promise.resolve(documentsService.create(req.file, req.owner))
    .then((document) => res.status(201).json(document))
    .catch(() => respondWithError(res, 'UPLOAD_FAILED', 'Não foi possível enviar o documento.'));
}

function list(req, res) {
  try {
    return res.json({ documents: documentsService.listByOwner(req.owner) });
  } catch {
    return respondWithError(res, 'DOCUMENT_LIST_FAILED', 'Não foi possível listar os documentos.');
  }
}

function download(req, res) {
  if (!UUID_PATTERN.test(req.params.id)) {
    return respondWithError(res, 'INVALID_DOCUMENT_ID', 'O identificador do documento é inválido.', 400);
  }

  const document = documentsService.findForDownload(req.params.id, req.owner);

  if (!document) {
    return respondWithError(res, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
  }

  res.type(document.mimeType || 'application/octet-stream');
  return res.download(document.filePath, document.originalName, (error) => {
    if (error && !res.headersSent) {
      const isMissingFile = error.code === 'ENOENT';
      respondWithError(
        res,
        isMissingFile ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_FAILED',
        isMissingFile ? 'Documento não encontrado.' : 'Não foi possível baixar o documento.',
        isMissingFile ? 404 : 500,
      );
    }
  });
}

module.exports = {
  validateOwner,
  upload,
  list,
  download,
};