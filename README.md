# dotLOG

A VS Code extension that replicates Windows Notepad's .LOG functionality. Automatically append timestamps to files that begin with ".LOG" for easy chronological logging.

## Features

- **Automatic Timestamping**: When you open a file that starts with ".LOG", the extension automatically appends the current date and time
- **Multiple File Types**: Supports .txt, .log, and .md files
- **Smart Formatting**:
  - Plain text timestamps for .txt and .log files
  - Markdown heading format (##) for .md files
- **Non-intrusive**: Only processes files that explicitly start with ".LOG"
- **Performance Optimized**: Minimal impact on VS Code performance (< 100ms processing time)
- **Error Handling**: Graceful handling of read-only files and permission errors

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "dotLOG"
4. Click Install

### Manual Installation

1. Download the latest `.vsix` file from the releases page
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

### Development Installation

```bash
git clone https://github.com/ebbypeter/dotLOG.git
cd dotLOG
npm install
npm run compile
```

Then press F5 to launch a new Extension Development Host window.

## Usage

### Basic Usage

1. Create a new file or open an existing file
2. Type `.LOG` as the very first line of the file (case-sensitive, all caps)
3. Save the file
4. Close and reopen the file
5. The extension will automatically append a timestamp in "YYYY-MM-DD HH:MM" format
6. Your cursor will be positioned after the timestamp for immediate typing

### Example

**Before opening (sample.txt):**

```
.LOG
Meeting notes from yesterday
```

**After opening:**

```
.LOG
Meeting notes from yesterday

2025-08-08 14:30
```

### File Type Specific Formatting

#### Text Files (.txt) and Log Files (.log)

Timestamps are appended as plain text:

```
.LOG
Previous content...

2025-08-08 14:30
```

#### Markdown Files (.md)

Timestamps are formatted as level 2 headings:

```
.LOG
Previous content...

## 2025-08-08 14:30
```

## Supported File Types

- `.txt` - Plain text files
- `.log` - Log files  
- `.md` - Markdown files

Files with other extensions will not be processed, even if they start with ".LOG".

## Requirements

- VS Code 1.100.0 or higher
- No additional dependencies required

## Configuration

This extension works automatically without any configuration. There are no settings to configure.

## Troubleshooting

### Timestamps Not Being Added

1. **Check the first line**: Ensure the file starts with exactly `.LOG` (case-sensitive, all caps)
2. **Verify file type**: Only .txt, .log, and .md files are supported
3. **File permissions**: Ensure the file is not read-only
4. **Reopen the file**: The timestamp is added when the file is opened, not saved

### Performance Issues

The extension is designed to have minimal performance impact:

- Processing completes within 100ms
- Only files starting with ".LOG" are processed
- No background processing when files don't match criteria

### Error Handling

The extension handles errors gracefully:

- Read-only files: Silently skipped, no error messages
- Permission errors: Logged to console, no user interruption
- Invalid file types: Ignored without processing

## Known Limitations

- Only processes files when they are opened, not when saved
- Requires exact ".LOG" format (case-sensitive)
- Limited to three file types (.txt, .log, .md)
- Timestamps use local system time

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Report issues: [GitHub Issues](https://github.com/ebbypeter/dotLOG/issues)
- Feature requests: [GitHub Discussions](https://github.com/ebbypeter/dotLOG/discussions)

## Acknowledgments

Inspired by the classic Windows Notepad .LOG functionality that has helped users maintain simple chronological logs for decades.
