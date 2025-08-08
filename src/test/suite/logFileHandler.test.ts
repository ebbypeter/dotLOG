import * as assert from 'assert';
import * as vscode from 'vscode';
import { LogFileHandler } from '../../handlers/logFileHandler';
import { SupportedFileType, IDocumentEditor, OperationResult } from '../../types';

// Mock document editor for testing
class MockDocumentEditor implements IDocumentEditor {
  private canModify: boolean = true;
  private insertSuccess: boolean = true;
  private positionSuccess: boolean = true;

  setCanModify(canModify: boolean): void {
    this.canModify = canModify;
  }

  setInsertSuccess(success: boolean): void {
    this.insertSuccess = success;
  }

  setPositionSuccess(success: boolean): void {
    this.positionSuccess = success;
  }

  canModifyDocument(document: vscode.TextDocument): boolean {
    return this.canModify;
  }

  async insertTextAtEnd(document: vscode.TextDocument, text: string): Promise<OperationResult<boolean>> {
    return {
      success: this.insertSuccess,
      data: this.insertSuccess,
      error: this.insertSuccess ? undefined : 'Mock insert error'
    };
  }

  async positionCursorAtEnd(document: vscode.TextDocument): Promise<OperationResult<void>> {
    return {
      success: this.positionSuccess,
      error: this.positionSuccess ? undefined : 'Mock cursor error'
    };
  }
}

// Mock text document for testing
class MockTextDocument implements vscode.TextDocument {
  constructor(
    public fileName: string,
    public languageId: string = 'log',
    private lines: string[] = ['.LOG']
  ) { }

  get encoding(): string {
    return 'utf8';
  }

  get uri(): vscode.Uri {
    return vscode.Uri.file(this.fileName);
  }

  get version(): number {
    return 1;
  }

  get isDirty(): boolean {
    return false;
  }

  get isClosed(): boolean {
    return false;
  }

  get isUntitled(): boolean {
    return false;
  }

  get eol(): vscode.EndOfLine {
    return vscode.EndOfLine.LF;
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineAt(line: number): vscode.TextLine;
  lineAt(position: vscode.Position): vscode.TextLine;
  lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
    const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
    const text = this.lines[lineNumber] || '';
    return {
      lineNumber,
      text,
      range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0
    };
  }

  offsetAt(position: vscode.Position): number {
    return 0;
  }

  positionAt(offset: number): vscode.Position {
    return new vscode.Position(0, 0);
  }

  getText(range?: vscode.Range): string {
    return this.lines.join('\n');
  }

  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined {
    return undefined;
  }

  validateRange(range: vscode.Range): vscode.Range {
    return range;
  }

  validatePosition(position: vscode.Position): vscode.Position {
    return position;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }
}

suite('LogFileHandler Tests', () => {
  let handler: LogFileHandler;
  let mockEditor: MockDocumentEditor;

  setup(() => {
    mockEditor = new MockDocumentEditor();
    handler = new LogFileHandler(mockEditor);
  });

  suite('canHandle', () => {
    test('should return true for .log file with .LOG prefix', () => {
      const document = new MockTextDocument('test.log', 'log', ['.LOG']);
      assert.strictEqual(handler.canHandle(document), true);
    });

    test('should return false for .log file without .LOG prefix', () => {
      const document = new MockTextDocument('test.log', 'log', ['Some log content']);
      assert.strictEqual(handler.canHandle(document), false);
    });

    test('should return false for non-.log file even with .LOG prefix', () => {
      const document = new MockTextDocument('test.txt', 'plaintext', ['.LOG']);
      assert.strictEqual(handler.canHandle(document), false);
    });

    test('should return false for empty .log file', () => {
      const document = new MockTextDocument('test.log', 'log', []);
      assert.strictEqual(handler.canHandle(document), false);
    });

    test('should return false for .log file with .LOG not as first line', () => {
      const document = new MockTextDocument('test.log', 'log', ['Some content', '.LOG']);
      assert.strictEqual(handler.canHandle(document), false);
    });

    test('should handle .log files with uppercase extension', () => {
      const document = new MockTextDocument('test.LOG', 'log', ['.LOG']);
      assert.strictEqual(handler.canHandle(document), true);
    });
  });

  suite('getFileType', () => {
    test('should return SupportedFileType.LOG', () => {
      assert.strictEqual(handler.getFileType(), SupportedFileType.LOG);
    });
  });

  suite('formatTimestamp', () => {
    test('should format timestamp with newlines for log files', () => {
      const timestamp = '2025-08-08 14:30';
      const formatted = handler.formatTimestamp(timestamp);
      assert.strictEqual(formatted, '\n2025-08-08 14:30\n');
    });

    test('should handle empty timestamp', () => {
      const formatted = handler.formatTimestamp('');
      assert.strictEqual(formatted, '\n\n');
    });

    test('should preserve timestamp content exactly', () => {
      const timestamp = '2025-12-25 23:59';
      const formatted = handler.formatTimestamp(timestamp);
      assert.strictEqual(formatted, '\n2025-12-25 23:59\n');
    });

    test('should format identically to text file handler', () => {
      const timestamp = '2025-08-08 14:30';
      const formatted = handler.formatTimestamp(timestamp);
      // Log files use same plain text format as text files
      assert.strictEqual(formatted, '\n2025-08-08 14:30\n');
    });
  });

  suite('processDocument', () => {
    test('should successfully process log document with valid timestamp', async () => {
      const document = new MockTextDocument('test.log', 'log', ['.LOG']);
      const timestamp = '2025-08-08 14:30';

      const result = await handler.processDocument(document, timestamp);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.documentModified, true);
      assert.strictEqual(result.timestamp, '\n2025-08-08 14:30\n');
    });

    test('should fail when document cannot be modified', async () => {
      mockEditor.setCanModify(false);
      const document = new MockTextDocument('test.log', 'log', ['.LOG']);
      const timestamp = '2025-08-08 14:30';

      const result = await handler.processDocument(document, timestamp);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.documentModified, false);
      assert.ok(result.error?.includes('read-only'));
    });

    test('should fail when text insertion fails', async () => {
      mockEditor.setInsertSuccess(false);
      const document = new MockTextDocument('test.log', 'log', ['.LOG']);
      const timestamp = '2025-08-08 14:30';

      const result = await handler.processDocument(document, timestamp);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.documentModified, false);
      assert.ok(result.error);
    });

    test('should succeed even when cursor positioning fails', async () => {
      mockEditor.setPositionSuccess(false);
      const document = new MockTextDocument('test.log', 'log', ['.LOG']);
      const timestamp = '2025-08-08 14:30';

      const result = await handler.processDocument(document, timestamp);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.documentModified, true);
    });

    test('should handle log files with existing content', async () => {
      const document = new MockTextDocument('test.log', 'log', ['.LOG', 'Previous log entry', 'Another entry']);
      const timestamp = '2025-08-08 14:30';

      const result = await handler.processDocument(document, timestamp);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.documentModified, true);
      assert.strictEqual(result.timestamp, '\n2025-08-08 14:30\n');
    });
  });
});