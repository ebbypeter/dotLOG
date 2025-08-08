import * as assert from 'assert';
import * as vscode from 'vscode';
import { ErrorLogger } from '../../services/errorLogger';
import { ErrorCode, LogLevel } from '../../types';

suite('ErrorLogger Tests', () => {
  let errorLogger: ErrorLogger;

  setup(() => {
    errorLogger = ErrorLogger.getInstance();
    errorLogger.clearHistory();
  });

  teardown(() => {
    errorLogger.dispose();
  });

  suite('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();

      assert.strictEqual(instance1, instance2);
    });

    test('should create new instance after dispose', () => {
      const instance1 = ErrorLogger.getInstance();
      instance1.dispose();

      const instance2 = ErrorLogger.getInstance();
      assert.notStrictEqual(instance1, instance2);
    });
  });

  suite('Log Level Management', () => {
    test('should set and respect log levels', () => {
      errorLogger.setLogLevel(LogLevel.ERROR);

      // These should not be logged (below ERROR level)
      errorLogger.logDebug('Debug message');
      errorLogger.logInfo('Info message');
      errorLogger.logWarning('Warning message');

      // This should be logged
      errorLogger.logError('Error message');

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].message, 'Error message');
    });

    test('should log all levels when set to DEBUG', () => {
      errorLogger.setLogLevel(LogLevel.DEBUG);

      errorLogger.logDebug('Debug message');
      errorLogger.logInfo('Info message');
      errorLogger.logWarning('Warning message');
      errorLogger.logError('Error message');

      // Only errors are stored in history
      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].message, 'Error message');
    });
  });

  suite('Error Logging', () => {
    test('should log error with context and error code', () => {
      const context = { fileName: 'test.txt', operation: 'insert' };
      const error = new Error('Test error');

      errorLogger.logError(error, context, ErrorCode.DOCUMENT_MODIFICATION_FAILED);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].message, 'Test error');
      assert.strictEqual(history[0].code, ErrorCode.DOCUMENT_MODIFICATION_FAILED);
      assert.deepStrictEqual(history[0].context, context);
    });

    test('should log string error messages', () => {
      const errorMessage = 'String error message';

      errorLogger.logError(errorMessage);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].message, errorMessage);
      assert.strictEqual(history[0].code, ErrorCode.UNKNOWN_ERROR);
    });

    test('should handle error logging without context', () => {
      const error = new Error('No context error');

      errorLogger.logError(error);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].message, 'No context error');
      assert.deepStrictEqual(history[0].context, {});
    });
  });

  suite('Permission Error Logging', () => {
    test('should log permission errors with specific context', () => {
      const operation = 'writeFile';
      const filePath = '/path/to/file.txt';
      const originalError = new Error('Access denied');

      errorLogger.logPermissionError(operation, filePath, originalError);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].code, ErrorCode.PERMISSION_DENIED);
      assert.strictEqual(history[0].context?.operation, operation);
      assert.strictEqual(history[0].context?.filePath, filePath);
      assert.strictEqual(history[0].context?.originalError, originalError.message);
    });

    test('should log permission errors without original error', () => {
      const operation = 'readFile';
      const filePath = '/path/to/readonly.txt';

      errorLogger.logPermissionError(operation, filePath);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].code, ErrorCode.PERMISSION_DENIED);
      assert.strictEqual(history[0].context?.originalError, undefined);
    });
  });

  suite('Document Modification Error Logging', () => {
    test('should log document modification errors with recovery info', () => {
      const filePath = '/path/to/document.txt';
      const operation = 'insertText';
      const originalError = new Error('Edit failed');
      const recoveryAttempted = true;

      errorLogger.logDocumentModificationError(filePath, operation, originalError, recoveryAttempted);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].code, ErrorCode.DOCUMENT_MODIFICATION_FAILED);
      assert.strictEqual(history[0].context?.filePath, filePath);
      assert.strictEqual(history[0].context?.operation, operation);
      assert.strictEqual(history[0].context?.recoveryAttempted, recoveryAttempted);
    });

    test('should log document modification errors without recovery', () => {
      const filePath = '/path/to/document.txt';
      const operation = 'insertText';
      const originalError = new Error('Edit failed');

      errorLogger.logDocumentModificationError(filePath, operation, originalError);

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].context?.recoveryAttempted, false);
    });
  });

  suite('Error History Management', () => {
    test('should maintain error history up to maximum size', () => {
      // Add more errors than the maximum history size (100)
      for (let i = 0; i < 150; i++) {
        errorLogger.logError(`Error ${i}`);
      }

      const history = errorLogger.getRecentErrors(150);
      assert.strictEqual(history.length, 100); // Should be capped at max size

      // Should contain the most recent errors
      assert.strictEqual(history[99].message, 'Error 149');
      assert.strictEqual(history[0].message, 'Error 50');
    });

    test('should return recent errors with specified count', () => {
      for (let i = 0; i < 10; i++) {
        errorLogger.logError(`Error ${i}`);
      }

      const recentErrors = errorLogger.getRecentErrors(5);
      assert.strictEqual(recentErrors.length, 5);
      assert.strictEqual(recentErrors[4].message, 'Error 9');
      assert.strictEqual(recentErrors[0].message, 'Error 5');
    });

    test('should clear error history', () => {
      errorLogger.logError('Test error 1');
      errorLogger.logError('Test error 2');

      assert.strictEqual(errorLogger.getRecentErrors().length, 2);

      errorLogger.clearHistory();

      assert.strictEqual(errorLogger.getRecentErrors().length, 0);
    });
  });

  suite('Warning and Info Logging', () => {
    test('should log warnings with context', () => {
      const message = 'Warning message';
      const context = { component: 'test' };

      errorLogger.logWarning(message, context);

      // Warnings are not stored in error history, but should not throw
      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 0);
    });

    test('should log info messages with context', () => {
      const message = 'Info message';
      const context = { operation: 'test' };

      errorLogger.logInfo(message, context);

      // Info messages are not stored in error history, but should not throw
      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 0);
    });

    test('should log debug messages with context', () => {
      const message = 'Debug message';
      const context = { debug: true };

      errorLogger.logDebug(message, context);

      // Debug messages are not stored in error history, but should not throw
      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 0);
    });
  });

  suite('Output Channel Management', () => {
    test('should show output channel', () => {
      // This test verifies the method exists and doesn't throw
      assert.doesNotThrow(() => {
        errorLogger.showOutput();
      });
    });

    test('should handle dispose gracefully', () => {
      errorLogger.logError('Test error before dispose');

      assert.doesNotThrow(() => {
        errorLogger.dispose();
      });

      // Should be able to get a new instance after dispose
      const newLogger = ErrorLogger.getInstance();
      assert.notStrictEqual(newLogger, errorLogger);
    });
  });

  suite('Error Scenarios', () => {
    test('should handle logging when output channel is null', () => {
      // Dispose to clear output channel
      errorLogger.dispose();

      // Get new instance and try logging
      const newLogger = ErrorLogger.getInstance();

      assert.doesNotThrow(() => {
        newLogger.logError('Test error with null output channel');
      });
    });

    test('should handle complex context objects', () => {
      const complexContext = {
        nested: {
          object: {
            with: 'deep nesting'
          }
        },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
        booleanValue: true
      };

      assert.doesNotThrow(() => {
        errorLogger.logError('Complex context error', complexContext);
      });

      const history = errorLogger.getRecentErrors();
      assert.strictEqual(history.length, 1);
      assert.deepStrictEqual(history[0].context, complexContext);
    });
  });
});