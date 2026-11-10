import DownloadButton from './DownloadButton';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, owner, loading, error, onRetry }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ARQUIVOS</p>
          <h2 id="documents-title">Documentos</h2>
        </div>
        {!loading && !error && <span className="document-count">{documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}</span>}
      </div>
      {loading ? <p className="list-message" role="status">Carregando documentos...</p> : error ? (
        <div className="list-message" role="alert"><span className="error-text">{error}</span> <button type="button" className="text-button" onClick={onRetry}>Tentar novamente</button></div>
      ) : documents.length === 0 ? (
        <p className="list-message">Nenhum documento enviado ainda.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Tamanho</th><th>Enviado em</th><th><span className="visually-hidden">Ações</span></th></tr></thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td><div className="document-name"><span className="file-icon" aria-hidden="true">DOC</span><span>{document.originalName}</span></div></td>
                  <td>{formatSize(document.size)}</td>
                  <td>{dateFormatter.format(new Date(document.uploadedAt))}</td>
                  <td><DownloadButton owner={owner} document={document} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}