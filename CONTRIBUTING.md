# Contributing to Xray MCP Server

Thank you for your interest in contributing to the Xray MCP Server project! 🎉

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists in the [Issues](https://github.com/yourusername/xray-mcp/issues) section
2. If not, create a new issue with:
   - A clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Your environment details (Node.js version, OS, etc.)

### Pull Requests

We welcome pull requests! Here's how to contribute code:

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/xray-mcp.git
   cd xray-mcp
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Keep all code, comments, and strings in English
   - Add tests for new features

6. **Run tests**
   ```bash
   npm run test:unit
   npm run build
   ```

7. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: description of your changes"
   ```

8. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template with details

## Development Guidelines

### Code Style

- Use TypeScript for all code
- Follow the existing code structure
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and modular

### Testing

- Write unit tests for all new features
- Ensure all tests pass before submitting PR
- Aim for high test coverage
- Mock external API calls in unit tests

### Commit Messages

Use clear, descriptive commit messages:
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for improvements to existing features
- `Remove:` for removing code or features
- `Docs:` for documentation changes

Example:
```
Add: support for Test Plans management
Fix: authentication token expiry calculation
Update: improve error handling in GraphQL requests
```

### Security

- **NEVER** commit credentials or sensitive data
- Use environment variables for configuration
- Review `.gitignore` before committing
- Check for exposed secrets before pushing

## Project Structure

```
xray-mcp/
├── src/
│   ├── index.ts          # MCP server implementation
│   └── xray-client.ts    # Xray Cloud API client
├── tests/
│   ├── unit/            # Unit tests (mocked)
│   └── integration/     # Integration tests (real API)
├── dist/                # Compiled output (not committed)
└── docs/               # Documentation
```

## Testing Your Changes

### Unit Tests (Fast, No Credentials)
```bash
npm run test:unit
```

### Integration Tests (Requires Xray Credentials)
```bash
# Create .env.test with your credentials
cp .env.test.example .env.test
# Edit .env.test with real credentials
npm run test:integration
```

### Build and Type Check
```bash
npm run build
```

## Areas for Contribution

Here are some areas where contributions are especially welcome:

1. **New Features**
   - Test Steps management
   - Pre-conditions support
   - Requirements tracking
   - Bulk operations

2. **Improvements**
   - Better error messages
   - Performance optimizations
   - Documentation improvements
   - Additional test coverage

3. **Bug Fixes**
   - Check the [Issues](https://github.com/yourusername/xray-mcp/issues) for open bugs

## Questions?

If you have questions about contributing:
- Open a [Discussion](https://github.com/yourusername/xray-mcp/discussions)
- Check existing [Issues](https://github.com/yourusername/xray-mcp/issues)
- Review the [README.md](./README.md) and [TESTING.md](./TESTING.md)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the project

Thank you for contributing! 🚀
