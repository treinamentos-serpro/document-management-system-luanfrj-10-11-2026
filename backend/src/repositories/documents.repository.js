const fs = require('node:fs/promises');

const documents = new Map();

function toPublicDocument(document) {
  const { filePath, mimeType, ...publicDocument } = document;
  return publicDocument;
}

function create(document) {
  documents.set(document.id, document);
  return toPublicDocument(document);
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);

  if (!document || document.owner !== owner) {
    return null;
  }

  return { ...document };
}

function listByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map(toPublicDocument);
}

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  create,
  findByIdAndOwner,
  listByOwner,
  removeFile,
};