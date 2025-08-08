import * as vscode from 'vscode';
import {
  FileMonitor,
  ContentAnalyzer,
  TimestampService,
  DocumentEditor,
  ErrorLogger,
  ErrorRecoveryService
} from './services';
import {
  TextFileHandler,
  LogFileHandler,
  MarkdownFileHandler
} from './handlers';
import {
  SupportedFileType,
  IFileHandler,
  LogLevel
} from './types';

// Global extension state
let fileMonitor: FileMonitor | null = null;
let errorLogger: ErrorLogger | null = null;
let errorRecoveryService: ErrorRecoveryService | null = null;

/**
 * Extension activation function called when VS Code loads the extension
 * Initializes all services and starts monitoring for .LOG files
 * @param context VS Code extension context for managing lifecycle
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize error handling services first
    errorLogger = ErrorLogger.getInstance();
    errorRecoveryService = ErrorRecoveryService.getInstance();

    // Set log level based on development mode
    const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
    errorLogger.setLogLevel(isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);

    errorLogger.logInfo('dotLOG extension activating...', {
      extensionMode: context.extensionMode,
      version: context.extension.packageJSON.version
    });

    // Initialize core services
    const contentAnalyzer = new ContentAnalyzer();
    const timestampService = new TimestampService();
    const documentEditor = new DocumentEditor();

    // Initialize file handlers
    const textHandler = new TextFileHandler(documentEditor);
    const logHandler = new LogFileHandler(documentEditor);
    const markdownHandler = new MarkdownFileHandler(documentEditor);

    // Create handler map for the file monitor
    const fileHandlers = new Map<SupportedFileType, IFileHandler>([
      [SupportedFileType.TEXT, textHandler],
      [SupportedFileType.LOG, logHandler],
      [SupportedFileType.MARKDOWN, markdownHandler]
    ]);

    errorLogger.logDebug('Initialized services and handlers', {
      handlerCount: fileHandlers.size,
      supportedTypes: Array.from(fileHandlers.keys())
    });

    // Initialize file monitor with all dependencies
    fileMonitor = new FileMonitor(
      contentAnalyzer,
      timestampService,
      fileHandlers
    );

    // Start monitoring document open events
    const monitorResult = fileMonitor.startMonitoring();
    if (!monitorResult.success) {
      throw new Error(`Failed to start file monitoring: ${monitorResult.error}`);
    }

    // Register disposables for proper cleanup
    context.subscriptions.push(
      {
        dispose: () => {
          if (fileMonitor) {
            fileMonitor.dispose();
          }
          if (errorLogger) {
            errorLogger.dispose();
          }
          if (errorRecoveryService) {
            errorRecoveryService.dispose();
          }
        }
      }
    );

    errorLogger.logInfo('dotLOG extension activated successfully', {
      monitoringActive: fileMonitor.isMonitoring(),
      supportedFileTypes: Array.from(fileHandlers.keys())
    });

  } catch (error) {
    const errorMessage = `Failed to activate dotLOG extension: ${error instanceof Error ? error.message : 'Unknown error'}`;

    // Use error logger if available, otherwise fallback to console
    if (errorLogger) {
      errorLogger.logError(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'activate',
        context: 'extension'
      });
      errorLogger.showOutput();
    } else {
      console.error('dotLOG:', errorMessage);
    }

    // Show error notification to user (this is acceptable for activation failures)
    vscode.window.showErrorMessage(`dotLOG extension failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extension deactivation function called when VS Code unloads the extension
 * Performs cleanup of resources and stops monitoring
 */
export function deactivate() {
  try {
    if (errorLogger) {
      errorLogger.logInfo('dotLOG extension deactivating...');
    }

    // Stop file monitoring
    if (fileMonitor) {
      const stopResult = fileMonitor.stopMonitoring();
      if (!stopResult.success) {
        if (errorLogger) {
          errorLogger.logWarning('Failed to stop file monitoring cleanly', {
            error: stopResult.error,
            errorCode: stopResult.errorCode
          });
        } else {
          console.warn('dotLOG: Failed to stop file monitoring cleanly:', stopResult.error);
        }
      }

      fileMonitor.dispose();
      fileMonitor = null;
    }

    // Clean up error handling services
    if (errorRecoveryService) {
      errorRecoveryService.dispose();
      errorRecoveryService = null;
    }

    if (errorLogger) {
      errorLogger.logInfo('dotLOG extension deactivated successfully');
      errorLogger.dispose();
      errorLogger = null;
    }

  } catch (error) {
    // Log deactivation errors but don't throw to avoid blocking VS Code shutdown
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorLogger) {
      errorLogger.logError(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'deactivate',
        context: 'extension'
      });
    } else {
      console.error('dotLOG: Error during deactivation:', errorMessage);
    }
  }
}