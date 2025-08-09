import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

// Import extension functions
import { activate, deactivate } from '../../extension';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

suite('Performance Tests', () => {
  let testWorkspaceUri: vscode.Uri;
  let testFilesDir: string;
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Create a test workspace directory in temp
    const os = require('os');
    const tempDir = os.tmpdir();
    testFilesDir = path.join(tempDir, 'dotlog-performance-tests');
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

  suite('100ms Processing Requirement', () => {
    test('should process small .LOG file within 100ms', async () => {
      const fileName = 'small-perf-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create small test file
      await writeFile(filePath, '.LOG\nSmall file content\n');

      // Measure processing time with high precision
      const startTime = process.hrtime.bigint();

      // Open the document (this triggers the processing)
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = process.hrtime.bigint();
      const processingTimeNs = endTime - startTime;
      const processingTimeMs = Number(processingTimeNs) / 1_000_000;

      // Verify timestamp was added (confirms processing completed)
      const content = document.getText();
      const lines = content.split('\n');
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added');

      // Check 100ms requirement (allowing some overhead for document opening)
      console.log(`Small file processing time: ${processingTimeMs.toFixed(2)}ms`);
      assert.strictEqual(processingTimeMs < 100, true, `Processing should complete within 100ms, took ${processingTimeMs.toFixed(2)}ms`);

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should process medium .LOG file within 100ms', async () => {
      const fileName = 'medium-perf-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create medium test file (100 lines)
      const content = '.LOG\n' + Array(100).fill('Medium file content line').join('\n') + '\n';
      await writeFile(filePath, content);

      const startTime = process.hrtime.bigint();

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1_000_000;

      // Verify processing completed
      const finalContent = document.getText();
      const lines = finalContent.split('\n');
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added');

      console.log(`Medium file processing time: ${processingTimeMs.toFixed(2)}ms`);
      assert.strictEqual(processingTimeMs < 100, true, `Medium file processing should complete within 100ms, took ${processingTimeMs.toFixed(2)}ms`);

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should process large .LOG file within reasonable time', async () => {
      const fileName = 'large-perf-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create large test file (1000 lines)
      const content = '.LOG\n' + Array(1000).fill('Large file content line with more text to make it realistic').join('\n') + '\n';
      await writeFile(filePath, content);

      const startTime = process.hrtime.bigint();

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1_000_000;

      // Verify processing completed
      const finalContent = document.getText();
      const lines = finalContent.split('\n');
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added');

      console.log(`Large file processing time: ${processingTimeMs.toFixed(2)}ms`);
      // Allow more time for large files, but should still be reasonable
      assert.strictEqual(processingTimeMs < 200, true, `Large file processing should complete within 200ms, took ${processingTimeMs.toFixed(2)}ms`);

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should have minimal overhead for non-.LOG files', async () => {
      const fileName = 'non-log-perf-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file without .LOG prefix
      const content = 'Regular file content\nNo processing needed\n';
      await writeFile(filePath, content);

      const startTime = process.hrtime.bigint();

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 20));

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1_000_000;

      // Verify content unchanged
      const finalContent = document.getText();
      assert.strictEqual(finalContent, content, 'Non-.LOG file should remain unchanged');

      console.log(`Non-.LOG file processing time: ${processingTimeMs.toFixed(2)}ms`);
      // Should have very minimal overhead
      assert.strictEqual(processingTimeMs < 50, true, `Non-.LOG file processing should have minimal overhead, took ${processingTimeMs.toFixed(2)}ms`);

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('Concurrent Processing Performance', () => {
    test('should handle multiple .LOG files concurrently within time limits', async () => {
      const fileCount = 10;
      const filePromises: Promise<vscode.TextDocument>[] = [];

      // Create multiple test files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-perf-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        await writeFile(filePath, `.LOG\nConcurrent test file ${i}\n`);
      }

      const startTime = process.hrtime.bigint();

      // Open all files simultaneously
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-perf-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        const fileUri = vscode.Uri.file(filePath);
        filePromises.push(Promise.resolve(vscode.workspace.openTextDocument(fileUri)));
      }

      // Wait for all files to open
      const documents = await Promise.all(filePromises);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;

      // Verify all files were processed
      for (const document of documents) {
        const content = document.getText();
        const lines = content.split('\n');
        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
        const hasTimestamp = lines.some(line => timestampRegex.test(line));

        assert.strictEqual(hasTimestamp, true, `File ${document.fileName} should have timestamp`);
      }

      // Performance check
      const averageTimePerFile = totalTimeMs / fileCount;
      console.log(`Concurrent processing: ${totalTimeMs.toFixed(2)}ms total, ${averageTimePerFile.toFixed(2)}ms average per file`);

      assert.strictEqual(averageTimePerFile < 50, true, `Average processing time per file should be under 50ms, was ${averageTimePerFile.toFixed(2)}ms`);
      assert.strictEqual(totalTimeMs < 500, true, `Total concurrent processing should complete within 500ms, took ${totalTimeMs.toFixed(2)}ms`);

      // Close all documents
      for (let i = 0; i < fileCount; i++) {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });

    test('should maintain performance with mixed file types', async () => {
      const testFiles = [
        { name: 'mixed-1.txt', content: '.LOG\nText file content\n' },
        { name: 'mixed-2.log', content: '.LOG\nLog file content\n' },
        { name: 'mixed-3.md', content: '.LOG\nMarkdown file content\n' },
        { name: 'mixed-4.txt', content: 'Regular file content\n' }, // No .LOG
        { name: 'mixed-5.py', content: '.LOG\nPython file content\n' } // Unsupported
      ];

      // Create test files
      for (const file of testFiles) {
        const filePath = path.join(testFilesDir, file.name);
        await writeFile(filePath, file.content);
      }

      const startTime = process.hrtime.bigint();

      // Open all files
      const documents: vscode.TextDocument[] = [];
      for (const file of testFiles) {
        const filePath = path.join(testFilesDir, file.name);
        const fileUri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(fileUri);
        documents.push(document);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;

      // Verify correct processing
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const markdownTimestampRegex = /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;

      // Check .txt file
      let content = documents[0].getText();
      assert.strictEqual(content.split('\n').some(line => timestampRegex.test(line)), true, 'TXT file should have timestamp');

      // Check .log file
      content = documents[1].getText();
      assert.strictEqual(content.split('\n').some(line => timestampRegex.test(line)), true, 'LOG file should have timestamp');

      // Check .md file
      content = documents[2].getText();
      assert.strictEqual(content.split('\n').some(line => markdownTimestampRegex.test(line)), true, 'MD file should have markdown timestamp');

      // Check regular file (should be unchanged)
      content = documents[3].getText();
      assert.strictEqual(content, 'Regular file content\n', 'Regular file should be unchanged');

      // Check unsupported file (should be unchanged)
      content = documents[4].getText();
      assert.strictEqual(content, '.LOG\nPython file content\n', 'Unsupported file should be unchanged');

      console.log(`Mixed file types processing time: ${totalTimeMs.toFixed(2)}ms`);
      assert.strictEqual(totalTimeMs < 300, true, `Mixed file processing should complete within 300ms, took ${totalTimeMs.toFixed(2)}ms`);

      // Close all documents
      for (let i = 0; i < documents.length; i++) {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });
  });

  suite('Memory and Resource Usage', () => {
    test('should not leak memory with repeated file operations', async () => {
      const fileName = 'memory-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create test file
      await writeFile(filePath, '.LOG\nMemory test content\n');

      // Get initial memory usage (rough estimate)
      const initialMemory = process.memoryUsage();

      // Perform many open/close cycles
      for (let i = 0; i < 50; i++) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        await new Promise(resolve => setTimeout(resolve, 10));
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }

      // Check memory usage after operations
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory increase after 50 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 10MB for 50 operations)
      assert.strictEqual(memoryIncrease < 10 * 1024 * 1024, true, 'Memory usage should not increase significantly');
    });

    test('should handle rapid file opening without performance degradation', async () => {
      const fileCount = 20;
      const timings: number[] = [];

      // Create test files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `rapid-test-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        await writeFile(filePath, `.LOG\nRapid test ${i}\n`);
      }

      // Open files rapidly and measure individual timings
      for (let i = 0; i < fileCount; i++) {
        const fileName = `rapid-test-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        const fileUri = vscode.Uri.file(filePath);

        const startTime = process.hrtime.bigint();
        const document = await vscode.workspace.openTextDocument(fileUri);
        await new Promise(resolve => setTimeout(resolve, 20));
        const endTime = process.hrtime.bigint();

        const timeMs = Number(endTime - startTime) / 1_000_000;
        timings.push(timeMs);

        // Verify processing
        const content = document.getText();
        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
        assert.strictEqual(content.split('\n').some(line => timestampRegex.test(line)), true, `File ${i} should be processed`);

        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }

      // Analyze performance consistency
      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);

      console.log(`Rapid opening timings - Average: ${averageTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      // Performance should remain consistent
      assert.strictEqual(averageTime < 100, true, `Average time should be under 100ms, was ${averageTime.toFixed(2)}ms`);
      assert.strictEqual(maxTime < 200, true, `Max time should be under 200ms, was ${maxTime.toFixed(2)}ms`);

      // Performance shouldn't degrade significantly over time
      const firstHalfAvg = timings.slice(0, fileCount / 2).reduce((a, b) => a + b, 0) / (fileCount / 2);
      const secondHalfAvg = timings.slice(fileCount / 2).reduce((a, b) => a + b, 0) / (fileCount / 2);
      const degradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

      console.log(`Performance degradation: ${(degradation * 100).toFixed(2)}%`);
      assert.strictEqual(degradation < 0.5, true, 'Performance should not degrade significantly over time');
    });
  });
});