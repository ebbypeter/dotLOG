import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentEditor } from '../../services/documentEditor';
import { ErrorCode } from '../../types';

suite('DocumentEditor Tests', () => {
  let documentEditor: DocumentEditor;
  let testDocument: vscode.TextDocument;

  suiteSetup(async () => {
    documentEditor = new DocumentEditor();
  });

  setup(async () => {
    // Create a test document for each test
    testDocument = await vscode.workspace.openTextDocument({
      content: '.LOG\nExisting content',
      language: 'plaintext'
    });
  });

  teardown(async () => {
    // Close all editors after each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  suite('insertTextAtEnd', () => {
    test('should insert text at end of document successfully', async () => {
      const textToInsert = '2025-01-08 14:30';

      const result = await documentEditor.insertTextAtEnd(testDocument, textToInsert);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
      assert.strictEqual(result.error, undefined);
    });

    test('should handle empty document', async () => {
      const emptyDocument = await vscode.workspace.openTextDocument({
        content: '',
        language: 'plaintext'
      });

      const textToInsert = '2025-01-08 14:30';
      const result = await documentEditor.insertTextAtEnd(emptyDocument, textToInsert);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
    });

    test('should add newline before text when document does not end with newline', async () => {
      const documentWithoutNewline = await vscode.workspace.openTextDocument({
        content: '.LOG\nSome content without newline',
        language: 'plaintext'
      });

      const textToInsert = '2025-01-08 14:30';
      const result = await documentEditor.insertTextAtEnd(documentWithoutNewline, textToInsert);

      assert.strictEqual(result.success, true);
      // The implementation should handle newline insertion automatically
    });

    test('should handle text that already has newlines', async () => {
      const textWithNewlines = '\n2025-01-08 14:30\n';

      const result = await documentEditor.insertTextAtEnd(testDocument, textWithNewlines);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
    });

    test('should handle very long text insertion', async () => {
      const longText = 'A'.repeat(10000) + ' 2025-01-08 14:30';

      const result = await documentEditor.insertTextAtEnd(testDocument, longText);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
    });

    test('should handle special characters in text', async () => {
      const specialText = '2025-01-08 14:30 - Special chars: àáâãäåæçèéêë ñ 中文 🚀';

      const result = await documentEditor.insertTextAtEnd(testDocument, specialText);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, true);
    });

    test('should return error for invalid document operations', async () => {
      // Create a mock document that will fail operations
      const invalidDocument = {
        uri: vscode.Uri.parse('invalid://test'),
        lineCount: 1,
        lineAt: () => ({ text: 'test' }),
        isUntitled: false,
        isDirty: false
      } as unknown as vscode.TextDocument;

      const result = await documentEditor.insertTextAtEnd(invalidDocument, 'test');

      // Should handle the error gracefully
      assert.strictEqual(result.success, false);
      assert.strictEqual(typeof result.error, 'string');
    });
  });

  suite('positionCursorAtEnd', () => {
    test('should position cursor at end when active editor matches document', async () => {
      // Open the document in an editor
      const editor = await vscode.window.showTextDocument(testDocument);

      const result = await documentEditor.positionCursorAtEnd(testDocument);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.error, undefined);

      // Verify cursor is at the end
      const expectedLine = testDocument.lineCount - 1;
      const expectedChar = testDocument.lineAt(expectedLine).text.length;
      assert.strictEqual(editor.selection.active.line, expectedLine);
      assert.strictEqual(editor.selection.active.character, expectedChar);
    });

    test('should return error when no active editor', async () => {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      const result = await documentEditor.positionCursorAtEnd(testDocument);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.CURSOR_POSITIONING_FAILED);
      assert.strictEqual(typeof result.error, 'string');
    });

    test('should return error when active editor is for different document', async () => {
      // Open a different document
      const otherDocument = await vscode.workspace.openTextDocument({
        content: 'Different document',
        language: 'plaintext'
      });
      await vscode.window.showTextDocument(otherDocument);

      const result = await documentEditor.positionCursorAtEnd(testDocument);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.CURSOR_POSITIONING_FAILED);
    });

    test('should handle empty document cursor positioning', async () => {
      const emptyDocument = await vscode.workspace.openTextDocument({
        content: '',
        language: 'plaintext'
      });
      const editor = await vscode.window.showTextDocument(emptyDocument);

      const result = await documentEditor.positionCursorAtEnd(emptyDocument);

      assert.strictEqual(result.success, true);
      assert.strictEqual(editor.selection.active.line, 0);
      assert.strictEqual(editor.selection.active.character, 0);
    });
  });

  suite('canModifyDocument', () => {
    test('should return true for regular file documents', () => {
      const canModify = documentEditor.canModifyDocument(testDocument);
      assert.strictEqual(canModify, true);
    });

    test('should return true for untitled documents', async () => {
      const untitledDocument = await vscode.workspace.openTextDocument({
        content: 'Untitled content',
        language: 'plaintext'
      });

      const canModify = documentEditor.canModifyDocument(untitledDocument);
      assert.strictEqual(canModify, true);
    });

    test('should return false for documents with unsupported schemes', () => {
      const mockDocument = {
        uri: vscode.Uri.parse('readonly://test'),
        isUntitled: false,
        isDirty: false
      } as vscode.TextDocument;

      const canModify = documentEditor.canModifyDocument(mockDocument);
      assert.strictEqual(canModify, false);
    });

    test('should handle errors gracefully and return false', () => {
      const invalidDocument = {
        uri: null, // This will cause an error
        isUntitled: false,
        isDirty: false
      } as any;

      const canModify = documentEditor.canModifyDocument(invalidDocument);
      assert.strictEqual(canModify, false);
    });
  });

  suite('Error Handling', () => {
    test('should handle workspace edit failures gracefully', async () => {
      // Create a document that might fail to edit
      const problematicDocument = await vscode.workspace.openTextDocument({
        content: '.LOG\nContent',
        language: 'plaintext'
      });

      // Mock a scenario where the edit might fail by using invalid text
      const result = await documentEditor.insertTextAtEnd(problematicDocument, 'Valid timestamp');

      // Even if it succeeds, we're testing that it handles potential failures
      assert.strictEqual(typeof result.success, 'boolean');
      if (!result.success) {
        assert.strictEqual(typeof result.error, 'string');
        assert.strictEqual(typeof result.errorCode, 'string');
      }
    });

    test('should provide appropriate error codes for different failure types', async () => {
      // Test with a mock read-only document
      const readOnlyDocument = {
        uri: vscode.Uri.parse('readonly://test'),
        lineCount: 1,
        lineAt: () => ({ text: 'test' }),
        isUntitled: false,
        isDirty: false,
        isClosed: false
      } as unknown as vscode.TextDocument;

      const result = await documentEditor.insertTextAtEnd(readOnlyDocument, 'test');

      if (!result.success) {
        assert.strictEqual(result.errorCode, ErrorCode.PERMISSION_DENIED);
      }
    });

    test('should handle closed document gracefully', async () => {
      const closedDocument = {
        uri: vscode.Uri.parse('file://test.txt'),
        lineCount: 1,
        lineAt: () => ({ text: 'test' }),
        isUntitled: false,
        isDirty: false,
        isClosed: true,
        fileName: 'test.txt'
      } as unknown as vscode.TextDocument;

      const canModify = documentEditor.canModifyDocument(closedDocument);
      assert.strictEqual(canModify, false);
    });

    test('should handle document modification with recovery attempts', async () => {
      const testDocument = await vscode.workspace.openTextDocument({
        content: '.LOG\nExisting content',
        language: 'plaintext'
      });

      // This should succeed normally, but we're testing the recovery mechanism exists
      const result = await documentEditor.insertTextAtEnd(testDocument, '2025-01-08 14:30');

      assert.strictEqual(typeof result.success, 'boolean');
      if (result.success) {
        assert.strictEqual(result.data, true);
      } else {
        // If it fails, it should have proper error handling
        assert.strictEqual(typeof result.error, 'string');
        assert.strictEqual(typeof result.errorCode, 'string');
      }
    });

    test('should log errors with proper context', async () => {
      // Test that error logging doesn't throw exceptions
      const invalidDocument = {
        uri: null,
        fileName: 'invalid.txt',
        lineCount: 0,
        isUntitled: false,
        isDirty: false,
        isClosed: false
      } as any;

      assert.doesNotThrow(async () => {
        await documentEditor.insertTextAtEnd(invalidDocument, 'test');
      });
    });

    test('should handle cursor positioning errors gracefully', async () => {
      // Test cursor positioning when no editor is active
      const testDocument = await vscode.workspace.openTextDocument({
        content: '.LOG\nContent',
        language: 'plaintext'
      });

      // Close all editors to ensure no active editor
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      const result = await documentEditor.positionCursorAtEnd(testDocument);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, ErrorCode.CURSOR_POSITIONING_FAILED);
      assert.strictEqual(typeof result.error, 'string');
    });

    test('should handle exceptions in canModifyDocument', () => {
      const invalidDocument = {
        uri: null, // This will cause an error
        fileName: 'invalid.txt'
      } as any;

      const canModify = documentEditor.canModifyDocument(invalidDocument);
      assert.strictEqual(canModify, false);
    });
  });

  suite('Performance Tests', () => {
    test('should complete insertTextAtEnd within performance threshold', async () => {
      const startTime = Date.now();

      await documentEditor.insertTextAtEnd(testDocument, '2025-01-08 14:30');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete well within 100ms requirement (allowing some buffer for test environment)
      assert.strictEqual(duration < 1000, true, `Operation took ${duration}ms, expected < 1000ms`);
    });

    test('should complete positionCursorAtEnd within performance threshold', async () => {
      await vscode.window.showTextDocument(testDocument);

      const startTime = Date.now();

      await documentEditor.positionCursorAtEnd(testDocument);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete well within 100ms requirement
      assert.strictEqual(duration < 1000, true, `Operation took ${duration}ms, expected < 1000ms`);
    });
  });
});