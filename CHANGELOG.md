# Changelog

All notable changes to the dotLOG extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Configuration options for timestamp format
- Support for additional file types
- Custom timestamp prefixes

## [0.0.1] - 2025-08-08

### Added

- Initial release of dotLOG extension
- Automatic timestamp insertion for files starting with ".LOG"
- Support for .txt, .log, and .md file types
- Smart formatting based on file type:
  - Plain text timestamps for .txt and .log files
  - Markdown heading format (##) for .md files
- Performance optimized processing (< 100ms)
- Graceful error handling for read-only files
- Comprehensive test suite with unit and integration tests
- VS Code extension architecture with modular services:
  - File monitoring service
  - Content analyzer
  - Timestamp service
  - File type handlers
  - Document editor service
- Event-driven processing using VS Code's onDidOpenTextDocument
- Cursor positioning after timestamp insertion
- Non-intrusive operation (only processes .LOG files)

### Technical Details

- Built with TypeScript
- Uses VS Code Extension API 1.100.0+
- Modular architecture with separation of concerns
- Comprehensive error logging
- Memory efficient with lazy loading
- Asynchronous processing to avoid UI blocking

### Testing

- Unit tests for all core services
- Integration tests for end-to-end workflows
- Performance tests to verify < 100ms requirement
- Error scenario testing
- Multi-file type testing

---

## Version History Format

### [Version] - Date

#### Added

- New features

#### Changed

- Changes in existing functionality

#### Deprecated

- Soon-to-be removed features

#### Removed

- Removed features

#### Fixed

- Bug fixes

#### Security

- Security improvements
