import * as vscode from 'vscode';

// Enums for supported file types and processing states
export enum SupportedFileType {
  TEXT = 'txt',
  LOG = 'log',
  MARKDOWN = 'md'
}

export enum ProcessingState {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// Core data models
export interface DocumentContext {
  document: vscode.TextDocument;
  fileType: SupportedFileType;
  timestamp: string;
  shouldProcess: boolean;
  processingState: ProcessingState;
}

// Result interfaces for error handling
export interface ProcessingResult {
  success: boolean;
  error?: string;
  documentModified: boolean;
  processingState: ProcessingState;
  timestamp?: string;
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// Error handling types
export interface ExtensionError {
  message: string;
  code: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export enum ErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DOCUMENT_MODIFICATION_FAILED = 'DOCUMENT_MODIFICATION_FAILED',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  CONTENT_ANALYSIS_FAILED = 'CONTENT_ANALYSIS_FAILED',
  TIMESTAMP_GENERATION_FAILED = 'TIMESTAMP_GENERATION_FAILED',
  CURSOR_POSITIONING_FAILED = 'CURSOR_POSITIONING_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Service interfaces
export interface IContentAnalyzer {
  shouldProcessDocument(document: vscode.TextDocument): boolean;
  isLogFile(document: vscode.TextDocument): boolean;
  getFileType(document: vscode.TextDocument): SupportedFileType | null;
  analyzeContent(document: vscode.TextDocument): OperationResult<DocumentContext>;
}

export interface ITimestampService {
  generateTimestamp(): string;
  formatTimestamp(date: Date): string;
  getCurrentTimestamp(): OperationResult<string>;
}

export interface IDocumentEditor {
  insertTextAtEnd(document: vscode.TextDocument, text: string): Promise<OperationResult<boolean>>;
  positionCursorAtEnd(document: vscode.TextDocument): Promise<OperationResult<void>>;
  canModifyDocument(document: vscode.TextDocument): boolean;
}

export interface IFileHandler {
  canHandle(document: vscode.TextDocument): boolean;
  processDocument(document: vscode.TextDocument, timestamp: string): Promise<ProcessingResult>;
  getFileType(): SupportedFileType;
  formatTimestamp(timestamp: string): string;
}

export interface IFileMonitor {
  startMonitoring(): OperationResult<void>;
  stopMonitoring(): OperationResult<void>;
  onDocumentOpened(document: vscode.TextDocument): Promise<ProcessingResult>;
  isMonitoring(): boolean;
}

// Configuration and settings types
export interface ExtensionConfig {
  enabled: boolean;
  timestampFormat: string;
  supportedFileTypes: SupportedFileType[];
  performanceThresholdMs: number;
  enableLogging: boolean;
  logLevel: LogLevel;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Event types for internal communication
export interface DocumentProcessedEvent {
  document: vscode.TextDocument;
  result: ProcessingResult;
  timestamp: Date;
}

export interface ErrorEvent {
  error: ExtensionError;
  context: DocumentContext | null;
  timestamp: Date;
}

// Type guards for runtime type checking
export function isSupportedFileType(value: string): value is SupportedFileType {
  return Object.values(SupportedFileType).includes(value as SupportedFileType);
}

export function isProcessingState(value: string): value is ProcessingState {
  return Object.values(ProcessingState).includes(value as ProcessingState);
}

export function isErrorCode(value: string): value is ErrorCode {
  return Object.values(ErrorCode).includes(value as ErrorCode);
}