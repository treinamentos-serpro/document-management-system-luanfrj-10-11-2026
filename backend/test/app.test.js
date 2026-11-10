const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '64';
const app = require('../src/app');

after(() => fs.rmSync(storageDirectory, { recursive: true, force: true }));

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('preserva nomes UTF-8 no upload, na listagem e no download', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-User-Id': 'teste-utf8' };

  try {
    for (const name of ['arquivo.txt', 'ação.txt', 'relatório-😀.txt']) {
      const form = new FormData();
      form.append('file', new File(['conteúdo'], name, { type: 'text/plain' }));
      const upload = await fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
      assert.strictEqual(upload.status, 201);
      const document = await upload.json();
      assert.strictEqual(document.originalName, name);

      const download = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers });
      assert.strictEqual(download.status, 200);
      assert.strictEqual(await download.text(), 'conteúdo');
      assert.strictEqual(download.headers.get('content-type'), 'application/octet-stream');
      assert.strictEqual(download.headers.get('x-content-type-options'), 'nosniff');
      const disposition = download.headers.get('content-disposition');
      const expectedName = /[^\u0000-\u00ff]/.test(name) ? encodeURIComponent(name) : name;
      assert.ok(disposition.includes(expectedName));
    }

    const list = await fetch(`${baseUrl}/documents`, { headers });
    assert.deepStrictEqual((await list.json()).documents.map((document) => document.originalName), [
      'relatório-😀.txt', 'ação.txt', 'arquivo.txt',
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('rejeita uploads ausentes, multipart inválido e conteúdo fora dos limites', async () => {
  await withServer(async (baseUrl) => {
    const headers = { 'X-User-Id': 'teste-limites' };

    const missingFile = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers, body: new FormData(),
    });
    assert.strictEqual(missingFile.status, 400);
    assert.strictEqual((await missingFile.json()).error.code, 'FILE_REQUIRED');

    const unexpectedField = new FormData();
    unexpectedField.append('metadata', 'valor');
    const fieldResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers, body: unexpectedField,
    });
    assert.strictEqual(fieldResponse.status, 400);

    const multipleFiles = new FormData();
    multipleFiles.append('file', new File(['um'], 'um.txt'));
    multipleFiles.append('file', new File(['dois'], 'dois.txt'));
    const multipleResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers, body: multipleFiles,
    });
    assert.strictEqual(multipleResponse.status, 400);
    assert.strictEqual((await multipleResponse.json()).error.code, 'TOO_MANY_FILES');

    const oversizedFile = new FormData();
    oversizedFile.append('file', new File([new Uint8Array(65)], 'grande.bin'));
    const oversizedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers, body: oversizedFile,
    });
    assert.strictEqual(oversizedResponse.status, 413);
    assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

    const malformedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'multipart/form-data; boundary=broken' },
      body: '--broken\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n\r\nconteudo',
    });
    assert.strictEqual(malformedResponse.status, 400);
    assert.strictEqual((await malformedResponse.json()).error.code, 'INVALID_MULTIPART');
  });
});

test('isola listagem e download pelo identificador informado', async () => {
  await withServer(async (baseUrl) => {
    const form = new FormData();
    form.append('file', new File(['privado'], 'privado.txt'));
    const upload = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'dono-a' },
      body: form,
    });
    const document = await upload.json();

    const list = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'dono-b' } });
    assert.deepStrictEqual((await list.json()).documents, []);

    const download = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { 'X-User-Id': 'dono-b' },
    });
    assert.strictEqual(download.status, 404);
    assert.strictEqual((await download.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });
});

test('cria o diretório de armazenamento com permissões restritas', () => {
  assert.strictEqual(fs.statSync(storageDirectory).mode & 0o777, 0o700);
});
