import * as vscode from 'vscode';
import {
  IContentAnalyzer,
  SupportedFileType,
  DocumentContext,
  OperationResult,
  ProcessingState,
  ErrorCode
} from '../types';

/**
 * ContentAnalyzer service for detecting .LOG prefix in documents and analyzing file types
 */
export class ContentAnalyzer implements IContentAnalyzer {
  private static readonly LOG_PREFIX = '.LOG';
  private static readonly SUPPORTED_EXTENSIONS = new Set(['txt', 'log', 'md']);

  /**
   * Determines if a document should be processed based on .LOG prefix
   * @param document The VS Code text document to analyze
   * @returns true if document starts with .LOG and is a supported file type
   */
  shouldProcessDocument(document: vscode.TextDocument): boolean {
    try {
      // Check if document is empty
      if (document.lineCount === 0) {
        return false;
      }

      // Get first line and check for .LOG prefix
      const firstLine = document.lineAt(0).text.trim();
      const hasLogPrefix = firstLine === ContentAnalyzer.LOG_PREFIX;

      // Check if file type is supported
      const fileType = this.getFileType(document);
      const isSupportedType = fileType !== null;

      return hasLogPrefix && isSupportedType;
    } catch (error) {
      // If we can't analyze the document, don't process it
      return false;
    }
  }

  /**
   * Checks if a document starts with .LOG prefix (legacy method for compatibility)
   * @param document The VS Code text document to check
   * @returns true if document starts with .LOG
   */
  isLogFile(document: vscode.TextDocument): boolean {
    try {
      if (document.lineCount === 0) {
        return false;
      }

      const firstLine = document.lineAt(0).text.trim();
      return firstLine === ContentAnalyzer.LOG_PREFIX;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determines the file type based on document properties
   * @param document The VS Code text document to analyze
   * @returns SupportedFileType or null if not supported
   */
  getFileType(document: vscode.TextDocument): SupportedFileType | null {
    try {
      // First try to get extension from file name
      const fileName = document.fileName;
      const extensionMatch = fileName.match(/\.([^.]+)$/);

      if (extensionMatch) {
        const extension = extensionMatch[1].toLowerCase();

        if (ContentAnalyzer.SUPPORTED_EXTENSIONS.has(extension)) {
          switch (extension) {
            case 'txt':
              return SupportedFileType.TEXT;
            case 'log':
              return SupportedFileType.LOG;
            case 'md':
              return SupportedFileType.MARKDOWN;
          }
        }
      }

      // Fallback to language ID if extension detection fails
      const languageId = document.languageId;
      switch (languageId) {
        case 'plaintext':
          return SupportedFileType.TEXT;
        case 'log':
          return SupportedFileType.LOG;
        case 'markdown':
          return SupportedFileType.MARKDOWN;
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Performs comprehensive content analysis and returns document context
   * @param document The VS Code text document to analyze
   * @returns OperationResult containing DocumentContext or error information
   */
  analyzeContent(document: vscode.TextDocument): OperationResult<DocumentContext> {
    try {
      const fileType = this.getFileType(document);

      if (!fileType) {
        return {
          success: false,
          error: 'Unsupported file type',
          errorCode: ErrorCode.UNSUPPORTED_FILE_TYPE
        };
      }

      const shouldProcess = this.shouldProcessDocument(document);

      const context: DocumentContext = {
        document,
        fileType,
        timestamp: '', // Will be populated by TimestampService
        shouldProcess,
        processingState: shouldProcess ? ProcessingState.NOT_STARTED : ProcessingState.SKIPPED
      };

      return {
        success: true,
        data: context
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content analysis failed',
        errorCode: ErrorCode.CONTENT_ANALYSIS_FAILED
      };
    }
  }

  /**
   * Validates if a file extension is supported
   * @param extension File extension without the dot
   * @returns true if extension is supported
   */
  private isSupportedExtension(extension: string): boolean {
    return ContentAnalyzer.SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
  }

  /**
   * Gets the LOG prefix constant for testing purposes
   * @returns The LOG prefix string
   */
  static getLogPrefix(): string {
    return ContentAnalyzer.LOG_PREFIX;
  }

  /**
   * Gets the set of supported extensions for testing purposes
   * @returns Set of supported file extensions
   */
  static getSupportedExtensions(): Set<string> {
    return new Set(ContentAnalyzer.SUPPORTED_EXTENSIONS);
  }
}