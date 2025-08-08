# Contributing to dotLOG

Thank you for your interest in contributing to dotLOG! This document provides guidelines and information for developers who want to contribute to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- VS Code 1.100.0 or higher
- Git

### Initial Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/ebbypeter/dotLOG.git
   cd dotLOG
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Compile TypeScript**

   ```bash
   npm run compile
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

5. **Launch Development Environment**
   - Open the project in VS Code
   - Press `F5` to launch Extension Development Host
   - Test the extension in the new window

### Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linting
npm run lint

# Run tests
npm test

# Package extension
npm run package
```

## Project Structure

```
dotLOG/
├── src/                          # Source code
│   ├── extension.ts             # Main extension entry point
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   ├── services/                # Core services
│   │   ├── contentAnalyzer.ts   # Content analysis logic
│   │   ├── documentEditor.ts    # Document editing operations
│   │   ├── errorLogger.ts       # Error logging service
│   │   ├── errorRecovery.ts     # Error recovery mechanisms
│   │   ├── fileMonitor.ts       # File monitoring service
│   │   ├── timestampService.ts  # Timestamp generation
│   │   └── index.ts
│   ├── handlers/                # File type handlers
│   │   ├── baseFileHandler.ts   # Base handler interface
│   │   ├── logFileHandler.ts    # .log file handler
│   │   ├── markdownFileHandler.ts # .md file handler
│   │   ├── textFileHandler.ts   # .txt file handler
│   │   └── index.ts
│   └── test/                    # Test files
│       ├── fixtures/            # Test data files
│       ├── suite/              # Test suites
│       └── runTest.ts          # Test runner
├── out/                         # Compiled JavaScript
├── docs/                        # Documentation
├── package.json                 # Extension manifest
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
└── README.md                   # Main documentation
```

## Architecture Overview

The dotLOG extension follows a modular architecture with clear separation of concerns:

### Core Components

1. **Extension Entry Point** (`extension.ts`)
   - Manages extension lifecycle
   - Registers event listeners
   - Initializes services

2. **File Monitor Service** (`fileMonitor.ts`)
   - Listens to VS Code document events
   - Filters events for supported file types
   - Coordinates processing pipeline

3. **Content Analyzer** (`contentAnalyzer.ts`)
   - Analyzes document content
   - Determines if .LOG processing is needed
   - Validates file type support

4. **Timestamp Service** (`timestampService.ts`)
   - Generates formatted timestamps
   - Provides consistent "YYYY-MM-DD HH:MM" format

5. **File Type Handlers** (`handlers/`)
   - Handle file-specific formatting
   - Implement the IFileHandler interface
   - Support .txt, .log, and .md files

6. **Document Editor Service** (`documentEditor.ts`)
   - Handles VS Code document editing
   - Manages cursor positioning
   - Provides error handling for edit operations

### Design Principles

- **Single Responsibility**: Each service has a focused purpose
- **Dependency Injection**: Services are loosely coupled
- **Error Handling**: Graceful failure without user interruption
- **Performance**: Minimal impact on VS Code performance
- **Testability**: All components are unit testable

## Development Workflow

### Adding New Features

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Tests First** (TDD approach)
   - Add test cases in appropriate test files
   - Run tests to ensure they fail initially
   - Implement feature to make tests pass

3. **Implement Feature**
   - Follow existing code patterns
   - Add appropriate error handling
   - Update type definitions if needed

4. **Update Documentation**
   - Update README.md if user-facing
   - Add/update code comments
   - Update CHANGELOG.md

5. **Test Thoroughly**

   ```bash
   npm test
   npm run lint
   ```

### Adding New File Type Support

1. **Create Handler Class**

   ```typescript
   // src/handlers/newFileHandler.ts
   export class NewFileHandler extends BaseFileHandler {
     canHandle(document: vscode.TextDocument): boolean {
       return document.fileName.endsWith('.newext');
     }
     
     async processDocument(document: vscode.TextDocument, timestamp: string): Promise<void> {
       // Implementation
     }
   }
   ```

2. **Register Handler**

   ```typescript
   // src/handlers/index.ts
   export { NewFileHandler } from './newFileHandler';
   ```

3. **Add Tests**

   ```typescript
   // src/test/suite/newFileHandler.test.ts
   ```

4. **Update Documentation**
   - Add to supported file types in README.md
   - Update CHANGELOG.md

## Testing

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Performance Tests**: Verify < 100ms processing requirement

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "ContentAnalyzer"

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

Follow existing test patterns:

```typescript
import * as assert from 'assert';
import { TimestampService } from '../../services/timestampService';

suite('TimestampService', () => {
  let service: TimestampService;

  setup(() => {
    service = new TimestampService();
  });

  test('should generate timestamp in correct format', () => {
    const timestamp = service.generateTimestamp();
    assert.match(timestamp, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
```

### Test Coverage

Aim for sensibly high test coverage:

- All public methods should have tests
- Error scenarios should be tested
- Edge cases should be covered

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Formatting

- Use ESLint configuration provided
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline structures

### Example Code Style

```typescript
/**
 * Analyzes document content to determine processing requirements
 */
export class ContentAnalyzer implements IContentAnalyzer {
  /**
   * Checks if document should be processed for .LOG functionality
   * @param document The VS Code text document to analyze
   * @returns True if document starts with ".LOG"
   */
  public shouldProcessDocument(document: vscode.TextDocument): boolean {
    if (document.lineCount === 0) {
      return false;
    }
    
    const firstLine = document.lineAt(0).text.trim();
    return firstLine === '.LOG';
  }
}
```

## Submitting Changes

### Pull Request Process

1. **Ensure Quality**
   - All tests pass
   - Code follows style guidelines
   - Documentation is updated

2. **Create Pull Request**
   - Use descriptive title
   - Include detailed description
   - Reference related issues

3. **Pull Request Template**

   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   ```

### Commit Message Format

Use a developer-focused commit format that clearly describes what was built:

```text
Brief summary: what was implemented/changed

Detailed description of the implementation including:
- Core functionality added/modified
- Architecture changes or new components
- Technical details relevant to other developers

Additional context:
- Build/test changes
- Dependencies added/removed
- Performance considerations
```

**Examples:**

```text
feat: configure esbuild bundling and optimize extension packaging

- Add esbuild for fast extension bundling with minification
- Create comprehensive npm scripts for dev/prod builds and packaging
- Optimize .vscodeignore to exclude dev files from VSIX package
- Add custom build.js script with size reporting and watch mode
- Reduce package size from ~31KB to ~12KB through bundling
- Maintain test compatibility with separate compilation pipeline

Implements task 12: Set up build and packaging configuration
Requirements: 5.1, 5.2
```

```text
fix: handle timezone edge cases in timestamp generation

- Update TimestampService to use UTC for consistent timestamps
- Add timezone offset handling for local time display
- Fix edge case where midnight timestamps showed incorrect date
- Add unit tests for timezone boundary conditions

Fixes issue with timestamps showing wrong date near midnight
```

**Guidelines:**

- Start with action verb (feat, fix, refactor, docs, test, etc.)
- Focus on what was built, not marketing features
- Use technical terms developers would understand
- Include architecture/implementation details in body
- Reference tasks, issues, or requirements when applicable

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update Version**

   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**
   - Move unreleased items to new version section
   - Add release date

3. **Create Release**

   ```bash
   npm run package
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **Publish to Marketplace**

   ```bash
   vsce publish
   ```

## Getting Help

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Code Review**: Request reviews from maintainers

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow project guidelines

Thank you for contributing to dotLOG! 🚀
