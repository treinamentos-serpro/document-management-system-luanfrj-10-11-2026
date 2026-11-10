# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para que usuários enviem documentos, consultem os documentos associados ao seu identificador e baixem esses arquivos posteriormente.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário informado na requisição.
- Download de um documento pelo identificador, limitado ao usuário informado.
- Persistência dos arquivos no filesystem local da aplicação.
- Armazenamento em memória dos metadados durante a execução do processo.
- Interface React para upload, listagem e download.
- Comunicação frontend-backend pelo prefixo `/api` no ambiente de desenvolvimento, encaminhado pelo proxy do Vite.

### Fora do escopo

- Armazenamento em nuvem ou em provedores externos.
- Banco de dados ou persistência durável dos metadados.
- Autenticação, autorização robusta, cadastro de usuários ou gerenciamento de credenciais.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Upload de múltiplos arquivos em uma única requisição.
- Garantia de acesso aos metadados ou arquivos após reinício do backend.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição multipart/form-data, associado ao identificador de usuário informado na requisição. |
| RF-02 | O sistema deve rejeitar o upload quando o arquivo estiver ausente, houver mais de um arquivo na requisição ou o limite de tamanho for excedido. |
| RF-03 | Após o upload bem-sucedido, o sistema deve gerar um identificador único e retornar os metadados do documento criado. |
| RF-04 | O sistema deve listar somente os documentos associados ao identificador de usuário informado. |
| RF-05 | O sistema deve permitir o download de um documento existente quando ele pertencer ao usuário informado. |
| RF-06 | O sistema deve retornar erro de não encontrado quando o documento não existir ou não estiver associado ao usuário informado. |
| RF-07 | O arquivo baixado deve preservar o nome original na indicação de download, sem usar esse nome como caminho físico no servidor. |
| RF-08 | O frontend deve permitir selecionar e enviar um arquivo, apresentar os documentos do usuário e iniciar o download de um documento listado. |
| RF-09 | O frontend deve apresentar estados de carregamento e mensagens de erro para falhas de upload, listagem ou download. |
| RF-10 | O identificador de usuário usado nas chamadas do frontend deve ser consistente entre upload, listagem e download durante a sessão da interface. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos enviados devem ser gravados localmente em `backend/storage`, usando `multer` com `diskStorage`; não devem ser usados provedores externos. |
| RNF-02 | Os metadados dos documentos devem permanecer em memória nesta fase. Reiniciar o processo remove os metadados, mesmo que os arquivos continuem no disco. |
| RNF-03 | O backend deve ser implementado em Node.js com Express e CommonJS; o frontend deve usar React e Vite com ES modules. |
| RNF-04 | O backend deve respeitar as camadas simples `routes`, `controllers`, `services` e `repositories`, com dependências no sentido routes → controllers → services → repositories. |
| RNF-05 | Rotas devem delegar o tratamento HTTP aos controllers; controllers tratam entrada, validação básica e resposta; services concentram regras de negócio; repositories tratam metadados e acesso aos arquivos. |
| RNF-06 | Configurações como porta, diretório de armazenamento e limite de upload devem ser obtidas por variáveis de ambiente, com valores padrão documentados. |
| RNF-07 | O nome físico do arquivo deve ser gerado pelo servidor. O nome original não deve ser concatenado a caminhos nem permitir traversal de diretório. |
| RNF-08 | Respostas de erro da API devem usar JSON e códigos HTTP apropriados, sem expor caminhos locais, stack traces ou detalhes internos. |
| RNF-09 | O backend deve ter testes automatizados com o runner nativo `node:test`. |
| RNF-10 | A associação de usuário nesta fase é apenas identificadora e não representa autenticação ou controle de acesso seguro. |

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único opaco, gerado pelo servidor. Recomenda-se UUID. |
| `originalName` | string | Sim | Nome original fornecido pelo cliente, usado apenas para exibição e nome de download. |
| `size` | number | Sim | Tamanho do arquivo em bytes, validado a partir do arquivo recebido. |
| `uploadedAt` | string | Sim | Data e hora do upload em UTC, formato ISO 8601. |
| `owner` | string | Sim | Identificador do usuário informado pelo cliente para associar o documento. |

O repositório de arquivos deve manter, além dos metadados públicos, a localização física interna necessária para localizar o arquivo. Essa localização não deve ser devolvida pela API nem derivada diretamente de `originalName` ou de parâmetros recebidos do cliente.

Os metadados são voláteis e mantidos em memória. Não há nesta fase mecanismo de reconstrução do índice a partir dos arquivos locais. Arquivos remanescentes após reinício podem ficar sem referência acessível pela API.

## 6. Contratos de API

Todas as chamadas do frontend usam o prefixo `/api`. No desenvolvimento, o proxy do Vite encaminha essas chamadas ao backend e remove `/api`; portanto, as rotas do Express correspondem aos caminhos sem o prefixo.

### Convenções comuns

- O cabeçalho `X-User-Id` é obrigatório em todas as operações de documentos. Deve conter um identificador não vazio e limitado a 128 caracteres.
- Esse cabeçalho apenas associa operações ao mesmo identificador; como não há autenticação, um cliente pode declarar outro identificador. Não usar essa convenção como proteção de dados em produção.
- Respostas JSON de erro seguem o formato `{ "error": { "code": "CODIGO", "message": "Descrição" } }`.
- Tamanho máximo padrão do upload: 10 MiB (10.485.760 bytes), configurável por variável de ambiente.
- Não há restrição de tipo de arquivo nesta fase; o limite de tamanho e a quantidade de arquivos são validados no servidor.

### `POST /api/upload`

Envia um arquivo associado ao usuário.

**Cabeçalhos**

- `Content-Type: multipart/form-data` (definido pelo cliente HTTP para incluir o boundary).
- `X-User-Id: <identificador>`.

**Corpo**

- Campo multipart `file`: exatamente um arquivo.

**Sucesso: `201 Created`**

```json
{
  "id": "d10e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-10T12:30:00.000Z",
  "owner": "usuario-123"
}
```

**Erros**

- `400 Bad Request`, `INVALID_USER_ID`: cabeçalho ausente, vazio ou inválido.
- `400 Bad Request`, `FILE_REQUIRED`: arquivo ausente.
- `400 Bad Request`, `TOO_MANY_FILES`: mais de um arquivo enviado.
- `413 Content Too Large`, `FILE_TOO_LARGE`: limite configurado excedido.
- `500 Internal Server Error`, `UPLOAD_FAILED`: falha inesperada ao gravar arquivo ou registrar metadados. A implementação deve evitar deixar arquivo órfão quando o registro falhar.

### `GET /api/documents`

Lista os documentos do usuário indicado. Não recebe corpo.

**Cabeçalhos**

- `X-User-Id: <identificador>`.

**Sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "d10e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-10T12:30:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Quando não houver documentos, `documents` deve ser uma lista vazia. A resposta não deve incluir nomes de arquivo internos ou caminhos locais.

**Erros**

- `400 Bad Request`, `INVALID_USER_ID`: cabeçalho ausente, vazio ou inválido.
- `500 Internal Server Error`, `DOCUMENT_LIST_FAILED`: falha inesperada ao consultar os metadados.

### `GET /api/documents/:id/download`

Baixa o conteúdo binário de um documento pertencente ao usuário indicado.

**Cabeçalhos**

- `X-User-Id: <identificador>`.

**Sucesso: `200 OK`**

- Corpo binário do arquivo.
- `Content-Type` compatível com o arquivo, quando determinado; caso contrário, `application/octet-stream`.
- `Content-Disposition: attachment` com o nome original tratado com segurança para uso em cabeçalho HTTP.

**Erros**

- `400 Bad Request`, `INVALID_USER_ID`: cabeçalho ausente, vazio ou inválido.
- `400 Bad Request`, `INVALID_DOCUMENT_ID`: identificador ausente ou em formato inválido.
- `404 Not Found`, `DOCUMENT_NOT_FOUND`: documento inexistente, de outro usuário ou arquivo não disponível no disco. Não revelar qual condição ocorreu.
- `500 Internal Server Error`, `DOWNLOAD_FAILED`: falha inesperada na leitura ou transmissão do arquivo.

## 7. Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de destino dos arquivos. Caminho relativo deve ser resolvido de forma previsível a partir da raiz do backend ou substituído por caminho absoluto. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo permitido por arquivo, em bytes. |

O diretório configurado deve existir ou ser criado pelo backend durante a inicialização. Falha ao preparar o armazenamento deve impedir que o serviço aceite uploads e deve gerar erro operacional sem revelar informações sensíveis aos clientes.

## 8. Decisões arquiteturais

### Backend

- `routes/`: registra os caminhos HTTP, configura o middleware de upload e encaminha para controllers.
- `controllers/`: lê cabeçalhos, parâmetros e arquivo recebido; aplica validações de entrada; converte resultado ou erro em resposta HTTP.
- `services/`: valida regras de negócio, associa documento ao usuário e coordena as operações necessárias.
- `repositories/`: mantém metadados em memória e abstrai gravação, localização e leitura de arquivos locais.
- `multer` com `diskStorage` é o mecanismo de gravação dos uploads. O armazenamento continua estritamente local.

### Frontend

- Componentes funcionais React para seleção/upload, listagem e ação de download.
- Serviço de frontend centraliza chamadas `fetch` à API sob `/api`.
- A interface mantém o mesmo `X-User-Id` nas operações. Por não haver cadastro ou autenticação no escopo, o identificador inicial pode ser configurado para a experiência de desenvolvimento e deve ser claramente tratado como identidade não verificada.

### Segurança e limites desta fase

- `X-User-Id` não autentica o usuário. O isolamento por `owner` é uma regra de aplicação para protótipo, não uma barreira de segurança contra clientes maliciosos.
- Caminhos de armazenamento são sempre gerados/controlados pelo servidor; nunca aceitar um caminho de arquivo como entrada da API.
- Validar nome original para resposta de download e não inseri-lo sem tratamento em cabeçalhos.
- Limitar tamanho e quantidade de arquivos no multer e tratar seus erros no limite HTTP.

## 9. Plano de execução

As etapas abaixo descrevem a implementação futura. Esta especificação não executa nem cria arquivos de backend ou frontend.

1. **Preparar configuração e armazenamento local:** definir variáveis de ambiente, preparar o diretório local e configurar o multer com `diskStorage`, limite de tamanho e nome físico gerado pelo servidor. Critério: configuração padrão funciona localmente e arquivo enviado não determina o caminho de destino.
2. **Implementar repositório e serviço de documentos:** modelar metadados em memória, associação ao owner e operações de registro, listagem e localização/leitura do arquivo. Critério: metadados retornados não expõem localização física e cada consulta respeita o owner.
3. **Implementar controllers e rotas do backend:** disponibilizar upload, listagem e download, validação de cabeçalhos/parâmetros e mapeamento consistente de erros HTTP. Critério: contratos desta especificação são atendidos e falhas do multer não viram erros genéricos incorretos.
4. **Cobrir o backend com testes:** testar sucesso, entradas inválidas, isolamento entre owners, documento ausente, limite de tamanho e falhas relevantes de armazenamento; usar diretório temporário isolado nos testes. Critério: `node --test` conclui sem depender de arquivos de usuário ou serviços externos.
5. **Construir a interface React:** implementar seleção/upload, listagem, download e estados de carregamento/erro; centralizar consumo da API e manter o identificador de usuário consistente. Critério: operações usam `/api` e a interface reflete resultados e falhas da API.
6. **Integrar e validar o fluxo ponta a ponta:** verificar proxy Vite, upload local, listagem do usuário e download, além do comportamento após reinício. Critério: fluxo funciona localmente e a perda dos metadados após reinício é documentada como limitação conhecida.

## 10. Critérios de aceite

- Upload válido retorna `201` e metadados no formato especificado; o conteúdo fica no filesystem local.
- Upload ausente, múltiplo ou acima do limite retorna o erro documentado sem registrar metadados inválidos.
- Listagem retorna somente os documentos do identificador informado e retorna lista vazia quando não há itens.
- Download de documento do próprio identificador retorna o binário e nome original como nome de download.
- Documento inexistente ou associado a outro identificador resulta em `404` sem revelar a existência para outro usuário.
- Nenhuma resposta pública inclui caminho físico do armazenamento.
- A organização do backend respeita a direção das dependências definida nesta especificação.
- O plano de execução permanece descritivo; a criação deste documento não implica implementação dos arquivos de backend ou frontend.
