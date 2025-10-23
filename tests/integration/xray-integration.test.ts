import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { XrayClient } from '../../src/xray-client.js';

/**
 * Integration tests for Xray Cloud API
 *
 * These tests require real Xray Cloud credentials and will make actual API calls.
 *
 * To run these tests:
 * 1. Create a .env.test file with your credentials:
 *    XRAY_CLIENT_ID=your_client_id
 *    XRAY_CLIENT_SECRET=your_client_secret
 *    XRAY_TEST_PROJECT_KEY=your_test_project_key
 *
 * 2. Run: npm run test:integration
 *
 * IMPORTANT: These tests will create and delete real data in your Xray instance.
 * Use a dedicated test project to avoid interfering with production data.
 */

const INTEGRATION_TESTS_ENABLED =
  process.env.XRAY_CLIENT_ID &&
  process.env.XRAY_CLIENT_SECRET &&
  process.env.XRAY_TEST_PROJECT_KEY;

const skipIfNoCredentials = INTEGRATION_TESTS_ENABLED ? describe : describe.skip;

skipIfNoCredentials('XrayClient - Integration Tests (Real API)', () => {
  let client: XrayClient;
  const projectKey = process.env.XRAY_TEST_PROJECT_KEY!;

  // Store created resources for cleanup
  const createdTestKeys: string[] = [];
  const createdExecutionKeys: string[] = [];

  beforeAll(() => {
    if (!INTEGRATION_TESTS_ENABLED) {
      console.log('Skipping integration tests - credentials not found');
      return;
    }

    client = new XrayClient({
      clientId: process.env.XRAY_CLIENT_ID!,
      clientSecret: process.env.XRAY_CLIENT_SECRET!,
    });

    console.log(`Running integration tests against project: ${projectKey}`);
  });

  afterAll(async () => {
    if (!INTEGRATION_TESTS_ENABLED) return;

    // Cleanup: delete created test executions
    console.log(`Cleaning up ${createdExecutionKeys.length} test executions...`);
    for (const key of createdExecutionKeys) {
      try {
        await client.deleteTestCase(key);
        console.log(`  ✓ Deleted execution: ${key}`);
      } catch (error) {
        console.warn(`  ✗ Failed to delete execution ${key}:`, error);
      }
    }

    // Cleanup: delete created test cases
    console.log(`Cleaning up ${createdTestKeys.length} test cases...`);
    for (const key of createdTestKeys) {
      try {
        await client.deleteTestCase(key);
        console.log(`  ✓ Deleted test case: ${key}`);
      } catch (error) {
        console.warn(`  ✗ Failed to delete test case ${key}:`, error);
      }
    }
  });

  describe('Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      // Test by making a simple query
      const result = await client.searchTestCases(`project = '${projectKey}'`, 1);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('total');
    }, 30000);
  });

  describe('Test Case Management', () => {
    it('should create a new test case', async () => {
      const timestamp = Date.now();
      const testCase = {
        projectKey,
        summary: `[Integration Test] Login Test ${timestamp}`,
        description: 'Automated integration test for login functionality',
        testType: 'Manual' as const,
        labels: ['integration-test', 'automated'],
        priority: 'Medium',
      };

      const result = await client.createTestCase(testCase);

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.id).toBeDefined();

      // Store for cleanup
      createdTestKeys.push(result.key);

      console.log(`  Created test case: ${result.key}`);
    }, 30000);

    it('should retrieve an existing test case', async () => {
      // First create a test case
      const timestamp = Date.now();
      const created = await client.createTestCase({
        projectKey,
        summary: `[Integration Test] Retrieve Test ${timestamp}`,
        description: 'Test case for retrieval test',
      });

      createdTestKeys.push(created.key);

      // Then retrieve it
      const retrieved = await client.getTestCase(created.key);

      expect(retrieved).toBeDefined();
      expect(retrieved.issueId).toBe(created.id);
      expect(retrieved.jira.key).toBe(created.key);
      expect(retrieved.jira.summary).toContain('Retrieve Test');
    }, 30000);

    it('should search test cases by JQL', async () => {
      const result = await client.searchTestCases(
        `project = '${projectKey}' AND labels = integration-test`,
        10
      );

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    }, 30000);

    it('should get test cases by project', async () => {
      const result = await client.getTestCasesByProject(projectKey, 10);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    }, 30000);

    it('should delete a test case', async () => {
      // Create a test case to delete
      const timestamp = Date.now();
      const created = await client.createTestCase({
        projectKey,
        summary: `[Integration Test] Delete Test ${timestamp}`,
      });

      console.log(`  Created test case to delete: ${created.key}`);

      // Delete it
      await client.deleteTestCase(created.key);

      console.log(`  Deleted test case: ${created.key}`);

      // Verify it's deleted by trying to retrieve it
      await expect(client.getTestCase(created.key)).rejects.toThrow('not found');
    }, 30000);
  });

  describe('Test Execution Management', () => {
    let testCaseId: string;
    let testCaseKey: string;

    beforeAll(async () => {
      // Create a test case to use in executions
      const timestamp = Date.now();
      const created = await client.createTestCase({
        projectKey,
        summary: `[Integration Test] Execution Test Case ${timestamp}`,
        description: 'Test case for execution tests',
        testType: 'Manual',
      });

      testCaseId = created.id;
      testCaseKey = created.key;
      createdTestKeys.push(created.key);

      console.log(`  Created test case for executions: ${testCaseKey} (${testCaseId})`);
    });

    it('should create a test execution', async () => {
      const timestamp = Date.now();
      const execution = {
        projectKey,
        summary: `[Integration Test] Execution ${timestamp}`,
        description: 'Automated integration test execution',
        testIssueIds: [testCaseId],
        testEnvironments: ['Chrome', 'Integration'],
      };

      const result = await client.createTestExecution(execution);

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.issueId).toBeDefined();
      expect(result.testRuns).toBeDefined();
      expect(result.testRuns!.length).toBeGreaterThan(0);

      createdExecutionKeys.push(result.key);

      console.log(`  Created test execution: ${result.key} with ${result.testRuns!.length} test runs`);
    }, 30000);

    it('should retrieve a test execution', async () => {
      // Create an execution first
      const timestamp = Date.now();
      const created = await client.createTestExecution({
        projectKey,
        summary: `[Integration Test] Retrieve Execution ${timestamp}`,
        testIssueIds: [testCaseId],
      });

      createdExecutionKeys.push(created.key);

      // Retrieve it
      const retrieved = await client.getTestExecution(created.key);

      expect(retrieved).toBeDefined();
      expect(retrieved.issueId).toBe(created.issueId);
      expect(retrieved.jira.key).toBe(created.key);
      expect(retrieved.testRuns).toBeDefined();
    }, 30000);

    it('should update test run status', async () => {
      // Create an execution
      const timestamp = Date.now();
      const execution = await client.createTestExecution({
        projectKey,
        summary: `[Integration Test] Status Update ${timestamp}`,
        testIssueIds: [testCaseId],
      });

      createdExecutionKeys.push(execution.key);

      expect(execution.testRuns).toBeDefined();
      expect(execution.testRuns!.length).toBeGreaterThan(0);

      const testRunId = execution.testRuns![0].id;
      console.log(`  Updating test run ${testRunId} to PASS`);

      // Update the status
      const result = await client.updateTestRunStatus(testRunId, 'PASS');

      expect(result).toBeDefined();
      console.log(`  Test run status updated: ${result}`);

      // Verify the update by retrieving the execution
      const updated = await client.getTestExecution(execution.key);
      const updatedRun = updated.testRuns.results.find((r: any) => r.id === testRunId);

      expect(updatedRun).toBeDefined();
      expect(updatedRun.status.name).toBe('PASS');
    }, 30000);

    it('should search test executions by JQL', async () => {
      const result = await client.searchTestExecutions(
        `project = '${projectKey}' AND created >= -1d`,
        10
      );

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    }, 30000);

    it('should get test executions by project', async () => {
      const result = await client.getTestExecutionsByProject(projectKey, 10);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent test case', async () => {
      await expect(client.getTestCase('NONEXISTENT-99999')).rejects.toThrow();
    }, 30000);

    it('should handle non-existent test execution', async () => {
      await expect(client.getTestExecution('NONEXISTENT-99999')).rejects.toThrow();
    }, 30000);

    it('should handle invalid JQL', async () => {
      await expect(
        client.searchTestCases('INVALID JQL SYNTAX!!!', 10)
      ).rejects.toThrow();
    }, 30000);

    it('should handle invalid project key', async () => {
      await expect(
        client.createTestCase({
          projectKey: 'INVALID_PROJECT_THAT_DOES_NOT_EXIST',
          summary: 'This should fail',
        })
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Complete Workflow', () => {
    it('should execute a complete test workflow', async () => {
      const timestamp = Date.now();

      // 1. Create a test case
      console.log('  1. Creating test case...');
      const testCase = await client.createTestCase({
        projectKey,
        summary: `[Integration Test] Workflow Test ${timestamp}`,
        description: 'Complete workflow integration test',
        testType: 'Manual',
        labels: ['workflow-test'],
      });

      createdTestKeys.push(testCase.key);
      console.log(`     Created: ${testCase.key}`);

      // 2. Retrieve the test case to verify
      console.log('  2. Retrieving test case...');
      const retrieved = await client.getTestCase(testCase.key);
      expect(retrieved.jira.key).toBe(testCase.key);
      console.log(`     Retrieved: ${retrieved.jira.key}`);

      // 3. Create a test execution
      console.log('  3. Creating test execution...');
      const execution = await client.createTestExecution({
        projectKey,
        summary: `[Integration Test] Workflow Execution ${timestamp}`,
        testIssueIds: [testCase.id],
        testEnvironments: ['Integration'],
      });

      createdExecutionKeys.push(execution.key);
      console.log(`     Created execution: ${execution.key}`);

      // 4. Update test run status to EXECUTING
      console.log('  4. Updating test run to EXECUTING...');
      const testRunId = execution.testRuns![0].id;
      await client.updateTestRunStatus(testRunId, 'EXECUTING');
      console.log(`     Status: EXECUTING`);

      // 5. Update test run status to PASS
      console.log('  5. Updating test run to PASS...');
      await client.updateTestRunStatus(testRunId, 'PASS');
      console.log(`     Status: PASS`);

      // 6. Verify final status
      console.log('  6. Verifying final status...');
      const final = await client.getTestExecution(execution.key);
      const finalRun = final.testRuns.results.find((r: any) => r.id === testRunId);
      expect(finalRun.status.name).toBe('PASS');
      console.log(`     Final status confirmed: ${finalRun.status.name}`);

      console.log('  ✓ Complete workflow executed successfully!');
    }, 60000);
  });
});

// Export test status for CI/CD
if (!INTEGRATION_TESTS_ENABLED) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Integration Tests Skipped - Credentials Not Found            ║
╠════════════════════════════════════════════════════════════════╣
║  To enable integration tests, create a .env.test file with:   ║
║                                                                ║
║  XRAY_CLIENT_ID=your_client_id                                ║
║  XRAY_CLIENT_SECRET=your_client_secret                        ║
║  XRAY_TEST_PROJECT_KEY=your_test_project                      ║
║                                                                ║
║  Then run: npm run test:integration                           ║
╚════════════════════════════════════════════════════════════════╝
  `);
}
