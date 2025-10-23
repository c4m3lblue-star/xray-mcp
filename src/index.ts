#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { XrayClient, TestCase, TestExecution, TestRunStatus, TestPlan, TestSet } from './xray-client.js';

// Validate required environment variables
const XRAY_CLIENT_ID = process.env.XRAY_CLIENT_ID;
const XRAY_CLIENT_SECRET = process.env.XRAY_CLIENT_SECRET;

if (!XRAY_CLIENT_ID || !XRAY_CLIENT_SECRET) {
  console.error('Error: XRAY_CLIENT_ID and XRAY_CLIENT_SECRET must be set in environment variables');
  process.exit(1);
}

// Initialize Xray client
const xrayClient = new XrayClient({
  clientId: XRAY_CLIENT_ID,
  clientSecret: XRAY_CLIENT_SECRET,
});

// Define available tools
const tools: Tool[] = [
  {
    name: 'create_test_case',
    description: 'Create a new test case in Xray Cloud',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        summary: {
          type: 'string',
          description: 'The test case summary/title',
        },
        description: {
          type: 'string',
          description: 'The test case description',
        },
        testType: {
          type: 'string',
          enum: ['Manual', 'Cucumber', 'Generic'],
          description: 'The type of test case',
          default: 'Manual',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to attach to the test case',
        },
        priority: {
          type: 'string',
          description: 'Priority of the test case (e.g., "High", "Medium", "Low")',
        },
      },
      required: ['projectKey', 'summary'],
    },
  },
  {
    name: 'get_test_case',
    description: 'Get details of a specific test case by key',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test case key (e.g., "PROJ-123")',
        },
      },
      required: ['testKey'],
    },
  },
  {
    name: 'update_test_case',
    description: 'Update an existing test case',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test case key (e.g., "PROJ-123")',
        },
        summary: {
          type: 'string',
          description: 'New summary/title for the test case',
        },
        description: {
          type: 'string',
          description: 'New description for the test case',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'New labels for the test case',
        },
        priority: {
          type: 'string',
          description: 'New priority for the test case',
        },
      },
      required: ['testKey'],
    },
  },
  {
    name: 'delete_test_case',
    description: 'Delete a test case',
    inputSchema: {
      type: 'object',
      properties: {
        testKey: {
          type: 'string',
          description: 'The test case key to delete (e.g., "PROJ-123")',
        },
      },
      required: ['testKey'],
    },
  },
  {
    name: 'search_test_cases',
    description: 'Search for test cases using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query to search test cases (e.g., "project = PROJ AND labels = automation")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'get_project_test_cases',
    description: 'Get all test cases for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['projectKey'],
    },
  },
  // Test Execution tools
  {
    name: 'create_test_execution',
    description: 'Create a new test execution in Xray Cloud to run tests',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        summary: {
          type: 'string',
          description: 'The test execution summary/title',
        },
        description: {
          type: 'string',
          description: 'The test execution description',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to include in this execution (e.g., ["10001", "10002"])',
        },
        testEnvironments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test environments (e.g., ["Chrome", "iOS"])',
        },
      },
      required: ['projectKey', 'summary'],
    },
  },
  {
    name: 'get_test_execution',
    description: 'Get details of a specific test execution by key, including all test runs',
    inputSchema: {
      type: 'object',
      properties: {
        testExecutionKey: {
          type: 'string',
          description: 'The test execution key (e.g., "PROJ-456")',
        },
      },
      required: ['testExecutionKey'],
    },
  },
  {
    name: 'search_test_executions',
    description: 'Search for test executions using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query to search test executions (e.g., "project = PROJ AND created >= -7d")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'get_project_test_executions',
    description: 'Get all test executions for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'update_test_run_status',
    description: 'Update the status of a specific test run (e.g., mark as PASS or FAIL)',
    inputSchema: {
      type: 'object',
      properties: {
        testRunId: {
          type: 'string',
          description: 'The test run ID (obtained from test execution details)',
        },
        status: {
          type: 'string',
          enum: ['TODO', 'EXECUTING', 'PASS', 'FAIL', 'ABORTED', 'PASSED', 'FAILED'],
          description: 'The new status for the test run',
        },
      },
      required: ['testRunId', 'status'],
    },
  },
  // Test Plan tools
  {
    name: 'create_test_plan',
    description: 'Create a new test plan in Xray Cloud to organize tests',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        summary: {
          type: 'string',
          description: 'The test plan summary/title',
        },
        description: {
          type: 'string',
          description: 'The test plan description',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to include in this plan',
        },
      },
      required: ['projectKey', 'summary'],
    },
  },
  {
    name: 'get_test_plan',
    description: 'Get details of a specific test plan by key, including all tests',
    inputSchema: {
      type: 'object',
      properties: {
        testPlanKey: {
          type: 'string',
          description: 'The test plan key (e.g., "PROJ-789")',
        },
      },
      required: ['testPlanKey'],
    },
  },
  {
    name: 'search_test_plans',
    description: 'Search for test plans using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query to search test plans',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'get_project_test_plans',
    description: 'Get all test plans for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'add_tests_to_test_plan',
    description: 'Add tests to an existing test plan',
    inputSchema: {
      type: 'object',
      properties: {
        testPlanIssueId: {
          type: 'string',
          description: 'The test plan issue ID (not key)',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to add',
        },
      },
      required: ['testPlanIssueId', 'testIssueIds'],
    },
  },
  {
    name: 'remove_tests_from_test_plan',
    description: 'Remove tests from an existing test plan',
    inputSchema: {
      type: 'object',
      properties: {
        testPlanIssueId: {
          type: 'string',
          description: 'The test plan issue ID (not key)',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to remove',
        },
      },
      required: ['testPlanIssueId', 'testIssueIds'],
    },
  },
  // Test Set tools
  {
    name: 'create_test_set',
    description: 'Create a new test set in Xray Cloud to group related tests',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        summary: {
          type: 'string',
          description: 'The test set summary/title',
        },
        description: {
          type: 'string',
          description: 'The test set description',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to include in this set',
        },
      },
      required: ['projectKey', 'summary'],
    },
  },
  {
    name: 'get_test_set',
    description: 'Get details of a specific test set by key, including all tests',
    inputSchema: {
      type: 'object',
      properties: {
        testSetKey: {
          type: 'string',
          description: 'The test set key (e.g., "PROJ-890")',
        },
      },
      required: ['testSetKey'],
    },
  },
  {
    name: 'search_test_sets',
    description: 'Search for test sets using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query to search test sets',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'get_project_test_sets',
    description: 'Get all test sets for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'The Jira project key (e.g., "PROJ")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'add_tests_to_test_set',
    description: 'Add tests to an existing test set',
    inputSchema: {
      type: 'object',
      properties: {
        testSetIssueId: {
          type: 'string',
          description: 'The test set issue ID (not key)',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to add',
        },
      },
      required: ['testSetIssueId', 'testIssueIds'],
    },
  },
  {
    name: 'remove_tests_from_test_set',
    description: 'Remove tests from an existing test set',
    inputSchema: {
      type: 'object',
      properties: {
        testSetIssueId: {
          type: 'string',
          description: 'The test set issue ID (not key)',
        },
        testIssueIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of test issue IDs to remove',
        },
      },
      required: ['testSetIssueId', 'testIssueIds'],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: 'xray-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('Missing arguments');
  }

  try {
    switch (name) {
      case 'create_test_case': {
        const testCase: TestCase = {
          projectKey: args.projectKey as string,
          summary: args.summary as string,
          description: args.description as string | undefined,
          testType: args.testType as 'Manual' | 'Cucumber' | 'Generic' | undefined,
          labels: args.labels as string[] | undefined,
          priority: args.priority as string | undefined,
        };

        const result = await xrayClient.createTestCase(testCase);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_case': {
        const result = await xrayClient.getTestCase(args.testKey as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_test_case': {
        const updates: Partial<TestCase> = {};
        if (args.summary) updates.summary = args.summary as string;
        if (args.description) updates.description = args.description as string;
        if (args.labels) updates.labels = args.labels as string[];
        if (args.priority) updates.priority = args.priority as string;

        await xrayClient.updateTestCase(args.testKey as string, updates);
        return {
          content: [
            {
              type: 'text',
              text: `Test case ${args.testKey} updated successfully`,
            },
          ],
        };
      }

      case 'delete_test_case': {
        await xrayClient.deleteTestCase(args.testKey as string);
        return {
          content: [
            {
              type: 'text',
              text: `Test case ${args.testKey} deleted successfully`,
            },
          ],
        };
      }

      case 'search_test_cases': {
        const result = await xrayClient.searchTestCases(
          args.jql as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project_test_cases': {
        const result = await xrayClient.getTestCasesByProject(
          args.projectKey as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Test Execution handlers
      case 'create_test_execution': {
        const testExecution: TestExecution = {
          projectKey: args.projectKey as string,
          summary: args.summary as string,
          description: args.description as string | undefined,
          testIssueIds: args.testIssueIds as string[] | undefined,
          testEnvironments: args.testEnvironments as string[] | undefined,
        };

        const result = await xrayClient.createTestExecution(testExecution);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_execution': {
        const result = await xrayClient.getTestExecution(args.testExecutionKey as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_test_executions': {
        const result = await xrayClient.searchTestExecutions(
          args.jql as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project_test_executions': {
        const result = await xrayClient.getTestExecutionsByProject(
          args.projectKey as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_test_run_status': {
        const result = await xrayClient.updateTestRunStatus(
          args.testRunId as string,
          args.status as TestRunStatus
        );
        return {
          content: [
            {
              type: 'text',
              text: `Test run ${args.testRunId} status updated to ${args.status}: ${result}`,
            },
          ],
        };
      }

      case 'create_test_plan': {
        const testPlan: TestPlan = {
          projectKey: args.projectKey as string,
          summary: args.summary as string,
          description: args.description as string | undefined,
          testIssueIds: args.testIssueIds as string[] | undefined,
        };

        const result = await xrayClient.createTestPlan(testPlan);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_plan': {
        const result = await xrayClient.getTestPlan(args.testPlanKey as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_test_plans': {
        const result = await xrayClient.searchTestPlans(
          args.jql as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project_test_plans': {
        const result = await xrayClient.getTestPlansByProject(
          args.projectKey as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_tests_to_test_plan': {
        const result = await xrayClient.addTestsToTestPlan(
          args.testPlanIssueId as string,
          args.testIssueIds as string[]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'remove_tests_from_test_plan': {
        const result = await xrayClient.removeTestsFromTestPlan(
          args.testPlanIssueId as string,
          args.testIssueIds as string[]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_test_set': {
        const testSet: TestSet = {
          projectKey: args.projectKey as string,
          summary: args.summary as string,
          description: args.description as string | undefined,
          testIssueIds: args.testIssueIds as string[] | undefined,
        };

        const result = await xrayClient.createTestSet(testSet);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_set': {
        const result = await xrayClient.getTestSet(args.testSetKey as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_test_sets': {
        const result = await xrayClient.searchTestSets(
          args.jql as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project_test_sets': {
        const result = await xrayClient.getTestSetsByProject(
          args.projectKey as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_tests_to_test_set': {
        const result = await xrayClient.addTestsToTestSet(
          args.testSetIssueId as string,
          args.testIssueIds as string[]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'remove_tests_from_test_set': {
        const result = await xrayClient.removeTestsFromTestSet(
          args.testSetIssueId as string,
          args.testIssueIds as string[]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle EPIPE errors (broken pipe when client disconnects)
  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      process.exit(0);
    }
  });

  process.stderr.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      process.exit(0);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
