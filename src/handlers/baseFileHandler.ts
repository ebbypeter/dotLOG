import * as vscode from 'vscode';
import { IFileHandler, SupportedFileType, ProcessingResult, ProcessingState, IDocumentEditor } from '../types';
import { ErrorLogger } from '../services/errorLogger';
import { ErrorRecoveryService } from '../services/errorRecovery';

/**
 * Abstract base class for file handlers that provides common functionality
 * for processing documents with .LOG prefix
 */
export abstract class BaseFileHandler implements IFileHandler {
  protected documentEditor: IDocumentEditor;
  protected logger: ErrorLogger;
  protected recoveryService: ErrorRecoveryService;

  constructor(documentEditor: IDocumentEditor) {
    this.documentEditor = documentEditor;
    this.logger = ErrorLogger.getInstance();
    this.recoveryService = ErrorRecoveryService.getInstance();
  }

  /**
   * Determines if this handler can process the given document
   * @param document The VS Code text document to check
   * @returns true if this handler supports the document's file type
   */
  public abstract canHandle(document: vscode.TextDocument): boolean;

  /**
   * Returns the file type this handler supports
   * @returns The supported file type enum value
   */
  public abstract getFileType(): SupportedFileType;

  /**
   * Formats the timestamp according to the file type's requirements
   * @param timestamp The raw timestamp string
   * @returns The formatted timestamp string
   */
  public abstract formatTimestamp(timestamp: string): string;

  /**
   * Processes the document by adding a formatted timestamp
   * @param document The VS Code text document to process
   * @param timestamp The timestamp string to add
   * @returns Promise resolving to processing result
   */
  public async processDocument(document: vscode.TextDocument, timestamp: string): Promise<ProcessingResult> {
    try {
      this.logger.logDebug('Processing document with file handler', {
        fileName: document.fileName,
        fileType: this.getFileType(),
        timestamp
      });

      // Check if document can be modified
      if (!this.documentEditor.canModifyDocument(document)) {
        this.logger.logWarning('Document cannot be modified', {
          fileName: document.fileName,
          fileType: this.getFileType()
        });

        return {
          success: false,
          error: 'Document is read-only or cannot be modified',
          documentModified: false,
          processingState: ProcessingState.FAILED
        };
      }

      // Format the timestamp according to file type
      const formattedTimestamp = this.formatTimestamp(timestamp);

      this.logger.logDebug('Formatted timestamp for file type', {
        fileName: document.fileName,
        fileType: this.getFileType(),
        originalTimestamp: timestamp,
        formattedTimestamp
      });

      // Insert the formatted timestamp at the end of the document
      const insertResult = await this.documentEditor.insertTextAtEnd(document, formattedTimestamp);

      if (!insertResult.success) {
        this.logger.logError(
          new Error(insertResult.error || 'Failed to insert timestamp'),
          {
            fileName: document.fileName,
            fileType: this.getFileType(),
            formattedTimestamp,
            errorCode: insertResult.errorCode
          }
        );

        // Use graceful failure from recovery service
        return this.recoveryService.gracefulTimestampFailure(
          document,
          formattedTimestamp,
          new Error(insertResult.error || 'Failed to insert timestamp')
        );
      }

      // Position cursor after the inserted timestamp
      const cursorResult = await this.documentEditor.positionCursorAtEnd(document);

      if (!cursorResult.success) {
        // Document was modified but cursor positioning failed - still consider success
        this.logger.logWarning('Timestamp inserted but cursor positioning failed', {
          fileName: document.fileName,
          fileType: this.getFileType(),
          cursorError: cursorResult.error
        });
      }

      this.logger.logInfo('Document processed successfully', {
        fileName: document.fileName,
        fileType: this.getFileType(),
        timestampInserted: true,
        cursorPositioned: cursorResult.success
      });

      return {
        success: true,
        documentModified: true,
        processingState: ProcessingState.COMPLETED,
        timestamp: formattedTimestamp
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), {
        fileName: document.fileName,
        fileType: this.getFileType(),
        operation: 'processDocument'
      });

      // Use graceful failure from recovery service
      return this.recoveryService.gracefulTimestampFailure(
        document,
        timestamp,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Helper method to get file extension from document
   * @param document The VS Code text document
   * @returns The file extension (without dot) or empty string
   */
  protected getFileExtension(document: vscode.TextDocument): string {
    const fileName = document.fileName;
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
  }

  /**
   * Helper method to check if document has .LOG prefix
   * @param document The VS Code text document
   * @returns true if document starts with .LOG
   */
  protected hasLogPrefix(document: vscode.TextDocument): boolean {
    if (document.lineCount === 0) {
      return false;
    }

    const firstLine = document.lineAt(0).text.trim();
    return firstLine === '.LOG';
  }
}