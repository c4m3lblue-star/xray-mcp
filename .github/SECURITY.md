# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in this project, please report it by:

1. **DO NOT** create a public GitHub issue
2. Email the maintainers directly (see package.json for contact info)
3. Include as much information as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond as quickly as possible and work with you to address the issue.

## Security Best Practices

### API Credentials

This project requires Xray Cloud API credentials. **NEVER** commit these credentials to git:

✅ **DO:**
- Store credentials in `.env` or `.env.test` files (both are gitignored)
- Use environment variables for configuration
- Use the provided `.env.example` and `.env.test.example` as templates
- Rotate credentials regularly

❌ **DON'T:**
- Hardcode credentials in source files
- Commit `.env` or `.env.test` files
- Share credentials in issues or pull requests
- Use production credentials for testing

### Setting Up Credentials Safely

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   XRAY_CLIENT_ID=your_client_id_here
   XRAY_CLIENT_SECRET=your_client_secret_here
   ```

3. Verify `.env` is gitignored:
   ```bash
   git status  # .env should NOT appear
   ```

### For Integration Tests

1. Create test credentials:
   ```bash
   cp .env.test.example .env.test
   ```

2. Use a dedicated test project - **NEVER use production data**

3. Set `XRAY_TEST_PROJECT_KEY` to a test project only

## Protected Files

The following files are protected by `.gitignore` and should NEVER be committed:

- `.env` - Main credentials
- `.env.test` - Test credentials
- `.env.local` - Local overrides
- `.env.*.local` - Any local environment files
- `.claude/settings.local.json` - Local paths and settings
- `node_modules/` - Dependencies
- `dist/` - Build artifacts
- `coverage/` - Test coverage reports

## Dependency Security

We use npm to manage dependencies. To check for vulnerabilities:

```bash
npm audit
npm audit fix  # Fix automatically if possible
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Check the [Releases](https://github.com/yourusername/xray-mcp/releases) page for updates.

## Safe Usage

### In CI/CD Pipelines

Store credentials as secrets:

```yaml
# GitHub Actions example
env:
  XRAY_CLIENT_ID: ${{ secrets.XRAY_CLIENT_ID }}
  XRAY_CLIENT_SECRET: ${{ secrets.XRAY_CLIENT_SECRET }}
```

### In Claude Code

Store credentials in the MCP configuration file, which is local to your machine:

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

## Questions?

If you have security-related questions, please contact the maintainers directly rather than opening a public issue.
