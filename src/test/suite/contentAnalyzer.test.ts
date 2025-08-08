import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContentAnalyzer } from '../../services/contentAnalyzer';
import { SupportedFileType, ProcessingState, ErrorCode } from '../../types';

suite('ContentAnalyzer Test Suite', () => {
  let contentAnalyzer: ContentAnalyzer;

  setup(() => {
    contentAnalyzer = new ContentAnalyzer();
  });

  suite('shouldProcessDocument', () => {
    test('should return true for .txt file starting with .LOG', async () => {
      const mockDocument = createMockDocument('.LOG\nSome content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should return true for .log file starting with .LOG', async () => {
      const mockDocument = createMockDocument('.LOG\nSome content', 'test.log', 'log');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should return true for .md file starting with .LOG', async () => {
      const mockDocument = createMockDocument('.LOG\n# Some content', 'test.md', 'markdown');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should return false for file not starting with .LOG', async () => {
      const mockDocument = createMockDocument('Some content\nMore content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should return false for unsupported file type', async () => {
      const mockDocument = createMockDocument('.LOG\nSome content', 'test.js', 'javascript');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should return false for empty document', async () => {
      const mockDocument = createMockDocument('', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should handle .LOG with whitespace correctly', async () => {
      const mockDocument = createMockDocument('  .LOG  \nSome content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should be case sensitive for .LOG prefix', async () => {
      const mockDocument = createMockDocument('.log\nSome content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should handle .LOG as only content', async () => {
      const mockDocument = createMockDocument('.LOG', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });
  });

  suite('isLogFile', () => {
    test('should return true when document starts with .LOG', async () => {
      const mockDocument = createMockDocument('.LOG\nSome content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.isLogFile(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should return false when document does not start with .LOG', async () => {
      const mockDocument = createMockDocument('Some content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.isLogFile(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should return false for empty document', async () => {
      const mockDocument = createMockDocument('', 'test.txt', 'plaintext');
      const result = contentAnalyzer.isLogFile(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should handle whitespace around .LOG', async () => {
      const mockDocument = createMockDocument('  .LOG  ', 'test.txt', 'plaintext');
      const result = contentAnalyzer.isLogFile(mockDocument);
      assert.strictEqual(result, true);
    });
  });

  suite('getFileType', () => {
    test('should return TEXT for .txt extension', async () => {
      const mockDocument = createMockDocument('content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.TEXT);
    });

    test('should return LOG for .log extension', async () => {
      const mockDocument = createMockDocument('content', 'test.log', 'log');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.LOG);
    });

    test('should return MARKDOWN for .md extension', async () => {
      const mockDocument = createMockDocument('content', 'test.md', 'markdown');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.MARKDOWN);
    });

    test('should return null for unsupported extension', async () => {
      const mockDocument = createMockDocument('content', 'test.js', 'javascript');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, null);
    });

    test('should handle case insensitive extensions', async () => {
      const mockDocument = createMockDocument('content', 'test.TXT', 'plaintext');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.TEXT);
    });

    test('should fallback to language ID when extension detection fails', async () => {
      const mockDocument = createMockDocument('content', 'untitled', 'plaintext');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.TEXT);
    });

    test('should handle files without extension', async () => {
      const mockDocument = createMockDocument('content', 'README', 'markdown');
      const result = contentAnalyzer.getFileType(mockDocument);
      assert.strictEqual(result, SupportedFileType.MARKDOWN);
    });
  });

  suite('analyzeContent', () => {
    test('should return successful analysis for supported file with .LOG', async () => {
      const mockDocument = createMockDocument('.LOG\nContent', 'test.txt', 'plaintext');
      const result = contentAnalyzer.analyzeContent(mockDocument);

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.fileType, SupportedFileType.TEXT);
      assert.strictEqual(result.data.shouldProcess, true);
      assert.strictEqual(result.data.processingState, ProcessingState.NOT_STARTED);
      assert.strictEqual(result.data.document, mockDocument);
    });

    test('should return successful analysis for supported file without .LOG', async () => {
      const mockDocument = createMockDocument('Content', 'test.txt', 'plaintext');
      const result = contentAnalyzer.analyzeContent(mockDocument);

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.fileType, SupportedFileType.TEXT);
      assert.strictEqual(result.data.shouldProcess, false);
      assert.strictEqual(result.data.processingState, ProcessingState.SKIPPED);
    });

    test('should return error for unsupported file type', async () => {
      const mockDocument = createMockDocument('.LOG\nContent', 'test.js', 'javascript');
      const result = contentAnalyzer.analyzeContent(mockDocument);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.UNSUPPORTED_FILE_TYPE);
      assert.ok(result.error);
    });

    test('should handle markdown files correctly', async () => {
      const mockDocument = createMockDocument('.LOG\n# Header', 'test.md', 'markdown');
      const result = contentAnalyzer.analyzeContent(mockDocument);

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.fileType, SupportedFileType.MARKDOWN);
      assert.strictEqual(result.data.shouldProcess, true);
    });

    test('should handle log files correctly', async () => {
      const mockDocument = createMockDocument('.LOG\n2025-01-01 Log entry', 'test.log', 'log');
      const result = contentAnalyzer.analyzeContent(mockDocument);

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.fileType, SupportedFileType.LOG);
      assert.strictEqual(result.data.shouldProcess, true);
    });
  });

  suite('Static methods', () => {
    test('getLogPrefix should return .LOG', () => {
      const prefix = ContentAnalyzer.getLogPrefix();
      assert.strictEqual(prefix, '.LOG');
    });

    test('getSupportedExtensions should return correct extensions', () => {
      const extensions = ContentAnalyzer.getSupportedExtensions();
      assert.ok(extensions.has('txt'));
      assert.ok(extensions.has('log'));
      assert.ok(extensions.has('md'));
      assert.strictEqual(extensions.size, 3);
    });
  });

  suite('Edge cases', () => {
    test('should handle document with only .LOG and no newline', async () => {
      const mockDocument = createMockDocument('.LOG', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should handle document with .LOG followed by spaces', async () => {
      const mockDocument = createMockDocument('.LOG   ', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should not process .LOG in middle of line', async () => {
      const mockDocument = createMockDocument('prefix .LOG suffix', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should not process .LOG on second line', async () => {
      const mockDocument = createMockDocument('First line\n.LOG', 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });

    test('should handle very long first line with .LOG only', async () => {
      const longContent = '.LOG' + ' '.repeat(1000);
      const mockDocument = createMockDocument(longContent, 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, true);
    });

    test('should not process .LOG with additional content on same line', async () => {
      const longContent = '.LOG' + ' '.repeat(1000) + 'end';
      const mockDocument = createMockDocument(longContent, 'test.txt', 'plaintext');
      const result = contentAnalyzer.shouldProcessDocument(mockDocument);
      assert.strictEqual(result, false);
    });
  });
});

/**
 * Helper function to create mock VS Code TextDocument
 */
function createMockDocument(content: string, fileName: string, languageId: string): vscode.TextDocument {
  const lines = content.split('\n');

  return {
    fileName,
    languageId,
    lineCount: Math.max(lines.length, content === '' ? 0 : 1),
    getText: () => content,
    lineAt: (lineOrPosition: number | vscode.Position) => {
      const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
      return {
        text: lines[lineNumber] || '',
        lineNumber: lineNumber,
        range: new vscode.Range(lineNumber, 0, lineNumber, (lines[lineNumber] || '').length),
        rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: (lines[lineNumber] || '').trim().length === 0
      };
    },
    uri: vscode.Uri.file(fileName),
    version: 1,
    isDirty: false,
    isClosed: false,
    save: async () => true,
    eol: vscode.EndOfLine.LF,
    isUntitled: false,
    encoding: 'utf8',
    getWordRangeAtPosition: () => undefined,
    validateRange: (range: vscode.Range) => range,
    validatePosition: (position: vscode.Position) => position,
    offsetAt: () => 0,
    positionAt: () => new vscode.Position(0, 0)
  } as vscode.TextDocument;
}