import * as vscode from 'vscode';
import { BaseFileHandler } from './baseFileHandler';
import { SupportedFileType, IDocumentEditor } from '../types';

/**
 * File handler for .txt files that adds plain text timestamps
 */
export class TextFileHandler extends BaseFileHandler {

  constructor(documentEditor: IDocumentEditor) {
    super(documentEditor);
  }

  /**
   * Determines if this handler can process the given document
   * @param document The VS Code text document to check
   * @returns true if document is a .txt file with .LOG prefix
   */
  public canHandle(document: vscode.TextDocument): boolean {
    const extension = this.getFileExtension(document);
    return extension === 'txt' && this.hasLogPrefix(document);
  }

  /**
   * Returns the file type this handler supports
   * @returns SupportedFileType.TEXT
   */
  public getFileType(): SupportedFileType {
    return SupportedFileType.TEXT;
  }

  /**
   * Formats the timestamp for plain text files
   * Adds the timestamp on a new line with a trailing newline for user input
   * @param timestamp The raw timestamp string in "YYYY-MM-DD HH:MM AM/PM" format
   * @returns The formatted timestamp with newlines
   */
  public formatTimestamp(timestamp: string): string {
    return `\n${timestamp}\n`;
  }
}