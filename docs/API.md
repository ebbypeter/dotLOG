# API Documentation

## Overview

This document provides detailed API documentation for the dotLOG extension's internal services and interfaces. This is primarily intended for developers contributing to the extension.

## Core Interfaces

### IFileHandler

Base interface for all file type handlers.

```typescript
interface IFileHandler {
  /**
   * Determines if this handler can process the given document
   * @param document The VS Code text document to check
   * @returns True if this handler supports the document type
   */
  canHandle(document: vscode.TextDocument): boolean;

  /**
   * Processes the document by adding a timestamp
   * @param document The VS Code text document to process
   * @param timestamp The formatted timestamp string to insert
   * @returns Promise that resolves when processing is complete
   */
  processDocument(document: vscode.TextDocument, timestamp: string): Promise<void>;
}
```

### IContentAnalyzer

Interface for content analysis service.

```typescript
interface IContentAnalyzer {
  /**
   * Determines if a document should be processed for .LOG functionality
   * @param document The VS Code text document to analyze
   * @returns True if document starts with ".LOG"
   */
  shouldProcessDocument(document: vscode.TextDocument): boolean;

  /**
   * Checks if the document is a log file based on content and type
   * @param document The VS Code text document to check
   * @returns True if document should be treated as a log file
   */
  isLogFile(document: vscode.TextDocument): boolean;
}
```

### ITimestampService

Interface for timestamp generation service.

```typescript
interface ITimestampService {
  /**
   * Generates a timestamp string in the standard format
   * @returns Formatted timestamp string (YYYY-MM-DD HH:MM)
   */
  generateTimestamp(): string;

  /**
   * Formats a specific date into timestamp string
   * @param date The date to format
   * @returns Formatted timestamp string
   */
  formatTimestamp(date: Date): string;
}
```

### IDocumentEditor

Interface for document editing operations.

```typescript
interface IDocumentEditor {
  /**
   * Inserts text at the end of a document
   * @param document The VS Code text document to edit
   * @param text The text to insert
   * @returns Promise<boolean> True if insertion was successful
   */
  insertTextAtEnd(document: vscode.TextDocument, text: string): Promise<boolean>;

  /**
   * Positions the cursor at the end of the document
   * @param document The VS Code text document
   * @returns Promise that resolves when cursor is positioned
   */
  positionCursorAtEnd(document: vscode.TextDocument): Promise<void>;
}
```

### IFileMonitor

Interface for file monitoring service.

```typescript
interface IFileMonitor {
  /**
   * Starts monitoring for document open events
   */
  startMonitoring(): void;

  /**
   * Stops monitoring and cleans up event listeners
   */
  stopMonitoring(): void;

  /**
   * Handles a document opened event
   * @param document The opened VS Code text document
   * @returns Promise that resolves when processing is complete
   */
  onDocumentOpened(document: vscode.TextDocument): Promise<void>;
}
```

## Service Classes

### TimestampService

Generates formatted timestamps for document insertion.

#### Constructor

```typescript
constructor()
```

#### Methods

##### generateTimestamp()

```typescript
public generateTimestamp(): string
```

**Returns:** Current timestamp in "YYYY-MM-DD HH:MM" format

**Example:**

```typescript
const service = new TimestampService();
const timestamp = service.generateTimestamp();
// Returns: "2025-08-08 14:30"
```

##### formatTimestamp(date)

```typescript
public formatTimestamp(date: Date): string
```

**Parameters:**

- `date` - The Date object to format

**Returns:** Formatted timestamp string

**Example:**

```typescript
const service = new TimestampService();
const customDate = new Date('2025-12-25T10:30:00');
const timestamp = service.formatTimestamp(customDate);
// Returns: "2025-12-25 10:30"
```

### ContentAnalyzer

Analyzes document content to determine processing requirements.

#### Constructor

```typescript
constructor()
```

#### Methods

##### shouldProcessDocument(document)

```typescript
public shouldProcessDocument(document: vscode.TextDocument): boolean
```

**Parameters:**

- `document` - VS Code TextDocument to analyze

**Returns:** True if document starts with ".LOG"

**Example:**

```typescript
const analyzer = new ContentAnalyzer();
const shouldProcess = analyzer.shouldProcessDocument(document);
```

##### isLogFile(document)

```typescript
public isLogFile(document: vscode.TextDocument): boolean
```

**Parameters:**

- `document` - VS Code TextDocument to check

**Returns:** True if document is a supported log file type

### DocumentEditor

Handles VS Code document editing operations.

#### Constructor

```typescript
constructor()
```

#### Methods

##### insertTextAtEnd(document, text)

```typescript
public async insertTextAtEnd(document: vscode.TextDocument, text: string): Promise<boolean>
```

**Parameters:**

- `document` - VS Code TextDocument to edit
- `text` - Text to insert at document end

**Returns:** Promise<boolean> - True if insertion successful

**Example:**

```typescript
const editor = new DocumentEditor();
const success = await editor.insertTextAtEnd(document, "\n2025-08-08 14:30\n");
```

##### positionCursorAtEnd(document)

```typescript
public async positionCursorAtEnd(document: vscode.TextDocument): Promise<void>
```

**Parameters:**

- `document` - VS Code TextDocument

**Returns:** Promise that resolves when cursor is positioned

### FileMonitor

Monitors VS Code document events and coordinates processing.

#### Constructor

```typescript
constructor(
  contentAnalyzer: IContentAnalyzer,
  timestampService: ITimestampService,
  handlers: IFileHandler[]
)
```

**Parameters:**

- `contentAnalyzer` - Service for analyzing document content
- `timestampService` - Service for generating timestamps
- `handlers` - Array of file type handlers

#### Methods

##### startMonitoring()

```typescript
public startMonitoring(): void
```

Begins listening to VS Code document open events.

##### stopMonitoring()

```typescript
public stopMonitoring(): void
```

Stops event listening and cleans up resources.

##### onDocumentOpened(document)

```typescript
public async onDocumentOpened(document: vscode.TextDocument): Promise<void>
```

**Parameters:**

- `document` - The opened VS Code TextDocument

**Returns:** Promise that resolves when processing complete

## File Handlers

### BaseFileHandler

Abstract base class for all file handlers.

#### Constructor

```typescript
constructor(
  documentEditor: IDocumentEditor
)
```

#### Abstract Methods

##### canHandle(document)

```typescript
abstract canHandle(document: vscode.TextDocument): boolean
```

Must be implemented by subclasses to determine file type support.

##### formatTimestamp(timestamp)

```typescript
protected abstract formatTimestamp(timestamp: string): string
```

Must be implemented by subclasses to format timestamps appropriately.

#### Concrete Methods

##### processDocument(document, timestamp)

```typescript
public async processDocument(document: vscode.TextDocument, timestamp: string): Promise<void>
```

Processes the document by inserting a formatted timestamp.

### TextFileHandler

Handles .txt files with plain text timestamp formatting.

#### Constructor

```typescript
constructor(documentEditor: IDocumentEditor)
```

#### Methods

##### canHandle(document)

```typescript
public canHandle(document: vscode.TextDocument): boolean
```

**Returns:** True for .txt files

##### formatTimestamp(timestamp)

```typescript
protected formatTimestamp(timestamp: string): string
```

**Returns:** Plain text timestamp with newlines

**Example Output:**

```
2025-08-08 14:30
```

### LogFileHandler

Handles .log files with plain text timestamp formatting.

#### Constructor

```typescript
constructor(documentEditor: IDocumentEditor)
```

#### Methods

##### canHandle(document)

```typescript
public canHandle(document: vscode.TextDocument): boolean
```

**Returns:** True for .log files

##### formatTimestamp(timestamp)

```typescript
protected formatTimestamp(timestamp: string): string
```

**Returns:** Plain text timestamp with newlines (identical to TextFileHandler)

### MarkdownFileHandler

Handles .md files with markdown heading timestamp formatting.

#### Constructor

```typescript
constructor(documentEditor: IDocumentEditor)
```

#### Methods

##### canHandle(document)

```typescript
public canHandle(document: vscode.TextDocument): boolean
```

**Returns:** True for .md files

##### formatTimestamp(timestamp)

```typescript
protected formatTimestamp(timestamp: string): string
```

**Returns:** Markdown heading 2 formatted timestamp

**Example Output:**

```
## 2025-08-08 14:30
```

## Error Handling

### Error Types

The extension handles several types of errors gracefully:

#### DocumentEditError

Thrown when document editing operations fail.

```typescript
class DocumentEditError extends Error {
  constructor(message: string, public readonly document: vscode.TextDocument) {
    super(message);
  }
}
```

#### UnsupportedFileTypeError

Thrown when attempting to process unsupported file types.

```typescript
class UnsupportedFileTypeError extends Error {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`);
  }
}
```

### Error Recovery

All services implement graceful error recovery:

1. **Log Error**: Record error details for debugging
2. **Continue Operation**: Don't interrupt user workflow
3. **Cleanup Resources**: Ensure no resource leaks
4. **User Notification**: Only for critical errors (rare)

## Extension Lifecycle

### Activation

```typescript
export function activate(context: vscode.ExtensionContext): void
```

Called when extension is activated. Initializes all services and registers event listeners.

### Deactivation

```typescript
export function deactivate(): void
```

Called when extension is deactivated. Cleans up resources and stops monitoring.

## Usage Examples

### Basic Service Usage

```typescript
// Initialize services
const timestampService = new TimestampService();
const contentAnalyzer = new ContentAnalyzer();
const documentEditor = new DocumentEditor();

// Create handlers
const textHandler = new TextFileHandler(documentEditor);
const logHandler = new LogFileHandler(documentEditor);
const markdownHandler = new MarkdownFileHandler(documentEditor);

// Initialize file monitor
const fileMonitor = new FileMonitor(
  contentAnalyzer,
  timestampService,
  [textHandler, logHandler, markdownHandler]
);

// Start monitoring
fileMonitor.startMonitoring();
```

### Custom Handler Implementation

```typescript
class CustomFileHandler extends BaseFileHandler {
  public canHandle(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith('.custom');
  }

  protected formatTimestamp(timestamp: string): string {
    return `[${timestamp}] `;
  }
}
```

## Performance Considerations

### Timing Requirements

- Document processing must complete within 100ms
- Event handling should be non-blocking
- Memory usage should be minimal

### Optimization Strategies

- Early exit for non-.LOG files
- Lazy service initialization
- Efficient string operations
- Proper resource cleanup

## Testing APIs

### Test Utilities

The extension provides test utilities for easier testing:

```typescript
// Test helper functions
export function createMockDocument(content: string, fileName: string): vscode.TextDocument;
export function createMockEditor(): vscode.TextEditor;
export function waitForProcessing(): Promise<void>;
```

### Mock Services

Mock implementations are available for testing:

```typescript
export class MockTimestampService implements ITimestampService {
  generateTimestamp(): string {
    return "2025-08-08 14:30";
  }
}
```
