import * as vscode from 'vscode';
import {
  IFileMonitor,
  IContentAnalyzer,
  ITimestampService,
  IFileHandler,
  ProcessingResult,
  ProcessingState,
  OperationResult,
  SupportedFileType,
  ErrorCode
} from '../types';
import { ErrorLogger } from './errorLogger';
import { ErrorRecoveryService } from './errorRecovery';

/**
 * FileMonitor service that listens for document open events and processes .LOG files
 */
export class FileMonitor implements IFileMonitor {
  private disposable: vscode.Disposable | null = null;
  private isActive = false;
  private logger: ErrorLogger;
  private recoveryService: ErrorRecoveryService;

  constructor(
    private contentAnalyzer: IContentAnalyzer,
    private timestampService: ITimestampService,
    private fileHandlers: Map<SupportedFileType, IFileHandler>
  ) {
    this.logger = ErrorLogger.getInstance();
    this.recoveryService = ErrorRecoveryService.getInstance();
  }

  /**
   * Starts monitoring document open events
   * @returns OperationResult indicating success or failure
   */
  startMonitoring(): OperationResult<void> {
    try {
      this.logger.logInfo('Attempting to start file monitoring');

      if (this.isActive) {
        this.logger.logWarning('File monitoring is already active');
        return {
          success: false,
          error: 'File monitoring is already active',
          errorCode: 'MONITOR_ALREADY_ACTIVE'
        };
      }

      // Register event listener for document open events
      this.disposable = vscode.workspace.onDidOpenTextDocument(
        this.handleDocumentOpened.bind(this)
      );

      this.isActive = true;

      this.logger.logInfo('File monitoring started successfully');

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start monitoring';

      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'startMonitoring'
      });

      return {
        success: false,
        error: errorMessage,
        errorCode: 'MONITOR_START_FAILED'
      };
    }
  }

  /**
   * Stops monitoring document open events
   * @returns OperationResult indicating success or failure
   */
  stopMonitoring(): OperationResult<void> {
    try {
      this.logger.logInfo('Attempting to stop file monitoring');

      if (!this.isActive) {
        this.logger.logWarning('File monitoring is not active');
        return {
          success: false,
          error: 'File monitoring is not active',
          errorCode: 'MONITOR_NOT_ACTIVE'
        };
      }

      if (this.disposable) {
        this.disposable.dispose();
        this.disposable = null;
      }

      this.isActive = false;

      this.logger.logInfo('File monitoring stopped successfully');

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop monitoring';

      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'stopMonitoring'
      });

      return {
        success: false,
        error: errorMessage,
        errorCode: 'MONITOR_STOP_FAILED'
      };
    }
  }

  /**
   * Processes a document when it's opened
   * @param document The opened VS Code text document
   * @returns Promise resolving to processing result
   */
  async onDocumentOpened(document: vscode.TextDocument): Promise<ProcessingResult> {
    try {
      this.logger.logDebug('Processing document opened event', {
        fileName: document.fileName,
        languageId: document.languageId,
        lineCount: document.lineCount
      });

      // Analyze document content to determine if processing is needed
      const analysisResult = this.contentAnalyzer.analyzeContent(document);

      if (!analysisResult.success || !analysisResult.data) {
        this.logger.logError(
          new Error(analysisResult.error || 'Content analysis failed'),
          {
            fileName: document.fileName,
            errorCode: analysisResult.errorCode
          },
          ErrorCode.CONTENT_ANALYSIS_FAILED
        );

        return {
          success: false,
          error: analysisResult.error || 'Content analysis failed',
          documentModified: false,
          processingState: ProcessingState.FAILED
        };
      }

      const context = analysisResult.data;

      // Skip processing if document doesn't need it
      if (!context.shouldProcess) {
        this.logger.logDebug('Document does not need processing, skipping', {
          fileName: document.fileName,
          fileType: context.fileType
        });

        return {
          success: true,
          documentModified: false,
          processingState: ProcessingState.SKIPPED
        };
      }

      // Get timestamp for processing
      const timestampResult = this.timestampService.getCurrentTimestamp();
      if (!timestampResult.success || !timestampResult.data) {
        this.logger.logError(
          new Error(timestampResult.error || 'Failed to generate timestamp'),
          {
            fileName: document.fileName,
            errorCode: timestampResult.errorCode
          },
          ErrorCode.TIMESTAMP_GENERATION_FAILED
        );

        return {
          success: false,
          error: timestampResult.error || 'Failed to generate timestamp',
          documentModified: false,
          processingState: ProcessingState.FAILED
        };
      }

      // Get appropriate file handler
      const handler = this.fileHandlers.get(context.fileType);
      if (!handler) {
        const errorMessage = `No handler found for file type: ${context.fileType}`;

        this.logger.logError(new Error(errorMessage), {
          fileName: document.fileName,
          fileType: context.fileType,
          availableHandlers: Array.from(this.fileHandlers.keys())
        });

        return {
          success: false,
          error: errorMessage,
          documentModified: false,
          processingState: ProcessingState.FAILED
        };
      }

      // Process the document with the appropriate handler
      this.logger.logDebug('Processing document with handler', {
        fileName: document.fileName,
        fileType: context.fileType,
        timestamp: timestampResult.data
      });

      const processingResult = await handler.processDocument(document, timestampResult.data);

      if (processingResult.success) {
        this.logger.logInfo('Document processed successfully', {
          fileName: document.fileName,
          fileType: context.fileType,
          documentModified: processingResult.documentModified
        });
      } else {
        this.logger.logError(
          new Error(processingResult.error || 'Handler processing failed'),
          {
            fileName: document.fileName,
            fileType: context.fileType,
            processingState: processingResult.processingState
          }
        );
      }

      return processingResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Document processing failed';

      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), {
        fileName: document.fileName,
        operation: 'onDocumentOpened'
      });

      return {
        success: false,
        error: errorMessage,
        documentModified: false,
        processingState: ProcessingState.FAILED
      };
    }
  }

  /**
   * Checks if the monitor is currently active
   * @returns true if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isActive;
  }

  /**
   * Private method to handle document opened events
   * @param document The opened document
   */
  private async handleDocumentOpened(document: vscode.TextDocument): Promise<void> {
    try {
      // Filter out unsupported file types early for performance
      const fileType = this.contentAnalyzer.getFileType(document);
      if (!fileType) {
        this.logger.logDebug('Skipping unsupported file type', {
          fileName: document.fileName,
          languageId: document.languageId
        });
        return; // Skip unsupported file types silently
      }

      // Process the document
      const result = await this.onDocumentOpened(document);

      // Clear retry history for successful operations
      if (result.success) {
        this.recoveryService.clearRetryHistory(document);
      }

      // Log processing results for debugging (only errors and successful modifications)
      if (!result.success) {
        this.logger.logError(
          new Error(result.error || 'Document processing failed'),
          {
            fileName: document.fileName,
            processingState: result.processingState
          }
        );
      } else if (result.documentModified) {
        this.logger.logInfo('Timestamp added to document', {
          fileName: document.fileName,
          timestamp: result.timestamp
        });
      }

    } catch (error) {
      this.logger.logError(error instanceof Error ? error : new Error('Error in document open handler'), {
        fileName: document.fileName,
        operation: 'handleDocumentOpened'
      });
    }
  }

  /**
   * Disposes of resources when the monitor is destroyed
   */
  dispose(): void {
    this.logger.logDebug('Disposing file monitor');
    this.stopMonitoring();
  }
}