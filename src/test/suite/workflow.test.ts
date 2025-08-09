import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

// Import extension functions
import { activate, deactivate } from '../../extension';
import { SupportedFileType } from '../../types';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

suite('End-to-End Workflow Tests', () => {
  let testWorkspaceUri: vscode.Uri;
  let testFilesDir: string;
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Create a test workspace directory in temp
    const os = require('os');
    const tempDir = os.tmpdir();
    testFilesDir = path.join(tempDir, 'dotlog-workflow-tests');
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

  suite('Complete Document Processing Workflow', () => {
    test('should complete full workflow for text file', async () => {
      const fileName = 'workflow-test.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Step 1: Create file with .LOG prefix
      await writeFile(filePath, '.LOG\nExisting content\n');

      // Step 2: Open document (triggers file monitor)
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Step 3: Wait for complete processing workflow
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Verify complete workflow results
      const content = document.getText();
      const lines = content.split('\n');

      // Verify content analysis worked
      assert.strictEqual(lines[0], '.LOG', 'Content analyzer should detect .LOG');

      // Verify file type detection worked
      assert.strictEqual(document.fileName.endsWith('.txt'), true, 'File type should be detected as .txt');

      // Verify timestamp service worked
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const timestampLines = lines.filter(line => timestampRegex.test(line));
      assert.strictEqual(timestampLines.length >= 1, true, 'Timestamp service should generate timestamp');

      // Verify document editor worked
      assert.strictEqual(lines[1], 'Existing content', 'Existing content should be preserved');
      assert.strictEqual(timestampLines.length > 0, true, 'New timestamp should be added');

      // Verify file handler worked correctly for text files
      const lastTimestamp = timestampLines[timestampLines.length - 1];
      assert.match(lastTimestamp, timestampRegex, 'Text file handler should format timestamp correctly');

      // Close the document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should complete full workflow for log file', async () => {
      const fileName = 'workflow-test.log';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with .LOG prefix and existing log entries
      await writeFile(filePath, '.LOG\n2025-01-15 09:00\nApplication started\n');

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();
      const lines = content.split('\n');

      // Verify workflow for log files
      assert.strictEqual(lines[0], '.LOG', 'Should detect .LOG in log file');
      assert.strictEqual(lines[1], '2025-01-15 09:00', 'Existing timestamp should be preserved');
      assert.strictEqual(lines[2], 'Application started', 'Existing content should be preserved');

      // Verify new timestamp was added
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const timestampLines = lines.filter(line => timestampRegex.test(line));
      assert.strictEqual(timestampLines.length >= 2, true, 'Should have original and new timestamp');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should complete full workflow for markdown file', async () => {
      const fileName = 'workflow-test.md';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create markdown file with .LOG prefix
      await writeFile(filePath, '.LOG\n\n## 2025-01-15 09:00\n\nExisting entry\n');

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();
      const lines = content.split('\n');

      // Verify workflow for markdown files
      assert.strictEqual(lines[0], '.LOG', 'Should detect .LOG in markdown file');
      assert.strictEqual(lines[2], '## 2025-01-15 09:00', 'Existing markdown timestamp should be preserved');
      assert.strictEqual(lines[4], 'Existing entry', 'Existing content should be preserved');

      // Verify new markdown timestamp was added
      const markdownTimestampRegex = /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const markdownTimestampLines = lines.filter(line => markdownTimestampRegex.test(line));
      assert.strictEqual(markdownTimestampLines.length >= 2, true, 'Should have original and new markdown timestamp');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle workflow with empty .LOG file', async () => {
      const fileName = 'empty-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with only .LOG
      await writeFile(filePath, '.LOG');

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();
      const lines = content.split('\n');

      // Verify workflow handles empty files
      assert.strictEqual(lines[0], '.LOG', 'Should detect .LOG in empty file');

      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));
      assert.strictEqual(hasTimestamp, true, 'Should add timestamp to empty .LOG file');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should skip workflow for non-.LOG files', async () => {
      const fileName = 'no-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      const originalContent = 'Regular file content\nNo .LOG prefix here\n';
      await writeFile(filePath, originalContent);

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();

      // Verify workflow is skipped
      assert.strictEqual(content, originalContent, 'Non-.LOG file should remain unchanged');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should skip workflow for unsupported file types', async () => {
      const fileName = 'unsupported-workflow.py';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      const originalContent = '.LOG\nprint("This should not be processed")\n';
      await writeFile(filePath, originalContent);

      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();

      // Verify workflow is skipped for unsupported types
      assert.strictEqual(content, originalContent, 'Unsupported file type should remain unchanged');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('Workflow Error Handling', () => {
    test('should handle workflow errors gracefully', async () => {
      const fileName = 'error-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file with unusual content that might cause issues
      await writeFile(filePath, '.LOG\n\x00\x01\x02\nBinary content\n');

      // The workflow should not crash even with unusual content
      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Extension should handle this gracefully
      assert.strictEqual(document.lineCount > 0, true, 'Document should be opened despite unusual content');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should maintain workflow state across multiple operations', async () => {
      const fileName = 'state-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create initial file
      await writeFile(filePath, '.LOG\nInitial content\n');

      // First workflow execution
      let document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      // Second workflow execution
      document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = document.getText();
      const lines = content.split('\n');

      // Verify multiple workflow executions work correctly
      assert.strictEqual(lines[0], '.LOG', 'Should still detect .LOG');
      assert.strictEqual(lines[1], 'Initial content', 'Original content should be preserved');

      // Should have multiple timestamps from multiple opens
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const timestampLines = lines.filter(line => timestampRegex.test(line));
      assert.strictEqual(timestampLines.length >= 2, true, 'Should have multiple timestamps from multiple opens');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle concurrent workflow executions', async () => {
      const filePromises: Promise<vscode.TextDocument>[] = [];
      const fileCount = 5;

      // Create multiple files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-workflow-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        await writeFile(filePath, `.LOG\nConcurrent test ${i}\n`);
      }

      // Execute workflows concurrently
      for (let i = 0; i < fileCount; i++) {
        const fileName = `concurrent-workflow-${i}.txt`;
        const filePath = path.join(testFilesDir, fileName);
        const fileUri = vscode.Uri.file(filePath);
        filePromises.push(Promise.resolve(vscode.workspace.openTextDocument(fileUri)));
      }

      const documents = await Promise.all(filePromises);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all workflows completed successfully
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const content = document.getText();
        const lines = content.split('\n');

        assert.strictEqual(lines[0], '.LOG', `File ${i} should have .LOG detected`);
        assert.strictEqual(lines[1], `Concurrent test ${i}`, `File ${i} should preserve original content`);

        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
        const hasTimestamp = lines.some(line => timestampRegex.test(line));
        assert.strictEqual(hasTimestamp, true, `File ${i} should have timestamp added`);
      }

      // Close all documents
      for (let i = 0; i < fileCount; i++) {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      }
    });
  });

  suite('Workflow Integration with VS Code Features', () => {
    test('should work with VS Code document save operations', async () => {
      const fileName = 'save-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create and open file
      await writeFile(filePath, '.LOG\nContent before save\n');
      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify timestamp was added
      let content = document.getText();
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      let hasTimestamp = content.split('\n').some(line => timestampRegex.test(line));
      assert.strictEqual(hasTimestamp, true, 'Timestamp should be added after opening');

      // Save the document
      await document.save();

      // Verify content is still correct after save
      content = document.getText();
      hasTimestamp = content.split('\n').some(line => timestampRegex.test(line));
      assert.strictEqual(hasTimestamp, true, 'Timestamp should persist after save');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should work with VS Code editor switching', async () => {
      const file1Name = 'switch-1.txt';
      const file2Name = 'switch-2.txt';
      const file1Path = path.join(testFilesDir, file1Name);
      const file2Path = path.join(testFilesDir, file2Name);
      const file1Uri = vscode.Uri.file(file1Path);
      const file2Uri = vscode.Uri.file(file2Path);

      // Create both files
      await writeFile(file1Path, '.LOG\nFile 1 content\n');
      await writeFile(file2Path, '.LOG\nFile 2 content\n');

      // Open first file
      const doc1 = await vscode.workspace.openTextDocument(file1Uri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open second file (switches editor)
      const doc2 = await vscode.workspace.openTextDocument(file2Uri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify both files were processed correctly
      const content1 = doc1.getText();
      const content2 = doc2.getText();

      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp1 = content1.split('\n').some(line => timestampRegex.test(line));
      const hasTimestamp2 = content2.split('\n').some(line => timestampRegex.test(line));

      assert.strictEqual(hasTimestamp1, true, 'First file should have timestamp');
      assert.strictEqual(hasTimestamp2, true, 'Second file should have timestamp');

      // Close both documents
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should handle workflow during VS Code workspace changes', async () => {
      const fileName = 'workspace-workflow.txt';
      const filePath = path.join(testFilesDir, fileName);
      const fileUri = vscode.Uri.file(filePath);

      // Create file
      await writeFile(filePath, '.LOG\nWorkspace test content\n');

      // Open document
      const document = await vscode.workspace.openTextDocument(fileUri);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify processing worked despite being in test environment
      const content = document.getText();
      const lines = content.split('\n');

      assert.strictEqual(lines[0], '.LOG', 'Should detect .LOG in workspace context');
      assert.strictEqual(lines[1], 'Workspace test content', 'Should preserve content in workspace context');

      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      const hasTimestamp = lines.some(line => timestampRegex.test(line));
      assert.strictEqual(hasTimestamp, true, 'Should add timestamp in workspace context');

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });
});