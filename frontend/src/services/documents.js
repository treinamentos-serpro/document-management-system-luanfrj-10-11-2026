async function request(path, owner, options = {}) {
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