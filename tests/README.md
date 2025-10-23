# Test Suite

Quick reference for running tests in this project.

## Test Commands

| Command | Description | Credentials Needed |
|---------|-------------|-------------------|
| `npm test` | Run all tests | No (unit only) |
| `npm run test:unit` | Run unit tests only | No |
| `npm run test:integration` | Run integration tests | Yes |
| `npm run test:watch` | Run tests in watch mode | No |
| `npm run test:ui` | Open Vitest UI | No |
| `npm run test:coverage` | Generate coverage report | No |

## Test Statistics

- **Unit Tests**: 14 tests covering all XrayClient methods
- **Integration Tests**: 15+ tests covering complete workflows
- **Total Coverage**: ~90%+ (unit tests only)

## What's Tested

### Unit Tests (Mocked API)
✅ Authentication flow
✅ Test case creation
✅ Test case retrieval
✅ Test case search (JQL)
✅ Test case deletion
✅ Test execution creation
✅ Test execution retrieval
✅ Test run status updates
✅ Error handling
✅ GraphQL query structure

### Integration Tests (Real API)
✅ End-to-end authentication
✅ Real test case CRUD operations
✅ Real test execution workflows
✅ Test run status lifecycle
✅ JQL search functionality
✅ Error scenarios with real API
✅ Complete workflow (create → execute → update → verify)

## Setup Integration Tests

1. Copy `.env.test.example` to `.env.test`
2. Add your Xray Cloud credentials
3. Run `npm run test:integration`

See [TESTING.md](../TESTING.md) for detailed documentation.
