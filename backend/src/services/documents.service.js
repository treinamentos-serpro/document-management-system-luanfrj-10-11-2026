const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');

function create(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    filePath: file.path,
    mimeType: file.mimetype,
  };

  try {
    return documentsRepository.create(document);
  } catch (error) {
    return documentsRepository.removeFile(file.path).then(() => {
      throw error;
    });
  }
}

function listByOwner(owner) {
  return documentsRepository.listByOwner(owner);
}

function findForDownload(id, owner) {
  return documentsRepository.findByIdAndOwner(id, owner);
}

module.exports = {
  create,
  listByOwner,
  findForDownload,
};