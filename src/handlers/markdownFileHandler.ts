import * as vscode from 'vscode';
import { BaseFileHandler } from './baseFileHandler';
import { SupportedFileType, IDocumentEditor } from '../types';

/**
 * File handler for .md files that adds timestamps formatted as heading 2 (##)
 */
export class MarkdownFileHandler extends BaseFileHandler {

  constructor(documentEditor: IDocumentEditor) {
    super(documentEditor);
  }

  /**
   * Determines if this handler can process the given document
   * @param document The VS Code text document to check
   * @returns true if document is a .md file with .LOG prefix
   */
  public canHandle(document: vscode.TextDocument): boolean {
    const extension = this.getFileExtension(document);
    return extension === 'md' && this.hasLogPrefix(document);
  }

  /**
   * Returns the file type this handler supports
   * @returns SupportedFileType.MARKDOWN
   */
  public getFileType(): SupportedFileType {
    return SupportedFileType.MARKDOWN;
  }

  /**
   * Formats the timestamp for markdown files
   * Adds the timestamp as a heading 2 (##) on a new line with a trailing newline for user input
   * @param timestamp The raw timestamp string in "YYYY-MM-DD HH:MM" format
   * @returns The formatted timestamp as markdown heading with newlines
   */
  public formatTimestamp(timestamp: string): string {
    return `\n## ${timestamp}\n`;
  }
}