import * as assert from 'assert';
import * as vscode from 'vscode';
import { ErrorRecoveryService } from '../../services/errorRecovery';
import { ErrorCode, OperationResult, ProcessingResult, ProcessingState } from '../../types';

// Mock VS Code TextDocument
class MockTextDocument implements vscode.TextDocument {
  uri: vscode.Uri;
  fileName: string;
  isUntitled: boolean = false;
  languageId: string = 'plaintext';
  version: number = 1;
  isDirty: boolean = false;
  isClosed: boolean = false;
  eol: vscode.EndOfLine = vscode.EndOfLine.LF;
  lineCount: number = 1;
  encoding: string = 'utf8';

  constructor(fileName: string, closed: boolean = false) {
    this.fileName = fileName;
    this.uri = vscode.Uri.file(fileName);
    this.isClosed = closed;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  lineAt(line: number): vscode.TextLine;
  lineAt(position: vscode.Position): vscode.TextLine;
  lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
    const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
    const text = '.LOG';

    return {
      lineNumber,
      text,
      range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: false
    };
  }

  offsetAt(position: vscode.Position): number {
    return 0;
  }

  positionAt(offset: number): vscode.Position {
    return new vscode.Position(0, 0);
  }

  getText(range?: vscode.Range): string {
    return '.LOG';
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
}

suite('ErrorRecoveryService Tests', () => {
  let recoveryService: ErrorRecoveryService;
  let mockDocument: MockTextDocument;

  setup(() => {
    recoveryService = ErrorRecoveryService.getInstance();
    mockDocument = new MockTextDocument('test.txt');
  });

  teardown(() => {
    recoveryService.dispose();
  });

  suite('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = ErrorRecoveryService.getInstance();
      const instance2 = ErrorRecoveryService.getInstance();

      assert.strictEqual(instance1, instance2);
    });

    test('should create new instance after dispose', () => {
      const instance1 = ErrorRecoveryService.getInstance();
      instance1.dispose();

      const instance2 = ErrorRecoveryService.getInstance();
      assert.notStrictEqual(instance1, instance2);
    });
  });

  suite('Document Modification Recovery', () => {
    test('should succeed on first retry attempt', async () => {
      let attemptCount = 0;
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        attemptCount++;
        return {
          success: true,
          data: true
        };
      };

      const result = await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Initial failure'),
        retryFunction
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
      assert.strictEqual(attemptCount, 1);
    });

    test('should retry multiple times before succeeding', async () => {
      let attemptCount = 0;
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            success: false,
            error: `Attempt ${attemptCount} failed`
          };
        }
        return {
          success: true,
          data: true
        };
      };

      const result = await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Initial failure'),
        retryFunction
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
      assert.strictEqual(attemptCount, 3);
    });

    test('should fail after maximum retry attempts', async () => {
      let attemptCount = 0;
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        attemptCount++;
        return {
          success: false,
          error: `Attempt ${attemptCount} failed`
        };
      };

      const result = await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Initial failure'),
        retryFunction
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.DOCUMENT_MODIFICATION_FAILED);
      assert.strictEqual(attemptCount, 3); // Maximum retries
      assert.strictEqual(result.error?.includes('Maximum retry attempts'), true);
    });

    test('should fail immediately if document is closed', async () => {
      const closedDocument = new MockTextDocument('closed.txt', true);

      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        return { success: true, data: true };
      };

      const result = await recoveryService.recoverFromDocumentModificationFailure(
        closedDocument,
        'testOperation',
        new Error('Initial failure'),
        retryFunction
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.DOCUMENT_MODIFICATION_FAILED);
      assert.strictEqual(result.error?.includes('Document was closed'), true);
    });

    test('should handle exceptions in retry function', async () => {
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        throw new Error('Retry function exception');
      };

      const result = await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Initial failure'),
        retryFunction
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.DOCUMENT_MODIFICATION_FAILED);
      assert.strictEqual(result.error?.includes('Recovery attempt failed'), true);
    });
  });

  suite('Permission Error Recovery', () => {
    test('should provide recovery suggestions for existing file', async () => {
      // Create a temporary file for testing
      const testUri = vscode.Uri.file('test-permission.txt');

      try {
        // Create the file
        await vscode.workspace.fs.writeFile(testUri, Buffer.from('test content'));

        const result = await recoveryService.recoverFromPermissionError(
          testUri.fsPath,
          'writeFile'
        );

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data?.includes('permission'), true);

        // Clean up
        await vscode.workspace.fs.delete(testUri);
      } catch (error) {
        // If file operations fail in test environment, verify error handling
        const result = await recoveryService.recoverFromPermissionError(
          'nonexistent-file.txt',
          'writeFile'
        );

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.errorCode, ErrorCode.FILE_READ_ERROR);
      }
    });

    test('should handle non-existent files gracefully', async () => {
      const result = await recoveryService.recoverFromPermissionError(
        'definitely-does-not-exist.txt',
        'readFile'
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.FILE_READ_ERROR);
      assert.strictEqual(result.error?.includes('Cannot access file'), true);
    });
  });

  suite('Graceful Failure Handling', () => {
    test('should handle graceful timestamp failure', () => {
      const timestamp = '2025-01-08 14:30';
      const originalError = new Error('Insert failed');

      const result = recoveryService.gracefulTimestampFailure(
        mockDocument,
        timestamp,
        originalError
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.documentModified, false);
      assert.strictEqual(result.processingState, ProcessingState.FAILED);
      assert.strictEqual(result.timestamp, timestamp);
      assert.strictEqual(result.error?.includes('Could not insert timestamp'), true);
    });

    test('should handle graceful cursor positioning failure', () => {
      const originalError = new Error('Cursor positioning failed');

      const result = recoveryService.gracefulCursorPositioningFailure(
        mockDocument,
        originalError
      );

      // Cursor positioning failure is not critical - timestamp was still inserted
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.errorCode, ErrorCode.CURSOR_POSITIONING_FAILED);
      assert.strictEqual(result.error?.includes('Cursor positioning failed'), true);
    });
  });

  suite('Retry History Management', () => {
    test('should track retry attempts per document and operation', async () => {
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        return { success: false, error: 'Always fails' };
      };

      // First operation
      await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'operation1',
        new Error('Error 1'),
        retryFunction
      );

      // Second operation on same document
      await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'operation2',
        new Error('Error 2'),
        retryFunction
      );

      const stats = recoveryService.getRetryStatistics();
      const keys = Object.keys(stats);

      assert.strictEqual(keys.length, 2);
      assert.strictEqual(keys.some(key => key.includes('operation1')), true);
      assert.strictEqual(keys.some(key => key.includes('operation2')), true);
    });

    test('should clear retry history for specific document', async () => {
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        return { success: false, error: 'Always fails' };
      };

      await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Test error'),
        retryFunction
      );

      let stats = recoveryService.getRetryStatistics();
      assert.strictEqual(Object.keys(stats).length > 0, true);

      recoveryService.clearRetryHistory(mockDocument);

      stats = recoveryService.getRetryStatistics();
      const documentKeys = Object.keys(stats).filter(key =>
        key.includes(mockDocument.uri.toString())
      );
      assert.strictEqual(documentKeys.length, 0);
    });

    test('should provide retry statistics', async () => {
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        return { success: false, error: 'Always fails' };
      };

      await recoveryService.recoverFromDocumentModificationFailure(
        mockDocument,
        'testOperation',
        new Error('Test error'),
        retryFunction
      );

      const stats = recoveryService.getRetryStatistics();
      const keys = Object.keys(stats);

      assert.strictEqual(keys.length > 0, true);
      assert.strictEqual(keys.some(key => key.includes('testOperation')), true);
      assert.strictEqual(stats[keys[0]], 3); // Maximum retry attempts
    });
  });

  suite('Error Scenarios', () => {
    test('should handle dispose gracefully', () => {
      assert.doesNotThrow(() => {
        recoveryService.dispose();
      });

      // Should be able to get a new instance after dispose
      const newService = ErrorRecoveryService.getInstance();
      assert.notStrictEqual(newService, recoveryService);
    });

    test('should handle concurrent recovery attempts', async () => {
      let attemptCount = 0;
      const retryFunction = async (): Promise<OperationResult<boolean>> => {
        attemptCount++;
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        return { success: true, data: true };
      };

      // Start multiple recovery attempts concurrently
      const promises = [
        recoveryService.recoverFromDocumentModificationFailure(
          mockDocument,
          'concurrent1',
          new Error('Error 1'),
          retryFunction
        ),
        recoveryService.recoverFromDocumentModificationFailure(
          mockDocument,
          'concurrent2',
          new Error('Error 2'),
          retryFunction
        )
      ];

      const results = await Promise.all(promises);

      // Both should succeed
      assert.strictEqual(results[0].success, true);
      assert.strictEqual(results[1].success, true);
      assert.strictEqual(attemptCount, 2);
    });
  });
});