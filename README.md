# Xray MCP Server

Model Context Protocol (MCP) server per integrare le API di Xray Cloud con Claude Code e altri client MCP.

## Funzionalità

Questo server MCP espone strumenti per gestire test cases e test executions in Xray Cloud usando l'API GraphQL ufficiale:

### Test Cases (Test Management)
- **create_test_case**: Crea un nuovo test case (usa GraphQL mutation `createTest`)
- **get_test_case**: Recupera i dettagli di un test case specifico (usa GraphQL query `getTests`)
- **delete_test_case**: Elimina un test case (usa GraphQL mutation `deleteTest`)
- **search_test_cases**: Cerca test cases usando JQL (Jira Query Language)
- **get_project_test_cases**: Recupera tutti i test cases di un progetto
- **update_test_case**: ⚠️ Non supportato direttamente - usa Jira REST API per aggiornare campi standard

### Test Executions (Test Automation & CI/CD)
- **create_test_execution**: Crea una nuova test execution per eseguire test
- **get_test_execution**: Recupera dettagli di una test execution con tutti i test runs
- **search_test_executions**: Cerca test executions usando JQL
- **get_project_test_executions**: Recupera tutte le test executions di un progetto
- **update_test_run_status**: Aggiorna lo stato di un test run (PASS, FAIL, ecc.)

### Test Plans (Test Organization)
- **create_test_plan**: Crea un nuovo test plan per organizzare test
- **get_test_plan**: Recupera dettagli di un test plan specifico con tutti i test
- **search_test_plans**: Cerca test plans usando JQL
- **get_project_test_plans**: Recupera tutti i test plans di un progetto
- **add_tests_to_test_plan**: Aggiungi test a un test plan esistente
- **remove_tests_from_test_plan**: Rimuovi test da un test plan

### Test Sets (Test Grouping)
- **create_test_set**: Crea un nuovo test set per raggruppare test
- **get_test_set**: Recupera dettagli di un test set specifico con tutti i test
- **search_test_sets**: Cerca test sets usando JQL
- **get_project_test_sets**: Recupera tutti i test sets di un progetto
- **add_tests_to_test_set**: Aggiungi test a un test set esistente
- **remove_tests_from_test_set**: Rimuovi test da un test set

## Prerequisiti

- Node.js 18 o superiore
- Credenziali API di Xray Cloud (Client ID e Client Secret)

## Testing

This project includes comprehensive test coverage:

- **Unit Tests**: Fast tests with mocked API responses (no credentials needed)
- **Integration Tests**: End-to-end tests with real Xray Cloud API

```bash
# Run unit tests
npm run test:unit

# Run integration tests (requires credentials)
npm run test:integration

# Run all tests
npm test
```

For detailed testing documentation, see [TESTING.md](./TESTING.md)

## Installazione

1. Clona o scarica questo repository
2. Installa le dipendenze:

```bash
npm install
```

3. Compila il progetto:

```bash
npm run build
```

### Come ottenere le credenziali API

1. Vai su https://xray.cloud.getxray.app/
2. Naviga in **Settings** → **API Keys**
3. Clicca su **Create API Key**
4. Copia il Client ID e il Client Secret generati

## Utilizzo

### Configurazione in Claude Code

Per usare questo server MCP con Claude Code, aggiungi la seguente configurazione al tuo file di configurazione MCP (solitamente `~/Library/Application Support/Claude/claude_desktop_config.json` su macOS):

```json
{
  "mcpServers": {
    "xray": {
      "command": "node",
      "args": ["/path/to/xray-mcp/dist/index.js"],
      "env": {
        "XRAY_CLIENT_ID": "your_client_id",
        "XRAY_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

**Importante:** Sostituisci:
- `/path/to/xray-mcp` con il percorso assoluto del progetto (es. `/Users/manuel/repositories/xray-mcp`)
- `your_client_id` e `your_client_secret` con le tue credenziali Xray Cloud

### Test locale

Per testare il server in modalità di sviluppo:

```bash
# Imposta le variabili d'ambiente
export XRAY_CLIENT_ID="your_client_id"
export XRAY_CLIENT_SECRET="your_client_secret"

# Esegui il server
npm run dev
```

## Esempi di utilizzo

### Test Cases

#### Creare un test case

```json
{
  "projectKey": "ABC",
  "summary": "Verify login functionality",
  "description": "Test that users can log in with valid credentials",
  "testType": "Manual",
  "labels": ["login", "authentication"],
  "priority": "High"
}
```

#### Cercare test cases

```json
{
  "jql": "project = ABC AND labels = automation",
  "maxResults": 20
}
```

#### Recuperare test cases di un progetto

```json
{
  "projectKey": "ABC",
  "maxResults": 50
}
```

### Test Executions

#### Creare una test execution

```json
{
  "projectKey": "ABC",
  "summary": "Sprint 23 Regression Tests",
  "description": "Regression testing for sprint 23",
  "testIssueIds": ["10001", "10002", "10003"],
  "testEnvironments": ["Chrome", "Firefox"]
}
```

#### Recuperare una test execution

```json
{
  "testExecutionKey": "ABC-456"
}
```

#### Aggiornare lo stato di un test run

```json
{
  "testRunId": "5acc7ab0a3fe1b6fcdc3c737",
  "status": "PASS"
}
```

#### Cercare test executions recenti

```json
{
  "jql": "project = ABC AND created >= -7d",
  "maxResults": 20
}
```

## Struttura del progetto

```
xray-mcp/
├── src/
│   ├── index.ts           # Server MCP principale
│   └── xray-client.ts     # Client per le API di Xray Cloud
├── dist/                  # File compilati (generati dopo build)
├── .env.example           # Template per le variabili d'ambiente
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## API Xray Cloud

Questo server utilizza le seguenti API di Xray Cloud:

- **Authentication**: `POST /api/v1/authenticate` (token valido 24 ore)
- **GraphQL Endpoint**: `POST /api/v2/graphql`
  - **Test Queries**: `getTests` - Recupera test usando JQL
  - **Test Mutations**: `createTest`, `deleteTest` - Crea/elimina test
  - **Test Execution Queries**: `getTestExecutions` - Recupera executions usando JQL
  - **Test Execution Mutations**: `createTestExecution`, `updateTestRunStatus` - Gestisce executions e risultati
  - **Test Plan Queries**: `getTestPlans` - Recupera test plans usando JQL
  - **Test Plan Mutations**: `createTestPlan`, `addTestsToTestPlan`, `removeTestsFromTestPlan` - Gestisce test plans
  - **Test Set Queries**: `getTestSets` - Recupera test sets usando JQL
  - **Test Set Mutations**: `createTestSet`, `addTestsToTestSet`, `removeTestsFromTestSet` - Gestisce test sets

Per la documentazione completa delle API, visita:
- GraphQL API: https://docs.getxray.app/display/XRAYCLOUD/GraphQL+API
- Schema GraphQL: https://us.xray.cloud.getxray.app/doc/graphql/
- REST API: https://docs.getxray.app/display/XRAYCLOUD/REST+API

## Sviluppo futuro

Funzionalità pianificate per future versioni:

- [x] Gestione Test Executions ✅ (implementato)
- [x] Gestione Test Plans e Test Sets ✅ (implementato)
- [ ] Gestione Test Steps (add/update/remove)
- [ ] Gestione Pre-conditions
- [ ] Integrazione con Test Repositories (folder management)
- [ ] Gestione Requirements e coverage tracking
- [ ] Bulk import/export di test results

## Use Cases

### Integrazione CI/CD
Usa questo server MCP per:
1. Creare test executions automaticamente nelle pipeline CI/CD
2. Aggiornare stati dei test runs in base ai risultati dei test automatici
3. Tracciare l'esecuzione dei test attraverso diversi ambienti
4. Generare report di test execution per sprint reviews

### Test Management
Usa questo server MCP per:
1. Creare e organizzare test cases
2. Cercare test usando query JQL complesse
3. Gestire test executions manuali
4. Tracciare lo stato dei test nel tempo

## Licenza

ISC

## Supporto

Per problemi o domande sulle API di Xray Cloud, consulta la documentazione ufficiale:
- https://docs.getxray.app/
- https://support.getxray.app/
