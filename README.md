# Xray MCP Server

Model Context Protocol (MCP) server to integrate Xray Cloud APIs with Claude Code and other MCP clients.

## Features

This MCP server exposes tools to manage test cases and test executions in Xray Cloud using the official GraphQL API:

### Test Cases (Test Management)
- **create_test_case**: Create a new test case (uses GraphQL mutation `createTest`)
- **get_test_case**: Retrieve details of a specific test case (uses GraphQL query `getTests`)
- **delete_test_case**: Delete a test case (uses GraphQL mutation `deleteTest`)
- **search_test_cases**: Search test cases using JQL (Jira Query Language)
- **get_project_test_cases**: Retrieve all test cases for a project
- **update_test_case**: ⚠️ Not directly supported - use Jira REST API to update standard fields

### Test Executions (Test Automation & CI/CD)
- **create_test_execution**: Create a new test execution to run tests
- **get_test_execution**: Retrieve details of a test execution with all test runs
- **search_test_executions**: Search test executions using JQL
- **get_project_test_executions**: Retrieve all test executions for a project
- **update_test_run_status**: Update the status of a test run (PASS, FAIL, etc.)

### Test Plans (Test Organization)
- **create_test_plan**: Create a new test plan to organize tests
- **get_test_plan**: Retrieve details of a specific test plan with all tests
- **search_test_plans**: Search test plans using JQL
- **get_project_test_plans**: Retrieve all test plans for a project
- **add_tests_to_test_plan**: Add tests to an existing test plan
- **remove_tests_from_test_plan**: Remove tests from a test plan

### Test Sets (Test Grouping)
- **create_test_set**: Create a new test set to group tests
- **get_test_set**: Retrieve details of a specific test set with all tests
- **search_test_sets**: Search test sets using JQL
- **get_project_test_sets**: Retrieve all test sets for a project
- **add_tests_to_test_set**: Add tests to an existing test set
- **remove_tests_from_test_set**: Remove tests from a test set

## Prerequisites

- Node.js 18 or higher
- Xray Cloud API credentials (Client ID and Client Secret)

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

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### How to Obtain API Credentials

1. Go to https://xray.cloud.getxray.app/
2. Navigate to **Settings** → **API Keys**
3. Click on **Create API Key**
4. Copy the generated Client ID and Client Secret

## Usage

### Configuration in Claude Code

To use this MCP server with Claude Code, add the following configuration to your MCP configuration file (typically `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

**Important:** Replace:
- `/path/to/xray-mcp` with the absolute path to the project (e.g., `/Users/manuel/repositories/xray-mcp`)
- `your_client_id` and `your_client_secret` with your Xray Cloud credentials

### Local Testing

To test the server in development mode:

```bash
# Set environment variables
export XRAY_CLIENT_ID="your_client_id"
export XRAY_CLIENT_SECRET="your_client_secret"

# Run the server
npm run dev
```

## Usage Examples

### Test Cases

#### Create a Test Case

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

#### Search Test Cases

```json
{
  "jql": "project = ABC AND labels = automation",
  "maxResults": 20
}
```

#### Retrieve Project Test Cases

```json
{
  "projectKey": "ABC",
  "maxResults": 50
}
```

### Test Executions

#### Create a Test Execution

```json
{
  "projectKey": "ABC",
  "summary": "Sprint 23 Regression Tests",
  "description": "Regression testing for sprint 23",
  "testIssueIds": ["10001", "10002", "10003"],
  "testEnvironments": ["Chrome", "Firefox"]
}
```

#### Retrieve a Test Execution

```json
{
  "testExecutionKey": "ABC-456"
}
```

#### Update Test Run Status

```json
{
  "testRunId": "5acc7ab0a3fe1b6fcdc3c737",
  "status": "PASS"
}
```

#### Search Recent Test Executions

```json
{
  "jql": "project = ABC AND created >= -7d",
  "maxResults": 20
}
```

## Project Structure

```
xray-mcp/
├── src/
│   ├── index.ts           # Main MCP server
│   └── xray-client.ts     # Client for Xray Cloud APIs
├── dist/                  # Compiled files (generated after build)
├── .env.example           # Template for environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Xray Cloud APIs

This server uses the following Xray Cloud APIs:

- **Authentication**: `POST /api/v1/authenticate` (token valid for 24 hours)
- **GraphQL Endpoint**: `POST /api/v2/graphql`
  - **Test Queries**: `getTests` - Retrieve tests using JQL
  - **Test Mutations**: `createTest`, `deleteTest` - Create/delete tests
  - **Test Execution Queries**: `getTestExecutions` - Retrieve executions using JQL
  - **Test Execution Mutations**: `createTestExecution`, `updateTestRunStatus` - Manage executions and results
  - **Test Plan Queries**: `getTestPlans` - Retrieve test plans using JQL
  - **Test Plan Mutations**: `createTestPlan`, `addTestsToTestPlan`, `removeTestsFromTestPlan` - Manage test plans
  - **Test Set Queries**: `getTestSets` - Retrieve test sets using JQL
  - **Test Set Mutations**: `createTestSet`, `addTestsToTestSet`, `removeTestsFromTestSet` - Manage test sets

For complete API documentation, visit:
- GraphQL API: https://docs.getxray.app/display/XRAYCLOUD/GraphQL+API
- GraphQL Schema: https://us.xray.cloud.getxray.app/doc/graphql/
- REST API: https://docs.getxray.app/display/XRAYCLOUD/REST+API

## Use Cases

### CI/CD Integration
Use this MCP server to:
1. Automatically create test executions in CI/CD pipelines
2. Update test run statuses based on automated test results
3. Track test execution across different environments
4. Generate test execution reports for sprint reviews

### Test Management
Use this MCP server to:
1. Create and organize test cases
2. Search tests using complex JQL queries
3. Manage manual test executions
4. Track test status over time

## License

ISC

## Support

For issues or questions about Xray Cloud APIs, consult the official documentation:
- https://docs.getxray.app/
- https://support.getxray.app/
