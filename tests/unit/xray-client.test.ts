import { describe, it, expect, beforeEach, vi } from 'vitest';
import nock from 'nock';
import { XrayClient } from '../../src/xray-client.js';

describe('XrayClient - Unit Tests (Mocked)', () => {
  let client: XrayClient;
  const mockClientId = 'test_client_id';
  const mockClientSecret = 'test_client_secret';
  const mockToken = 'mock_bearer_token_12345';

  beforeEach(() => {
    // Clear all HTTP mocks before each test
    nock.cleanAll();

    // Mock authentication endpoint
    nock('https://xray.cloud.getxray.app')
      .persist()
      .post('/api/v1/authenticate', {
        client_id: mockClientId,
        client_secret: mockClientSecret,
      })
      .reply(200, mockToken);

    client = new XrayClient({
      clientId: mockClientId,
      clientSecret: mockClientSecret,
    });
  });

  describe('Authentication', () => {
    it('should authenticate and return token', async () => {
      // Authentication is tested implicitly in other tests
      // This test verifies the mock setup works
      const mockResponse = { getTests: { total: 0, results: [] } };

      nock('https://xray.cloud.getxray.app')
        .post('/api/v2/graphql')
        .reply(200, { data: mockResponse });

      const result = await client.searchTestCases('project = TEST', 10);
      expect(result).toBeDefined();
    });

    it('should handle authentication failure', async () => {
      nock.cleanAll();
      nock('https://xray.cloud.getxray.app')
        .post('/api/v1/authenticate')
        .reply(401, { error: 'Invalid credentials' });

      const failClient = new XrayClient({
        clientId: 'invalid',
        clientSecret: 'invalid',
      });

      await expect(
        failClient.searchTestCases('project = TEST', 10)
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('Test Case Operations', () => {
    describe('createTestCase', () => {
      it('should create a test case successfully', async () => {
        const mockResponse = {
          createTest: {
            test: {
              issueId: '10001',
              jira: { key: 'TEST-123' },
            },
            warnings: [],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation CreateTest');
            expect(body.variables.jira.fields.summary).toBe('Login test');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.createTestCase({
          projectKey: 'TEST',
          summary: 'Login test',
          description: 'Test login functionality',
          testType: 'Manual',
        });

        expect(result.id).toBe('10001');
        expect(result.key).toBe('TEST-123');
      });

      it('should handle creation errors', async () => {
        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql')
          .reply(200, {
            data: null,
            errors: [{ message: 'Project not found' }],
          });

        await expect(
          client.createTestCase({
            projectKey: 'INVALID',
            summary: 'Test',
          })
        ).rejects.toThrow('GraphQL errors');
      });
    });

    describe('getTestCase', () => {
      it('should retrieve a test case by key', async () => {
        const mockResponse = {
          getTests: {
            total: 1,
            results: [
              {
                issueId: '10001',
                projectId: '10000',
                jira: {
                  key: 'TEST-123',
                  summary: 'Login test',
                  description: 'Test login functionality',
                  priority: { name: 'High' },
                  status: { name: 'To Do' },
                  labels: ['authentication'],
                },
                testType: {
                  name: 'Manual',
                  kind: 'Manual',
                },
                steps: [],
              },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.variables.jql).toContain("key = 'TEST-123'");
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.getTestCase('TEST-123');

        expect(result.issueId).toBe('10001');
        expect(result.jira.key).toBe('TEST-123');
        expect(result.testType.name).toBe('Manual');
      });

      it('should throw error when test case not found', async () => {
        const mockResponse = {
          getTests: {
            total: 0,
            results: [],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql')
          .reply(200, { data: mockResponse });

        await expect(client.getTestCase('TEST-999')).rejects.toThrow(
          'Test case TEST-999 not found'
        );
      });
    });

    describe('searchTestCases', () => {
      it('should search test cases with JQL', async () => {
        const mockResponse = {
          getTests: {
            total: 2,
            start: 0,
            limit: 50,
            results: [
              {
                issueId: '10001',
                projectId: '10000',
                jira: { key: 'TEST-1', summary: 'Test 1' },
                testType: { name: 'Manual', kind: 'Manual' },
              },
              {
                issueId: '10002',
                projectId: '10000',
                jira: { key: 'TEST-2', summary: 'Test 2' },
                testType: { name: 'Cucumber', kind: 'Cucumber' },
              },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.variables.jql).toBe("project = 'TEST'");
            expect(body.variables.limit).toBe(50);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.searchTestCases("project = 'TEST'", 50);

        expect(result.total).toBe(2);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].jira.key).toBe('TEST-1');
      });
    });

    describe('deleteTestCase', () => {
      it('should delete a test case', async () => {
        // First mock getTestCase
        const mockGetResponse = {
          getTests: {
            total: 1,
            results: [{ issueId: '10001', jira: { key: 'TEST-123' } }],
          },
        };

        // Then mock deleteTest
        const mockDeleteResponse = {
          deleteTest: 'Test deleted successfully',
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => body.query.includes('GetTest'))
          .reply(200, { data: mockGetResponse })
          .post('/api/v2/graphql', (body) => body.query.includes('DeleteTest'))
          .reply(200, { data: mockDeleteResponse });

        await expect(client.deleteTestCase('TEST-123')).resolves.not.toThrow();
      });
    });
  });

  describe('Test Execution Operations', () => {
    describe('createTestExecution', () => {
      it('should create a test execution successfully', async () => {
        const mockResponse = {
          createTestExecution: {
            testExecution: {
              issueId: '20001',
              jira: { key: 'TEST-500', summary: 'Sprint 1 Tests' },
              testRuns: {
                results: [
                  {
                    id: 'run1',
                    status: { name: 'TODO', description: 'To Do' },
                    test: {
                      issueId: '10001',
                      jira: { key: 'TEST-1', summary: 'Login test' },
                    },
                  },
                ],
              },
            },
            warnings: [],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation CreateTestExecution');
            expect(body.variables.jira.fields.summary).toBe('Sprint 1 Tests');
            expect(body.variables.testIssueIds).toEqual(['10001', '10002']);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.createTestExecution({
          projectKey: 'TEST',
          summary: 'Sprint 1 Tests',
          testIssueIds: ['10001', '10002'],
          testEnvironments: ['Chrome', 'Firefox'],
        });

        expect(result.issueId).toBe('20001');
        expect(result.key).toBe('TEST-500');
        expect(result.testRuns).toHaveLength(1);
      });
    });

    describe('getTestExecution', () => {
      it('should retrieve a test execution with test runs', async () => {
        const mockResponse = {
          getTestExecutions: {
            total: 1,
            results: [
              {
                issueId: '20001',
                projectId: '10000',
                jira: {
                  key: 'TEST-500',
                  summary: 'Sprint 1 Tests',
                  status: { name: 'In Progress' },
                },
                testRuns: {
                  results: [
                    {
                      id: 'run1',
                      status: { name: 'PASS' },
                      test: {
                        issueId: '10001',
                        jira: { key: 'TEST-1', summary: 'Login test' },
                      },
                      startedOn: '2025-01-01T10:00:00Z',
                      finishedOn: '2025-01-01T10:05:00Z',
                    },
                  ],
                },
              },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.variables.jql).toContain("key = 'TEST-500'");
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.getTestExecution('TEST-500');

        expect(result.issueId).toBe('20001');
        expect(result.testRuns.results).toHaveLength(1);
        expect(result.testRuns.results[0].status.name).toBe('PASS');
      });
    });

    describe('updateTestRunStatus', () => {
      it('should update test run status', async () => {
        const mockResponse = {
          updateTestRunStatus: 'Status updated successfully',
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation UpdateTestRunStatus');
            expect(body.variables.id).toBe('run123');
            expect(body.variables.status).toBe('PASS');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.updateTestRunStatus('run123', 'PASS');

        expect(result).toBe('Status updated successfully');
      });
    });

    describe('searchTestExecutions', () => {
      it('should search test executions with JQL', async () => {
        const mockResponse = {
          getTestExecutions: {
            total: 3,
            start: 0,
            limit: 50,
            results: [
              {
                issueId: '20001',
                jira: { key: 'TEST-500', summary: 'Sprint 1' },
                testRuns: { total: 5, results: [] },
              },
              {
                issueId: '20002',
                jira: { key: 'TEST-501', summary: 'Sprint 2' },
                testRuns: { total: 3, results: [] },
              },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql')
          .reply(200, { data: mockResponse });

        const result = await client.searchTestExecutions(
          "project = 'TEST' AND created >= -7d",
          50
        );

        expect(result.total).toBe(3);
        expect(result.results).toHaveLength(2);
      });
    });
  });

  describe('Test Plan Operations', () => {
    describe('createTestPlan', () => {
      it('should create a test plan successfully', async () => {
        const mockResponse = {
          createTestPlan: {
            testPlan: {
              issueId: '20001',
              jira: { key: 'TEST-PLAN-1', summary: 'Q1 Test Plan' },
              tests: { results: [] },
            },
            warnings: [],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation CreateTestPlan');
            expect(body.variables.jira.fields.summary).toBe('Q1 Test Plan');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.createTestPlan({
          projectKey: 'TEST',
          summary: 'Q1 Test Plan',
          description: 'Test plan for Q1 release',
        });

        expect(result.issueId).toBe('20001');
        expect(result.key).toBe('TEST-PLAN-1');
      });
    });

    describe('getTestPlan', () => {
      it('should get test plan by key', async () => {
        const mockResponse = {
          getTestPlans: {
            total: 1,
            results: [{
              issueId: '20001',
              jira: { key: 'TEST-PLAN-1', summary: 'Q1 Test Plan' },
              tests: { results: [] },
            }],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('query GetTestPlan');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.getTestPlan('TEST-PLAN-1');

        expect(result.issueId).toBe('20001');
        expect(result.jira.key).toBe('TEST-PLAN-1');
      });
    });

    describe('searchTestPlans', () => {
      it('should search test plans with JQL', async () => {
        const mockResponse = {
          getTestPlans: {
            total: 2,
            results: [
              { issueId: '20001', jira: { key: 'TEST-PLAN-1' } },
              { issueId: '20002', jira: { key: 'TEST-PLAN-2' } },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('query SearchTestPlans');
            expect(body.variables.jql).toBe('project = TEST');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.searchTestPlans('project = TEST');

        expect(result.total).toBe(2);
        expect(result.results).toHaveLength(2);
      });
    });

    describe('addTestsToTestPlan', () => {
      it('should add tests to test plan', async () => {
        const mockResponse = {
          addTestsToTestPlan: {
            addedTests: ['10001', '10002'],
            warning: null,
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation AddTestsToTestPlan');
            expect(body.variables.issueId).toBe('20001');
            expect(body.variables.testIssueIds).toEqual(['10001', '10002']);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.addTestsToTestPlan('20001', ['10001', '10002']);

        expect(result.addedTests).toEqual(['10001', '10002']);
      });
    });

    describe('removeTestsFromTestPlan', () => {
      it('should remove tests from test plan', async () => {
        const mockResponse = {
          removeTestsFromTestPlan: {
            removedTests: ['10001'],
            warning: null,
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation RemoveTestsFromTestPlan');
            expect(body.variables.issueId).toBe('20001');
            expect(body.variables.testIssueIds).toEqual(['10001']);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.removeTestsFromTestPlan('20001', ['10001']);

        expect(result.removedTests).toEqual(['10001']);
      });
    });
  });

  describe('Test Set Operations', () => {
    describe('createTestSet', () => {
      it('should create a test set successfully', async () => {
        const mockResponse = {
          createTestSet: {
            testSet: {
              issueId: '30001',
              jira: { key: 'TEST-SET-1', summary: 'Smoke Tests' },
              tests: { results: [] },
            },
            warnings: [],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation CreateTestSet');
            expect(body.variables.jira.fields.summary).toBe('Smoke Tests');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.createTestSet({
          projectKey: 'TEST',
          summary: 'Smoke Tests',
          description: 'Critical smoke test suite',
        });

        expect(result.issueId).toBe('30001');
        expect(result.key).toBe('TEST-SET-1');
      });
    });

    describe('getTestSet', () => {
      it('should get test set by key', async () => {
        const mockResponse = {
          getTestSets: {
            total: 1,
            results: [{
              issueId: '30001',
              jira: { key: 'TEST-SET-1', summary: 'Smoke Tests' },
              tests: { results: [] },
            }],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('query GetTestSet');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.getTestSet('TEST-SET-1');

        expect(result.issueId).toBe('30001');
        expect(result.jira.key).toBe('TEST-SET-1');
      });
    });

    describe('searchTestSets', () => {
      it('should search test sets with JQL', async () => {
        const mockResponse = {
          getTestSets: {
            total: 2,
            results: [
              { issueId: '30001', jira: { key: 'TEST-SET-1' } },
              { issueId: '30002', jira: { key: 'TEST-SET-2' } },
            ],
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('query SearchTestSets');
            expect(body.variables.jql).toBe('project = TEST');
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.searchTestSets('project = TEST');

        expect(result.total).toBe(2);
        expect(result.results).toHaveLength(2);
      });
    });

    describe('addTestsToTestSet', () => {
      it('should add tests to test set', async () => {
        const mockResponse = {
          addTestsToTestSet: {
            addedTests: ['10001', '10002'],
            warning: null,
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation AddTestsToTestSet');
            expect(body.variables.issueId).toBe('30001');
            expect(body.variables.testIssueIds).toEqual(['10001', '10002']);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.addTestsToTestSet('30001', ['10001', '10002']);

        expect(result.addedTests).toEqual(['10001', '10002']);
      });
    });

    describe('removeTestsFromTestSet', () => {
      it('should remove tests from test set', async () => {
        const mockResponse = {
          removeTestsFromTestSet: {
            removedTests: ['10001'],
            warning: null,
          },
        };

        nock('https://xray.cloud.getxray.app')
          .post('/api/v2/graphql', (body) => {
            expect(body.query).toContain('mutation RemoveTestsFromTestSet');
            expect(body.variables.issueId).toBe('30001');
            expect(body.variables.testIssueIds).toEqual(['10001']);
            return true;
          })
          .reply(200, { data: mockResponse });

        const result = await client.removeTestsFromTestSet('30001', ['10001']);

        expect(result.removedTests).toEqual(['10001']);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      nock('https://xray.cloud.getxray.app')
        .post('/api/v2/graphql')
        .reply(500, { error: 'Internal server error' });

      await expect(
        client.searchTestCases('project = TEST', 10)
      ).rejects.toThrow('GraphQL request failed');
    });

    it('should handle network errors', async () => {
      nock('https://xray.cloud.getxray.app')
        .post('/api/v2/graphql')
        .replyWithError('Network error');

      await expect(
        client.searchTestCases('project = TEST', 10)
      ).rejects.toThrow();
    });
  });
});
