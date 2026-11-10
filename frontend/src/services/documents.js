export const INVALID_OWNER_MESSAGE = 'Use letras sem acentos ou com acentos comuns, números e símbolos simples.';

export function isValidOwner(owner) {
  return owner.length <= 128 && Boolean(owner.trim()) && /^[\x20-\x7e\xa0-\xff]+$/.test(owner);
}

async function request(path, owner, options = {}) {
  if (!isValidOwner(owner)) {
    throw new Error(INVALID_OWNER_MESSAGE);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...options.headers, 'X-User-Id': owner },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments(owner, signal) {
  const response = await request('/documents', owner, { signal });
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(owner, file) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', owner, { method: 'POST', body });
  return response.json();
}

export async function downloadDocument(owner, id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, owner);
  return response.blob();
}