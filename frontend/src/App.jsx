import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { INVALID_OWNER_MESSAGE, isValidOwner, listDocuments } from './services/documents';
import './App.css';

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [userError, setUserError] = useState('');
  const [owner, setOwner] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!owner) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(owner, controller.signal)
      .then(setDocuments)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [owner, revision]);

  function selectOwner(event) {
    event.preventDefault();
    const nextOwner = userInput.trim();
    if (!isValidOwner(nextOwner)) {
      setUserError(INVALID_OWNER_MESSAGE);
      return;
    }
    setUserError('');
    if (nextOwner !== owner) {
      setDocuments([]);
      setOwner(nextOwner);
    } else {
      setRevision((value) => value + 1);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">D</span><span>Documentos</span></div>
        <span className="topbar-label">GESTÃO DE ARQUIVOS</span>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ÁREA DE TRABALHO</p>
            <h1>Meus documentos</h1>
            <p className="subtitle">Seus arquivos em um só lugar.</p>
          </div>
          {owner && <div className="user-badge"><span className="status-dot" />{owner}</div>}
        </div>

        <section className="identity-section" aria-labelledby="identity-title">
          <div>
            <h2 id="identity-title">Identificação</h2>
            <p>Documentos vinculados ao usuário informado.</p>
          </div>
          <form className="identity-form" onSubmit={selectOwner}>
            <label htmlFor="owner">Identificador do usuário</label>
            <div className="identity-controls">
              <input id="owner" value={userInput} onChange={(event) => { setUserInput(event.target.value); setUserError(''); }} maxLength={128} required placeholder="Seu identificador" aria-invalid={Boolean(userError)} aria-describedby={userError ? 'owner-error' : undefined} />
              <button type="submit" className="button button-secondary">Acessar</button>
            </div>
            {userError && <p id="owner-error" className="error-text form-feedback" role="alert">{userError}</p>}
          </form>
        </section>

        {owner ? (
          <>
            <UploadComponent key={owner} owner={owner} onUploaded={() => setRevision((value) => value + 1)} />
            <DocumentList documents={documents} owner={owner} loading={loading} error={error} onRetry={() => setRevision((value) => value + 1)} />
          </>
        ) : (
          <div className="empty-workspace">Informe seu identificador para acessar seus documentos.</div>
        )}
      </main>
    </div>
  );
}
