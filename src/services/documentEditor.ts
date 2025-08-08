import * as vscode from 'vscode';
import { IDocumentEditor, OperationResult, ErrorCode } from '../types';
import { ErrorLogger } from './errorLogger';
import { ErrorRecoveryService } from './errorRecovery';

/**
 * DocumentEditor handles VS Code document editing operations for the dotLOG extension.
 * Provides methods for inserting text at document end and cursor positioning with
 * comprehensive error handling for read-only files and edit failures.
 */
export class DocumentEditor implements IDocumentEditor {
  private readonly maxRetries = 1;
  private readonly editTimeoutMs = 5000;
  private logger: ErrorLogger;
  private recoveryService: ErrorRecoveryService;

  constructor() {
    this.logger = ErrorLogger.getInstance();
    this.recoveryService = ErrorRecoveryService.getInstance();
  }

  /**
   * Inserts text at the end of the document with error handling and retry logic.
   * @param document The VS Code text document to modify
   * @param text The text to insert at the end of the document
   * @returns Promise<OperationResult<boolean>> indicating success/failure
   */
  async insertTextAtEnd(document: vscode.TextDocument, text: string): Promise<OperationResult<boolean>> {
    try {
      this.logger.logDebug('Attempting to insert text at end of document', {
        fileName: document.fileName,
        textLength: text.length,
        documentLineCount: document.lineCount
      });

      // Check if document can be modified
      if (!this.canModifyDocument(document)) {
        const permissionResult = await this.recoveryService.recoverFromPermissionError(
          document.fileName,
          'insertTextAtEnd'
        );

        this.logger.logPermissionError('insertTextAtEnd', document.fileName);

        return {
          success: false,
          error: `Document is read-only or cannot be modified. ${permissionResult.success ? permissionResult.data : ''}`,
          errorCode: ErrorCode.PERMISSION_DENIED
        };
      }

      // Get the end position of the document
      const lastLine = document.lineCount - 1;
      const lastLineText = document.lineAt(lastLine).text;
      const endPosition = new vscode.Position(lastLine, lastLineText.length);

      // Create workspace edit
      const edit = new vscode.WorkspaceEdit();

      // Ensure text starts with a newline if document doesn't end with one
      const textToInsert = this.prepareTextForInsertion(document, text);

      edit.insert(document.uri, endPosition, textToInsert);

      // Apply the edit with retry logic and recovery
      const result = await this.applyEditWithRetryAndRecovery(document, edit);

      if (result.success) {
        this.logger.logDebug('Successfully inserted text at end of document', {
          fileName: document.fileName,
          insertedText: textToInsert
        });
      }

      return result;

    } catch (error) {
      const errorMessage = `Failed to insert text: ${error instanceof Error ? error.message : 'Unknown error'}`;

      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), {
        fileName: document.fileName,
        operation: 'insertTextAtEnd',
        textLength: text.length
      }, ErrorCode.DOCUMENT_MODIFICATION_FAILED);

      return {
        success: false,
        error: errorMessage,
        errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
      };
    }
  }

  /**
   * Positions the cursor at the end of the document after text insertion.
   * @param document The VS Code text document
   * @returns Promise<OperationResult<void>> indicating success/failure
   */
  async positionCursorAtEnd(document: vscode.TextDocument): Promise<OperationResult<void>> {
    try {
      this.logger.logDebug('Attempting to position cursor at end of document', {
        fileName: document.fileName
      });

      const editor = vscode.window.activeTextEditor;

      if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
        const errorMessage = 'No active editor found for the document';

        this.logger.logWarning(errorMessage, {
          fileName: document.fileName,
          hasActiveEditor: !!editor,
          activeEditorUri: editor?.document.uri.toString()
        });

        return {
          success: false,
          error: errorMessage,
          errorCode: ErrorCode.CURSOR_POSITIONING_FAILED
        };
      }

      // Get the end position of the document
      const lastLine = document.lineCount - 1;
      const lastLineText = document.lineAt(lastLine).text;
      const endPosition = new vscode.Position(lastLine, lastLineText.length);

      // Set cursor position and reveal the position
      editor.selection = new vscode.Selection(endPosition, endPosition);
      editor.revealRange(new vscode.Range(endPosition, endPosition), vscode.TextEditorRevealType.InCenterIfOutsideViewport);

      this.logger.logDebug('Successfully positioned cursor at end of document', {
        fileName: document.fileName,
        position: { line: endPosition.line, character: endPosition.character }
      });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      const errorMessage = `Failed to position cursor: ${error instanceof Error ? error.message : 'Unknown error'}`;

      // Use graceful cursor positioning failure from recovery service
      return this.recoveryService.gracefulCursorPositioningFailure(document, error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Checks if a document can be modified (not read-only, not untitled without save).
   * @param document The VS Code text document to check
   * @returns boolean indicating if the document can be modified
   */
  canModifyDocument(document: vscode.TextDocument): boolean {
    try {
      this.logger.logDebug('Checking if document can be modified', {
        fileName: document.fileName,
        scheme: document.uri.scheme,
        isUntitled: document.isUntitled,
        isDirty: document.isDirty,
        isClosed: document.isClosed
      });

      // Check if document is closed
      if (document.isClosed) {
        this.logger.logWarning('Document is closed and cannot be modified', {
          fileName: document.fileName
        });
        return false;
      }

      // Check if document is read-only
      if (document.isUntitled && document.isDirty === false) {
        // Untitled documents that haven't been modified can be edited
        this.logger.logDebug('Document is untitled and can be modified', {
          fileName: document.fileName
        });
        return true;
      }

      // Check if document exists and is not read-only
      if (document.uri.scheme === 'file') {
        // For file URIs, we assume they can be modified unless proven otherwise
        // VS Code will handle the actual permission checking during edit
        this.logger.logDebug('Document is a file and assumed modifiable', {
          fileName: document.fileName
        });
        return true;
      }

      // For other schemes (like git, etc.), be more conservative
      const canModify = document.uri.scheme === 'untitled';

      this.logger.logDebug('Document modification check completed', {
        fileName: document.fileName,
        scheme: document.uri.scheme,
        canModify
      });

      return canModify;

    } catch (error) {
      // If we can't determine, err on the side of caution
      this.logger.logError(error instanceof Error ? error : new Error('Unknown error in canModifyDocument'), {
        fileName: document.fileName,
        operation: 'canModifyDocument'
      });
      return false;
    }
  }

  /**
   * Prepares text for insertion by ensuring proper line breaks.
   * @param document The target document
   * @param text The text to insert
   * @returns The prepared text with appropriate line breaks
   */
  private prepareTextForInsertion(document: vscode.TextDocument, text: string): string {
    if (document.lineCount === 0) {
      return text;
    }

    const lastLine = document.lineAt(document.lineCount - 1);
    const needsNewlineBefore = lastLine.text.length > 0;
    const needsNewlineAfter = !text.endsWith('\n');

    let preparedText = text;

    if (needsNewlineBefore) {
      preparedText = '\n' + preparedText;
    }

    if (needsNewlineAfter) {
      preparedText = preparedText + '\n';
    }

    return preparedText;
  }

  /**
   * Applies a workspace edit with retry logic, timeout handling, and error recovery
   * @param document The document being edited
   * @param edit The workspace edit to apply
   * @returns Promise<OperationResult<boolean>> indicating success/failure
   */
  private async applyEditWithRetryAndRecovery(document: vscode.TextDocument, edit: vscode.WorkspaceEdit): Promise<OperationResult<boolean>> {
    const retryFunction = async (): Promise<OperationResult<boolean>> => {
      return this.applyEditWithRetry(edit);
    };

    try {
      const result = await retryFunction();

      if (!result.success) {
        // Attempt recovery
        const recoveryResult = await this.recoveryService.recoverFromDocumentModificationFailure(
          document,
          'applyEdit',
          new Error(result.error || 'Edit failed'),
          retryFunction
        );

        if (recoveryResult.success) {
          this.logger.logInfo('Successfully recovered from edit failure', {
            fileName: document.fileName
          });
        }

        return recoveryResult;
      }

      return result;
    } catch (error) {
      return await this.recoveryService.recoverFromDocumentModificationFailure(
        document,
        'applyEdit',
        error instanceof Error ? error : new Error('Unknown error'),
        retryFunction
      );
    }
  }

  /**
   * Applies a workspace edit with retry logic and timeout handling.
   * @param edit The workspace edit to apply
   * @returns Promise<OperationResult<boolean>> indicating success/failure
   */
  private async applyEditWithRetry(edit: vscode.WorkspaceEdit): Promise<OperationResult<boolean>> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Edit operation timed out')), this.editTimeoutMs);
        });

        // Apply the edit with timeout
        const editPromise = vscode.workspace.applyEdit(edit);
        const success = await Promise.race([editPromise, timeoutPromise]);

        if (success) {
          return {
            success: true,
            data: true
          };
        } else {
          if (attempt < this.maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }

          return {
            success: false,
            error: 'Failed to apply document edit',
            errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
          };
        }

      } catch (error) {
        if (attempt < this.maxRetries) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        return {
          success: false,
          error: `Edit operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
        };
      }
    }

    return {
      success: false,
      error: 'Maximum retry attempts exceeded',
      errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
    };
  }
}