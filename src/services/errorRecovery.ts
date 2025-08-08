import * as vscode from 'vscode';
import { ErrorLogger } from './errorLogger';
import { ErrorCode, OperationResult, ProcessingResult, ProcessingState } from '../types';

/**
 * Error recovery service that provides mechanisms to recover from failed operations
 */
export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService | null = null;
  private logger: ErrorLogger;
  private retryAttempts: Map<string, number> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 500;

  private constructor() {
    this.logger = ErrorLogger.getInstance();
  }

  /**
   * Gets the singleton instance of ErrorRecoveryService
   * @returns ErrorRecoveryService instance
   */
  public static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Attempts to recover from a document modification failure
   * @param document The document that failed to be modified
   * @param operation The operation that failed
   * @param originalError The original error
   * @param retryFunction Function to retry the operation
   * @returns Promise<OperationResult> indicating recovery success
   */
  public async recoverFromDocumentModificationFailure<T>(
    document: vscode.TextDocument,
    operation: string,
    originalError: Error,
    retryFunction: () => Promise<OperationResult<T>>
  ): Promise<OperationResult<T>> {
    const recoveryKey = `${document.uri.toString()}-${operation}`;
    let currentAttempts = this.retryAttempts.get(recoveryKey) || 0;

    this.logger.logDocumentModificationError(
      document.fileName,
      operation,
      originalError,
      currentAttempts > 0
    );

    // Try up to maxRetries times
    while (currentAttempts < this.maxRetries) {
      // Check if the document is still available and valid
      if (document.isClosed) {
        this.retryAttempts.delete(recoveryKey);
        return {
          success: false,
          error: 'Document was closed during recovery attempt',
          errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
        };
      }

      // Wait before retrying (except for first attempt)
      if (currentAttempts > 0) {
        await this.delay(this.retryDelayMs * currentAttempts);
      }

      // Increment retry count
      currentAttempts++;
      this.retryAttempts.set(recoveryKey, currentAttempts);

      try {
        this.logger.logInfo(`Attempting recovery for ${operation} (attempt ${currentAttempts}/${this.maxRetries})`, {
          document: document.fileName,
          operation
        });

        const result = await retryFunction();

        if (result.success) {
          this.retryAttempts.delete(recoveryKey);
          this.logger.logInfo(`Recovery successful for ${operation}`, {
            document: document.fileName,
            attempts: currentAttempts
          });
          return result;
        }

        // If this was the last attempt, break out of the loop
        if (currentAttempts >= this.maxRetries) {
          break;
        }

      } catch (error) {
        // If this was the last attempt, return the error
        if (currentAttempts >= this.maxRetries) {
          this.retryAttempts.delete(recoveryKey);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Recovery attempt failed',
            errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
          };
        }
        // Otherwise, continue to next retry
      }
    }

    // All retries exhausted
    this.retryAttempts.delete(recoveryKey);
    return {
      success: false,
      error: `Maximum retry attempts (${this.maxRetries}) exceeded for ${operation}`,
      errorCode: ErrorCode.DOCUMENT_MODIFICATION_FAILED
    };
  }

  /**
   * Attempts to recover from permission denied errors
   * @param filePath The file path that had permission issues
   * @param operation The operation that was denied
   * @returns Promise<OperationResult> with recovery suggestions
   */
  public async recoverFromPermissionError(
    filePath: string,
    operation: string
  ): Promise<OperationResult<string>> {
    this.logger.logPermissionError(operation, filePath);

    // Check if file exists and get its stats
    try {
      const uri = vscode.Uri.file(filePath);
      const stat = await vscode.workspace.fs.stat(uri);

      const suggestions: string[] = [];

      // Check if file is read-only
      if (stat.permissions && (stat.permissions & vscode.FilePermission.Readonly)) {
        suggestions.push('File is marked as read-only. Consider changing file permissions.');
      }

      // Check if it's a directory instead of a file
      if (stat.type === vscode.FileType.Directory) {
        suggestions.push('Target is a directory, not a file. Check the file path.');
      }

      // General suggestions
      suggestions.push('Verify that VS Code has permission to modify this file.');
      suggestions.push('Check if the file is open in another application.');
      suggestions.push('Try saving the file manually first.');

      return {
        success: true,
        data: suggestions.join(' '),
        errorCode: ErrorCode.PERMISSION_DENIED
      };

    } catch (error) {
      return {
        success: false,
        error: `Cannot access file for recovery analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: ErrorCode.FILE_READ_ERROR
      };
    }
  }

  /**
   * Provides graceful degradation when timestamp insertion fails
   * @param document The document that couldn't be modified
   * @param timestamp The timestamp that couldn't be inserted
   * @returns ProcessingResult with graceful failure
   */
  public gracefulTimestampFailure(
    document: vscode.TextDocument,
    timestamp: string,
    originalError: Error
  ): ProcessingResult {
    this.logger.logError(
      `Graceful failure: Could not insert timestamp into ${document.fileName}`,
      {
        timestamp,
        fileName: document.fileName,
        originalError: originalError.message
      },
      ErrorCode.DOCUMENT_MODIFICATION_FAILED
    );

    // Attempt to show a non-intrusive notification
    this.showGracefulFailureNotification(document.fileName);

    return {
      success: false,
      error: `Could not insert timestamp: ${originalError.message}`,
      documentModified: false,
      processingState: ProcessingState.FAILED,
      timestamp
    };
  }

  /**
   * Handles cursor positioning failures gracefully
   * @param document The document where cursor positioning failed
   * @param originalError The original cursor positioning error
   * @returns OperationResult with graceful handling
   */
  public gracefulCursorPositioningFailure(
    document: vscode.TextDocument,
    originalError: Error
  ): OperationResult<void> {
    this.logger.logWarning(
      `Cursor positioning failed but timestamp was inserted successfully`,
      {
        fileName: document.fileName,
        originalError: originalError.message
      }
    );

    // This is not a critical failure - the timestamp was still inserted
    return {
      success: true,
      data: undefined,
      error: `Cursor positioning failed: ${originalError.message}`,
      errorCode: ErrorCode.CURSOR_POSITIONING_FAILED
    };
  }

  /**
   * Clears retry history for a specific document
   * @param document The document to clear retry history for
   */
  public clearRetryHistory(document: vscode.TextDocument): void {
    const keysToDelete: string[] = [];
    const documentUri = document.uri.toString();

    for (const key of this.retryAttempts.keys()) {
      if (key.startsWith(documentUri)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.retryAttempts.delete(key));
  }

  /**
   * Gets current retry statistics for debugging
   * @returns Object with retry statistics
   */
  public getRetryStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [key, attempts] of this.retryAttempts.entries()) {
      stats[key] = attempts;
    }
    return stats;
  }

  /**
   * Disposes of the error recovery service
   */
  public dispose(): void {
    this.retryAttempts.clear();
    ErrorRecoveryService.instance = null;
  }

  /**
   * Shows a non-intrusive notification about graceful failure
   * @param fileName The file name that couldn't be processed
   */
  private showGracefulFailureNotification(fileName: string): void {
    // Use status bar message instead of intrusive popup
    vscode.window.setStatusBarMessage(
      `dotLOG: Could not add timestamp to ${fileName}`,
      5000 // Show for 5 seconds
    );
  }

  /**
   * Delays execution for the specified number of milliseconds
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}