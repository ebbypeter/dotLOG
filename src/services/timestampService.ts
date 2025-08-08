import { ITimestampService, OperationResult, ErrorCode } from '../types';

/**
 * Service responsible for generating and formatting timestamps
 * Implements the "YYYY-MM-DD HH:MM AM/PM" format as specified in requirements 3.1 and 3.4
 */
export class TimestampService implements ITimestampService {
  /**
   * Generates a timestamp using the current date and time
   * @returns Formatted timestamp string in "YYYY-MM-DD HH:MM AM/PM" format
   */
  generateTimestamp(): string {
    return this.formatTimestamp(new Date());
  }

  /**
   * Formats a given date into the required timestamp format
   * @param date - The date to format
   * @returns Formatted timestamp string in "YYYY-MM-DD HH:MM AM/PM" format
   */
  formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Convert to 12-hour format
    const hours24 = date.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';

    const hours = String(hours12).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
  }

  /**
   * Gets the current timestamp with error handling
   * @returns OperationResult containing the timestamp or error information
   */
  getCurrentTimestamp(): OperationResult<string> {
    try {
      const timestamp = this.generateTimestamp();
      return {
        success: true,
        data: timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating timestamp',
        errorCode: ErrorCode.TIMESTAMP_GENERATION_FAILED
      };
    }
  }
}