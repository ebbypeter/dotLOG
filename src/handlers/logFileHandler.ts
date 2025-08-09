import * as vscode from 'vscode';
import { BaseFileHandler } from './baseFileHandler';
import { SupportedFileType, IDocumentEditor } from '../types';

/**
 * File handler for .log files that adds plain text timestamps
 */
export class LogFileHandler extends BaseFileHandler {

  constructor(documentEditor: IDocumentEditor) {
    super(documentEditor);
  }

  /**
   * Determines if this handler can process the given document
   * @param document The VS Code text document to check
   * @returns true if document is a .log file with .LOG prefix
   */
  public canHandle(document: vscode.TextDocument): boolean {
    const extension = this.getFileExtension(document);
    return extension === 'log' && this.hasLogPrefix(document);
  }

  /**
   * Returns the file type this handler supports
   * @returns SupportedFileType.LOG
   */
  public getFileType(): SupportedFileType {
    return SupportedFileType.LOG;
  }

  /**
   * Formats the timestamp for log files
   * Adds the timestamp on a new line with a trailing newline for user input
   * @param timestamp The raw timestamp string in "YYYY-MM-DD HH:MM AM/PM" format
   * @returns The formatted timestamp with newlines
   */
  public formatTimestamp(timestamp: string): string {
    return `\n${timestamp}\n`;
  }
}