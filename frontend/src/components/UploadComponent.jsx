import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documents';

export default function UploadComponent({ owner, onUploaded }) {
  const formRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError('');
    setMessage('');
    try {
      await uploadDocument(owner, file);
      formRef.current?.reset();
      setFile(null);
      setMessage('Documento enviado com sucesso.');
      onUploaded();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div>
        <p className="eyebrow">ADICIONAR ARQUIVO</p>
        <h2 id="upload-title">Enviar documento</h2>
        <p>Selecione um arquivo para adicionar à sua lista.</p>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="upload-form">
        <label className="file-label" htmlFor="document-file">Arquivo</label>
        <div className="upload-controls">
          <input id="document-file" type="file" required disabled={uploading} onChange={(event) => { setFile(event.target.files[0] || null); setMessage(''); setError(''); }} />
          <button type="submit" className="button button-primary" disabled={!file || uploading}>{uploading ? 'Enviando...' : 'Enviar documento'}</button>
        </div>
        <div aria-live="polite" className="form-feedback">
          {error && <span className="error-text">{error}</span>}
          {message && <span className="success-text">{message}</span>}
        </div>
      </form>
    </section>
  );
}