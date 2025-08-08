import * as vscode from 'vscode';
import { ExtensionError, ErrorCode, LogLevel } from '../types';

/**
 * Centralized error logging service for the dotLOG extension
 * Provides structured logging with different levels and context information
 */
export class ErrorLogger {
  private static instance: ErrorLogger | null = null;
  private outputChannel: vscode.OutputChannel | null = null;
  private logLevel: LogLevel = LogLevel.INFO;
  private errorHistory: ExtensionError[] = [];
  private readonly maxHistorySize = 100;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('dotLOG');
  }

  /**
   * Gets the singleton instance of ErrorLogger
   * @returns ErrorLogger instance
   */
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Sets the logging level
   * @param level The minimum log level to output
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Logs an error with full context information
   * @param error The error to log
   * @param context Additional context information
   * @param errorCode Optional error code for categorization
   */
  public logError(error: Error | string, context?: Record<string, any>, errorCode?: ErrorCode): void {
    const extensionError: ExtensionError = {
      message: error instanceof Error ? error.message : error,
      code: errorCode || ErrorCode.UNKNOWN_ERROR,
      context: context || {},
      timestamp: new Date()
    };

    this.addToHistory(extensionError);

    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeToOutput('ERROR', extensionError.message, extensionError.context);
    }
  }

  /**
   * Logs a warning message
   * @param message The warning message
   * @param context Additional context information
   */
  public logWarning(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeToOutput('WARN', message, context);
    }
  }

  /**
   * Logs an info message
   * @param message The info message
   * @param context Additional context information
   */
  public logInfo(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeToOutput('INFO', message, context);
    }
  }

  /**
   * Logs a debug message
   * @param message The debug message
   * @param context Additional context information
   */
  public logDebug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeToOutput('DEBUG', message, context);
    }
  }

  /**
   * Logs a permission denied error with specific handling
   * @param operation The operation that was denied
   * @param filePath The file path that couldn't be accessed
   * @param originalError The original error if available
   */
  public logPermissionError(operation: string, filePath: string, originalError?: Error): void {
    const context = {
      operation,
      filePath,
      originalError: originalError?.message
    };

    this.logError(
      `Permission denied for ${operation} on file: ${filePath}`,
      context,
      ErrorCode.PERMISSION_DENIED
    );
  }

  /**
   * Logs a document modification failure with recovery suggestions
   * @param filePath The file that couldn't be modified
   * @param operation The operation that failed
   * @param originalError The original error
   * @param recoveryAttempted Whether recovery was attempted
   */
  public logDocumentModificationError(
    filePath: string,
    operation: string,
    originalError: Error,
    recoveryAttempted: boolean = false
  ): void {
    const context = {
      filePath,
      operation,
      originalError: originalError.message,
      recoveryAttempted,
      timestamp: new Date().toISOString()
    };

    this.logError(
      `Document modification failed: ${operation} on ${filePath}`,
      context,
      ErrorCode.DOCUMENT_MODIFICATION_FAILED
    );

    if (!recoveryAttempted) {
      this.logInfo('Consider checking file permissions or if the file is read-only', context);
    }
  }

  /**
   * Gets recent error history for debugging
   * @param count Number of recent errors to retrieve
   * @returns Array of recent errors
   */
  public getRecentErrors(count: number = 10): ExtensionError[] {
    return this.errorHistory.slice(-count);
  }

  /**
   * Clears the error history
   */
  public clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Shows the output channel to the user
   */
  public showOutput(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  /**
   * Disposes of the error logger resources
   */
  public dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
      this.outputChannel = null;
    }
    this.errorHistory = [];
    ErrorLogger.instance = null;
  }

  /**
   * Determines if a message should be logged based on current log level
   * @param messageLevel The level of the message to log
   * @returns true if the message should be logged
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Writes a formatted message to the output channel
   * @param level The log level
   * @param message The message to log
   * @param context Additional context information
   */
  private writeToOutput(level: string, message: string, context?: Record<string, any>): void {
    if (!this.outputChannel) {
      return;
    }

    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${level}: ${message}`;

    if (context && Object.keys(context).length > 0) {
      logMessage += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }

    this.outputChannel.appendLine(logMessage);
  }

  /**
   * Adds an error to the history, maintaining size limit
   * @param error The error to add to history
   */
  private addToHistory(error: ExtensionError): void {
    this.errorHistory.push(error);

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }
}