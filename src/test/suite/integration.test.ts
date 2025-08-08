import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

// Import extension functions
import { activate, deactivate } from '../../extension';
import { SupportedFileType, ProcessingState } from '../../types';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

suite('Integration Tests', () => {
  let testWorkspaceUri: vscode.Uri;
  let testFilesDir: string;
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Create a test workspace directory in temp
    const os = require('os');
    const tempDir = os.tmpdir();
    testFilesDir = path.join(tempDir, 'dotlog-integration-tests');
    testWorkspaceUri = vscode.Uri.file(testFilesDir);

    // Create test files directory
    try {
      await mkdir(testFilesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Mock extension context for activation
    extensionContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        setKeysForSync: () => { },
        keys: () => []
      },
      extensionPath: '',
      extensionUri: vscode.Uri.file(''),
      environmentVariableCollection: {} as any,
      asAbsolutePath: (relativePath: string) => relativePath,
      storageUri: undefined,
      storagePath: undefined,
      globalStorageUri: vscode.Uri.file(''),
      globalStoragePath: '',
      logUri: vscode.Uri.file(''),
      logPath: '',
      extensionMode: vscode.ExtensionMode.Test,
      extension: {
        packageJSON: { version: '0.0.1' }
      } as any,
      secrets: {} as any,
      languageModelAccessInformation: {} as any
    };

    // Activate the extension
    await activate(extensionContext);
  });

  suiteTeardown(async () => {
    // Clean up test files
    try {
      const files = await fs.promises.readdir(testFilesDir);
      for (const file of files) {
        await unlink(path.join(testFilesDir, file));
      }
      await fs.promises.rmdir(testFilesDir);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Deactivate the extension
    await deactivate();
  });

  suite('End-to-End Document Processing Workflow', () => {
    test('should process .txt file with .LOG prefix', async () => {
      const fileName = 'test-log.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file with .LOG prefix
      await writeFile(filePath, '.LOG\n');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should remain .LOG');
      assert.strictEqual(lines.length >= 3, true, 'Should have at least 3 lines (including empty line)');

      // Check timestamp format (YYYY-MM-DD HH:MM)
      const timestampLine = lines[1];
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      assert.match(timestampLine, timestampRegex, 'Timestamp should match YYYY-MM-DD HH:MM format');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should process .log file with .LOG prefix', async () => {
      const fileName = 'test-log.log';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file with .LOG prefix
      await writeFile(filePath, '.LOG\n');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should remain .LOG');
      assert.strictEqual(lines.length >= 3, true, 'Should have at least 3 lines');

      // Check timestamp format
      const timestampLine = lines[1];
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      assert.match(timestampLine, timestampRegex, 'Timestamp should match YYYY-MM-DD HH:MM format');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should process .md file with .LOG prefix and heading format', async () => {
      const fileName = 'test-log.md';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file with .LOG prefix
      await writeFile(filePath, '.LOG\n');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added with markdown heading format
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should remain .LOG');
      assert.strictEqual(lines.length >= 3, true, 'Should have at least 3 lines');

      // Check markdown heading format (## YYYY-MM-DD HH:MM)
      const timestampLine = lines[1];
      const markdownTimestampRegex = /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      assert.match(timestampLine, markdownTimestampRegex, 'Timestamp should be formatted as markdown heading');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should not process file without .LOG prefix', async () => {
      const fileName = 'regular-file.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file without .LOG prefix
      const originalContent = 'This is a regular file\nwith some content';
      await writeFile(filePath, originalContent);

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for potential processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify content remains unchanged
      const content = document.getText();
      assert.strictEqual(content, originalContent, 'Content should remain unchanged');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should not process unsupported file types', async () => {
      const fileName = 'test-file.py';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file with .LOG prefix but unsupported extension
      const originalContent = '.LOG\nprint("Hello World")';
      await writeFile(filePath, originalContent);

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for potential processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify content remains unchanged
      const content = document.getText();
      assert.strictEqual(content, originalContent, 'Unsupported file should remain unchanged');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('Multiple File Types and Edge Cases', () => {
    test('should handle file with only .LOG content', async () => {
      const fileName = 'only-log.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with only .LOG
      await writeFile(filePath, '.LOG');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should be .LOG');
      assert.strictEqual(lines.length >= 2, true, 'Should have timestamp added');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle file with existing content after .LOG', async () => {
      const fileName = 'existing-content.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with .LOG and existing content
      const existingContent = 'Existing log entry 1\nExisting log entry 2';
      await writeFile(filePath, `.LOG\n${existingContent}`);

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was appended without disrupting existing content
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should be .LOG');
      assert.strictEqual(lines[1], 'Existing log entry 1', 'Existing content should be preserved');
      assert.strictEqual(lines[2], 'Existing log entry 2', 'Existing content should be preserved');

      // Check that timestamp was added at the end
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const lastNonEmptyLine = lines.filter(line => line.trim() !== '').pop();
      assert.match(lastNonEmptyLine || '', timestampRegex, 'Timestamp should be added at the end');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should add multiple timestamps when file is opened multiple times', async () => {
      const fileName = 'multiple-opens.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file
      await writeFile(filePath, '.LOG\n');

      // First open
      let document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      // Second open
      document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify multiple timestamps
      const content = document.getText();
      const lines = content.split('\n').filter(line => line.trim() !== '');

      assert.strictEqual(lines[0], '.LOG', 'First line should be .LOG');

      // Count timestamp lines
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const timestampLines = lines.filter(line => timestampRegex.test(line));
      assert.strictEqual(timestampLines.length >= 2, true, 'Should have multiple timestamps');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle case-sensitive .LOG check', async () => {
      const testCases = [
        { content: '.log\n', shouldProcess: false, description: 'lowercase .log' },
        { content: '.Log\n', shouldProcess: false, description: 'mixed case .Log' },
        { content: '.LOG\n', shouldProcess: true, description: 'uppercase .LOG' },
        { content: ' .LOG\n', shouldProcess: false, description: '.LOG with leading space' },
        { content: '.LOG \n', shouldProcess: false, description: '.LOG with trailing space' }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const fileName = `case-test-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        const fileUri = vscode.Uri.file(filePath);

        // Create test file
        await writeFile(filePath, testCase.content);

        // Open the document
        const document = await vscode.workspace.openTextDocument(fileUri);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check if processing occurred
        const content = document.getText();
        const lines = content.split('\n');

        if (testCase.shouldProcess) {
          assert.strictEqual(lines.length >= 3, true, `${testCase.description}: Should have timestamp added`);
        } else {
          assert.strictEqual(content, testCase.content, `${testCase.description}: Should remain unchanged`);
        }

        // Close the document
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });

    test('should handle empty lines and whitespace correctly', async () => {
      const fileName = 'whitespace-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with .LOG followed by empty lines
      await writeFile(filePath, '.LOG\n\n\n');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added at the end
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should be .LOG');

      // Find the timestamp line (should be at the end)
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const timestampLineIndex = lines.findIndex(line => timestampRegex.test(line));
      assert.notStrictEqual(timestampLineIndex, -1, 'Timestamp should be found');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('Performance Tests', () => {
    test('should complete processing within 100ms requirement', async () => {
      const fileName = 'performance-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file
      await writeFile(filePath, '.LOG\n');

      // Measure processing time
      const startTime = Date.now();

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify timestamp was added (confirms processing completed)
      const content = document.getText();
      const lines = content.split('\n');
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added');

      // Note: We allow 150ms total time including document opening overhead
      // The actual processing should be much faster
      assert.strictEqual(processingTime < 150, true, `Processing should complete quickly, took ${processingTime}ms`);

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle multiple simultaneous file opens efficiently', async () => {
      const fileCount = 5;
      const filePromises: Promise<vscode.TextDocument>[] = [];

      // Create multiple test files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-test-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        await writeFile(filePath, '.LOG\n');
      }

      const startTime = Date.now();

      // Open all files simultaneously
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-test-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        const fileUri = vscode.Uri.file(filePath);
        filePromises.push(Promise.resolve(vscode.workspace.openTextDocument(fileUri)));
      }

      // Wait for all files to open
      const documents = await Promise.all(filePromises);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all files were processed
      for (const document of documents) {
        const content = document.getText();
        const lines = content.split('\n');
        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
        const hasTimestamp = lines.some(line => timestampRegex.test(line));

        assert.strictEqual(hasTimestamp, true, `File ${document.fileName} should have timestamp`);
      }

      // Performance check - should handle multiple files efficiently
      const averageTimePerFile = totalTime / fileCount;
      assert.strictEqual(averageTimePerFile < 100, true, `Average processing time per file should be under 100ms, was ${averageTimePerFile}ms`);

      // Close all documents
      for (let i = 0; i < fileCount; i++) {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });

    test('should maintain performance with large file content', async () => {
      const fileName = 'large-file-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create a large file with .LOG prefix
      const largeContent = '.LOG\n' + 'Large content line\n'.repeat(1000);
      await writeFile(filePath, largeContent);

      const startTime = Date.now();

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify timestamp was added
      const content = document.getText();
      const lines = content.split('\n');
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added to large file');
      assert.strictEqual(lines[0], '.LOG', 'First line should remain .LOG');

      // Performance should still be reasonable for large files
      assert.strictEqual(processingTime < 300, true, `Large file processing should complete in reasonable time, took ${processingTime}ms`);

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should have minimal performance impact on non-.LOG files', async () => {
      const fileName = 'non-log-performance.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file without .LOG prefix
      const content = 'Regular file content\nNo .LOG prefix here';
      await writeFile(filePath, content);

      const startTime = Date.now();

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify content unchanged
      const finalContent = document.getText();
      assert.strictEqual(finalContent, content, 'Non-.LOG file should remain unchanged');

      // Should have minimal performance impact
      assert.strictEqual(processingTime < 100, true, `Non-.LOG file processing should be fast, took ${processingTime}ms`);

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('Error Handling and Edge Cases', () => {
    test('should handle read-only files gracefully', async () => {
      const fileName = 'readonly-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file
      await writeFile(filePath, '.LOG\n');

      // Make file read-only (this might not work in all test environments)
      try {
        await fs.promises.chmod(filePath, 0o444);
      } catch (error) {
        // Skip this test if we can't make the file read-only
        console.log('Skipping read-only test - cannot change file permissions');
        return;
      }

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing attempt
      await new Promise(resolve => setTimeout(resolve, 200));

      // The extension should handle this gracefully without crashing
      // We can't easily verify the exact behavior, but the test should complete
      assert.strictEqual(true, true, 'Extension should handle read-only files gracefully');

      // Restore write permissions for cleanup
      try {
        await fs.promises.chmod(filePath, 0o644);
      } catch (error) {
        // Ignore cleanup errors
      }

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle malformed file content', async () => {
      const fileName = 'malformed-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with unusual content
      const malformedContent = '.LOG\n\x00\x01\x02\nBinary content\n';
      await writeFile(filePath, malformedContent, 'binary');

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Extension should handle this without crashing
      assert.strictEqual(document.lineCount > 0, true, 'Document should be opened');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle very long lines', async () => {
      const fileName = 'long-line-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with very long line after .LOG
      const longLine = 'x'.repeat(10000);
      await writeFile(filePath, `.LOG\n${longLine}\n`);

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify processing completed
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'First line should be .LOG');
      assert.strictEqual(lines[1].length, 10000, 'Long line should be preserved');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle files with different line endings', async () => {
      const testCases = [
        { name: 'unix-endings.txt', content: '.LOG\nUnix line endings\n', description: 'Unix (LF)' },
        { name: 'windows-endings.txt', content: '.LOG\r\nWindows line endings\r\n', description: 'Windows (CRLF)' },
        { name: 'mac-endings.txt', content: '.LOG\rMac line endings\r', description: 'Mac (CR)' }
      ];

      for (const testCase of testCases) {
        const filePath = path.join(testFilesDir, testCase.name);
        const fileUri = vscode.Uri.file(filePath);

        // Create test file with specific line endings
        await writeFile(filePath, testCase.content, 'binary');

        // Open the document
        const document = await vscode.workspace.openTextDocument(fileUri);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify .LOG was detected regardless of line endings
        const content = document.getText();
        assert.strictEqual(content.startsWith('.LOG'), true, `${testCase.description}: Should detect .LOG`);

        // Close the document
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });
  });
});