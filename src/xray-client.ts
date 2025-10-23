import axios, { AxiosInstance } from 'axios';

export interface XrayConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export interface XrayAuthResponse {
  access_token: string;
  expires_in: number;
}

export interface TestCase {
  id?: string;
  key?: string;
  summary: string;
  description?: string;
  testType?: 'Manual' | 'Cucumber' | 'Generic';
  projectKey: string;
  labels?: string[];
  components?: string[];
  priority?: string;
  status?: string;
}

export interface TestCaseResponse {
  id: string;
  key: string;
  self: string;
}

export interface TestExecution {
  summary: string;
  projectKey: string;
  testIssueIds?: string[];
  testEnvironments?: string[];
  description?: string;
}

export interface TestExecutionResponse {
  issueId: string;
  key: string;
  testRuns?: TestRun[];
}

export interface TestRun {
  id: string;
  status: {
    name: string;
    description?: string;
  };
  test: {
    issueId: string;
    jira: any;
  };
  startedOn?: string;
  finishedOn?: string;
  executedBy?: string;
}

export type TestRunStatus = 'TODO' | 'EXECUTING' | 'PASS' | 'FAIL' | 'ABORTED' | 'PASSED' | 'FAILED';

export interface TestPlan {
  summary: string;
  projectKey: string;
  testIssueIds?: string[];
  description?: string;
}

export interface TestPlanResponse {
  issueId: string;
  key: string;
  tests?: any[];
}

export interface TestSet {
  summary: string;
  projectKey: string;
  testIssueIds?: string[];
  description?: string;
}

export interface TestSetResponse {
  issueId: string;
  key: string;
  tests?: any[];
}

export class XrayClient {
  private config: XrayConfig;
  private client: AxiosInstance;
  private graphqlClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: XrayConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://xray.cloud.getxray.app/api/v2'
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.graphqlClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Authenticate with Xray Cloud API and get access token
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post<string>(
        'https://xray.cloud.getxray.app/api/v1/authenticate',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data;
      // Set expiry to 23 hours from now (tokens are valid for 24 hours)
      this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Authentication failed: ${error.response?.data || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Make an authenticated request to the Xray API
   */
  private async request<T>(method: string, url: string, data?: any): Promise<T> {
    const token = await this.authenticate();

    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Make a GraphQL query to Xray API
   */
  private async graphqlRequest<T>(query: string, variables?: any): Promise<T> {
    const token = await this.authenticate();

    try {
      const response = await this.graphqlClient.post<{ data: T; errors?: any[] }>(
        '/graphql',
        {
          query,
          variables
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;
        throw new Error(`GraphQL request failed (${error.response?.status}): ${errorDetails}`);
      }
      throw error;
    }
  }

  /**
   * Create a new test case using GraphQL mutation
   */
  async createTestCase(testCase: TestCase): Promise<TestCaseResponse> {
    const mutation = `
      mutation CreateTest($jira: JSON!, $testType: UpdateTestTypeInput, $unstructured: String) {
        createTest(jira: $jira, testType: $testType, unstructured: $unstructured) {
          test {
            issueId
            jira(fields: ["key"])
          }
          warnings
        }
      }
    `;

    const jiraFields: any = {
      fields: {
        project: {
          key: testCase.projectKey
        },
        summary: testCase.summary,
        issuetype: {
          name: 'Test'
        }
      }
    };

    if (testCase.description) {
      jiraFields.fields.description = testCase.description;
    }

    if (testCase.labels && testCase.labels.length > 0) {
      jiraFields.fields.labels = testCase.labels;
    }

    if (testCase.priority) {
      jiraFields.fields.priority = { name: testCase.priority };
    }

    const variables: any = {
      jira: jiraFields,
      unstructured: testCase.description || ''
    };

    if (testCase.testType) {
      variables.testType = {
        name: testCase.testType
      };
    }

    const result = await this.graphqlRequest<{ createTest: any }>(mutation, variables);

    return {
      id: result.createTest.test.issueId,
      key: result.createTest.test.jira.key,
      self: `https://your-jira-instance.atlassian.net/browse/${result.createTest.test.jira.key}`
    };
  }

  /**
   * Get a test case by key using GraphQL
   */
  async getTestCase(testKey: string): Promise<any> {
    const query = `
      query GetTest($jql: String!, $limit: Int!) {
        getTests(jql: $jql, limit: $limit) {
          total
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "priority", "status", "labels"])
            testType {
              name
              kind
            }
            steps {
              id
              action
              data
              result
            }
            gherkin
            unstructured
          }
        }
      }
    `;

    const variables = {
      jql: `key = '${testKey}'`,
      limit: 1
    };

    const result = await this.graphqlRequest<{ getTests: any }>(query, variables);

    if (result.getTests.total === 0) {
      throw new Error(`Test case ${testKey} not found`);
    }

    return result.getTests.results[0];
  }

  /**
   * Update a test case
   * Note: Xray GraphQL API has specific mutations for test definition updates
   * (updateUnstructuredTestDefinition, updateGherkinTestDefinition, etc.)
   * For general Jira field updates (summary, description, labels), use Jira REST API directly
   */
  async updateTestCase(testKey: string, updates: Partial<TestCase>): Promise<void> {
    throw new Error(
      'Direct test case update is not supported via Xray GraphQL API. ' +
      'Use Jira REST API to update standard fields (summary, description, labels, priority). ' +
      'Use specific Xray mutations for test definition updates: ' +
      'updateUnstructuredTestDefinition, updateGherkinTestDefinition, updateTestType, etc.'
    );
  }

  /**
   * Delete a test case using GraphQL mutation
   * First retrieves the issueId from the test key, then deletes it
   */
  async deleteTestCase(testKey: string): Promise<void> {
    // First, get the issueId from the test key
    const test = await this.getTestCase(testKey);

    const mutation = `
      mutation DeleteTest($issueId: String!) {
        deleteTest(issueId: $issueId)
      }
    `;

    const variables = {
      issueId: test.issueId
    };

    await this.graphqlRequest<{ deleteTest: string }>(mutation, variables);
  }

  /**
   * Get test cases for a project using GraphQL
   */
  async getTestCasesByProject(projectKey: string, maxResults: number = 50): Promise<any> {
    const jql = `project = '${projectKey}'`;
    return this.searchTestCases(jql, maxResults);
  }

  /**
   * Search test cases using JQL and GraphQL
   */
  async searchTestCases(jql: string, maxResults: number = 50): Promise<any> {
    const query = `
      query SearchTests($jql: String!, $limit: Int!) {
        getTests(jql: $jql, limit: $limit) {
          total
          start
          limit
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "priority", "status", "labels"])
            testType {
              name
              kind
            }
          }
        }
      }
    `;

    const variables = {
      jql,
      limit: maxResults
    };

    const result = await this.graphqlRequest<{ getTests: any }>(query, variables);
    return result.getTests;
  }

  // ========================================
  // Test Execution Methods
  // ========================================

  /**
   * Create a new test execution using GraphQL mutation
   */
  async createTestExecution(testExecution: TestExecution): Promise<TestExecutionResponse> {
    const mutation = `
      mutation CreateTestExecution($jira: JSON!, $testIssueIds: [String], $testEnvironments: [String]) {
        createTestExecution(jira: $jira, testIssueIds: $testIssueIds, testEnvironments: $testEnvironments) {
          testExecution {
            issueId
            jira(fields: ["key", "summary"])
            testRuns(limit: 100) {
              results {
                id
                status {
                  name
                  description
                }
                test {
                  issueId
                  jira(fields: ["key", "summary"])
                }
              }
            }
          }
          warnings
        }
      }
    `;

    const jiraFields: any = {
      fields: {
        project: {
          key: testExecution.projectKey
        },
        summary: testExecution.summary,
        issuetype: {
          name: 'Test Execution'
        }
      }
    };

    if (testExecution.description) {
      jiraFields.fields.description = testExecution.description;
    }

    const variables: any = {
      jira: jiraFields
    };

    if (testExecution.testIssueIds && testExecution.testIssueIds.length > 0) {
      variables.testIssueIds = testExecution.testIssueIds;
    }

    if (testExecution.testEnvironments && testExecution.testEnvironments.length > 0) {
      variables.testEnvironments = testExecution.testEnvironments;
    }

    const result = await this.graphqlRequest<{ createTestExecution: any }>(mutation, variables);

    return {
      issueId: result.createTestExecution.testExecution.issueId,
      key: result.createTestExecution.testExecution.jira.key,
      testRuns: result.createTestExecution.testExecution.testRuns.results
    };
  }

  /**
   * Get a test execution by key using GraphQL
   */
  async getTestExecution(testExecutionKey: string): Promise<any> {
    const query = `
      query GetTestExecution($jql: String!, $limit: Int!) {
        getTestExecutions(jql: $jql, limit: $limit) {
          total
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status"])
            testRuns(limit: 100) {
              results {
                id
                status {
                  name
                  description
                }
                test {
                  issueId
                  jira(fields: ["key", "summary"])
                }
                startedOn
                finishedOn
                executedBy
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql: `key = '${testExecutionKey}'`,
      limit: 1
    };

    const result = await this.graphqlRequest<{ getTestExecutions: any }>(query, variables);

    if (result.getTestExecutions.total === 0) {
      throw new Error(`Test execution ${testExecutionKey} not found`);
    }

    return result.getTestExecutions.results[0];
  }

  /**
   * Get test executions for a project using GraphQL
   */
  async getTestExecutionsByProject(projectKey: string, maxResults: number = 50): Promise<any> {
    const jql = `project = '${projectKey}'`;
    return this.searchTestExecutions(jql, maxResults);
  }

  /**
   * Search test executions using JQL and GraphQL
   */
  async searchTestExecutions(jql: string, maxResults: number = 50): Promise<any> {
    const query = `
      query SearchTestExecutions($jql: String!, $limit: Int!) {
        getTestExecutions(jql: $jql, limit: $limit) {
          total
          start
          limit
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status", "created", "updated"])
            testRuns(limit: 100) {
              total
              results {
                id
                status {
                  name
                  description
                }
                test {
                  issueId
                  jira(fields: ["key", "summary"])
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql,
      limit: maxResults
    };

    const result = await this.graphqlRequest<{ getTestExecutions: any }>(query, variables);
    return result.getTestExecutions;
  }

  /**
   * Update the status of a test run using GraphQL mutation
   */
  async updateTestRunStatus(testRunId: string, status: TestRunStatus): Promise<string> {
    const mutation = `
      mutation UpdateTestRunStatus($id: String!, $status: String!) {
        updateTestRunStatus(id: $id, status: $status)
      }
    `;

    const variables = {
      id: testRunId,
      status
    };

    const result = await this.graphqlRequest<{ updateTestRunStatus: string }>(mutation, variables);
    return result.updateTestRunStatus;
  }

  // ========================================
  // Test Plan Methods
  // ========================================

  /**
   * Create a new test plan using GraphQL mutation
   */
  async createTestPlan(testPlan: TestPlan): Promise<TestPlanResponse> {
    const mutation = `
      mutation CreateTestPlan($jira: JSON!, $testIssueIds: [String]) {
        createTestPlan(jira: $jira, testIssueIds: $testIssueIds) {
          testPlan {
            issueId
            jira(fields: ["key", "summary"])
            tests(limit: 100) {
              results {
                issueId
                jira(fields: ["key", "summary"])
              }
            }
          }
          warnings
        }
      }
    `;

    const jiraFields: any = {
      fields: {
        project: {
          key: testPlan.projectKey
        },
        summary: testPlan.summary,
        issuetype: {
          name: 'Test Plan'
        }
      }
    };

    if (testPlan.description) {
      jiraFields.fields.description = testPlan.description;
    }

    const variables: any = {
      jira: jiraFields
    };

    if (testPlan.testIssueIds && testPlan.testIssueIds.length > 0) {
      variables.testIssueIds = testPlan.testIssueIds;
    }

    const result = await this.graphqlRequest<{ createTestPlan: any }>(mutation, variables);

    return {
      issueId: result.createTestPlan.testPlan.issueId,
      key: result.createTestPlan.testPlan.jira.key,
      tests: result.createTestPlan.testPlan.tests?.results || []
    };
  }

  /**
   * Get a test plan by key using GraphQL
   */
  async getTestPlan(testPlanKey: string): Promise<any> {
    const query = `
      query GetTestPlan($jql: String!, $limit: Int!) {
        getTestPlans(jql: $jql, limit: $limit) {
          total
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status"])
            tests(limit: 100) {
              total
              results {
                issueId
                jira(fields: ["key", "summary", "status"])
                testType {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql: `key = '${testPlanKey}'`,
      limit: 1
    };

    const result = await this.graphqlRequest<{ getTestPlans: any }>(query, variables);

    if (result.getTestPlans.total === 0) {
      throw new Error(`Test plan ${testPlanKey} not found`);
    }

    return result.getTestPlans.results[0];
  }

  /**
   * Search test plans using JQL and GraphQL
   */
  async searchTestPlans(jql: string, maxResults: number = 50): Promise<any> {
    const query = `
      query SearchTestPlans($jql: String!, $limit: Int!) {
        getTestPlans(jql: $jql, limit: $limit) {
          total
          start
          limit
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status", "created", "updated"])
            tests(limit: 10) {
              total
              results {
                issueId
                jira(fields: ["key", "summary"])
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql,
      limit: maxResults
    };

    const result = await this.graphqlRequest<{ getTestPlans: any }>(query, variables);
    return result.getTestPlans;
  }

  /**
   * Get test plans for a project using GraphQL
   */
  async getTestPlansByProject(projectKey: string, maxResults: number = 50): Promise<any> {
    const jql = `project = '${projectKey}'`;
    return this.searchTestPlans(jql, maxResults);
  }

  /**
   * Add tests to a test plan using GraphQL mutation
   */
  async addTestsToTestPlan(testPlanIssueId: string, testIssueIds: string[]): Promise<any> {
    const mutation = `
      mutation AddTestsToTestPlan($issueId: String!, $testIssueIds: [String]!) {
        addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
          addedTests
          warning
        }
      }
    `;

    const variables = {
      issueId: testPlanIssueId,
      testIssueIds
    };

    const result = await this.graphqlRequest<{ addTestsToTestPlan: any }>(mutation, variables);
    return result.addTestsToTestPlan;
  }

  /**
   * Remove tests from a test plan using GraphQL mutation
   */
  async removeTestsFromTestPlan(testPlanIssueId: string, testIssueIds: string[]): Promise<any> {
    const mutation = `
      mutation RemoveTestsFromTestPlan($issueId: String!, $testIssueIds: [String]!) {
        removeTestsFromTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
          removedTests
          warning
        }
      }
    `;

    const variables = {
      issueId: testPlanIssueId,
      testIssueIds
    };

    const result = await this.graphqlRequest<{ removeTestsFromTestPlan: any }>(mutation, variables);
    return result.removeTestsFromTestPlan;
  }

  // ========================================
  // Test Set Methods
  // ========================================

  /**
   * Create a new test set using GraphQL mutation
   */
  async createTestSet(testSet: TestSet): Promise<TestSetResponse> {
    const mutation = `
      mutation CreateTestSet($jira: JSON!, $testIssueIds: [String]) {
        createTestSet(jira: $jira, testIssueIds: $testIssueIds) {
          testSet {
            issueId
            jira(fields: ["key", "summary"])
            tests(limit: 100) {
              results {
                issueId
                jira(fields: ["key", "summary"])
              }
            }
          }
          warnings
        }
      }
    `;

    const jiraFields: any = {
      fields: {
        project: {
          key: testSet.projectKey
        },
        summary: testSet.summary,
        issuetype: {
          name: 'Test Set'
        }
      }
    };

    if (testSet.description) {
      jiraFields.fields.description = testSet.description;
    }

    const variables: any = {
      jira: jiraFields
    };

    if (testSet.testIssueIds && testSet.testIssueIds.length > 0) {
      variables.testIssueIds = testSet.testIssueIds;
    }

    const result = await this.graphqlRequest<{ createTestSet: any }>(mutation, variables);

    return {
      issueId: result.createTestSet.testSet.issueId,
      key: result.createTestSet.testSet.jira.key,
      tests: result.createTestSet.testSet.tests?.results || []
    };
  }

  /**
   * Get a test set by key using GraphQL
   */
  async getTestSet(testSetKey: string): Promise<any> {
    const query = `
      query GetTestSet($jql: String!, $limit: Int!) {
        getTestSets(jql: $jql, limit: $limit) {
          total
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status"])
            tests(limit: 100) {
              total
              results {
                issueId
                jira(fields: ["key", "summary", "status"])
                testType {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql: `key = '${testSetKey}'`,
      limit: 1
    };

    const result = await this.graphqlRequest<{ getTestSets: any }>(query, variables);

    if (result.getTestSets.total === 0) {
      throw new Error(`Test set ${testSetKey} not found`);
    }

    return result.getTestSets.results[0];
  }

  /**
   * Search test sets using JQL and GraphQL
   */
  async searchTestSets(jql: string, maxResults: number = 50): Promise<any> {
    const query = `
      query SearchTestSets($jql: String!, $limit: Int!) {
        getTestSets(jql: $jql, limit: $limit) {
          total
          start
          limit
          results {
            issueId
            projectId
            jira(fields: ["key", "summary", "description", "status", "created", "updated"])
            tests(limit: 10) {
              total
              results {
                issueId
                jira(fields: ["key", "summary"])
              }
            }
          }
        }
      }
    `;

    const variables = {
      jql,
      limit: maxResults
    };

    const result = await this.graphqlRequest<{ getTestSets: any }>(query, variables);
    return result.getTestSets;
  }

  /**
   * Get test sets for a project using GraphQL
   */
  async getTestSetsByProject(projectKey: string, maxResults: number = 50): Promise<any> {
    const jql = `project = '${projectKey}'`;
    return this.searchTestSets(jql, maxResults);
  }

  /**
   * Add tests to a test set using GraphQL mutation
   */
  async addTestsToTestSet(testSetIssueId: string, testIssueIds: string[]): Promise<any> {
    const mutation = `
      mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
        addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
          addedTests
          warning
        }
      }
    `;

    const variables = {
      issueId: testSetIssueId,
      testIssueIds
    };

    const result = await this.graphqlRequest<{ addTestsToTestSet: any }>(mutation, variables);
    return result.addTestsToTestSet;
  }

  /**
   * Remove tests from a test set using GraphQL mutation
   */
  async removeTestsFromTestSet(testSetIssueId: string, testIssueIds: string[]): Promise<any> {
    const mutation = `
      mutation RemoveTestsFromTestSet($issueId: String!, $testIssueIds: [String]!) {
        removeTestsFromTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
          removedTests
          warning
        }
      }
    `;

    const variables = {
      issueId: testSetIssueId,
      testIssueIds
    };

    const result = await this.graphqlRequest<{ removeTestsFromTestSet: any }>(mutation, variables);
    return result.removeTestsFromTestSet;
  }
}
