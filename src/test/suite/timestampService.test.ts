import * as assert from 'assert';
import { TimestampService } from '../../services/timestampService';
import { ErrorCode } from '../../types';

suite('TimestampService Test Suite', () => {
  let timestampService: TimestampService;

  setup(() => {
    timestampService = new TimestampService();
  });

  suite('generateTimestamp', () => {
    test('should generate timestamp in correct format', () => {
      const timestamp = timestampService.generateTimestamp();

      // Test format: YYYY-MM-DD HH:MM AM/PM
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      assert.match(timestamp, timestampRegex, 'Timestamp should match YYYY-MM-DD HH:MM AM/PM format');
    });

    test('should generate current timestamp', () => {
      const beforeTime = new Date();
      const timestamp = timestampService.generateTimestamp();
      const afterTime = new Date();

      // Parse the generated timestamp
      const parts = timestamp.split(' ');
      const datePart = parts[0];
      const timePart = parts[1];
      const ampmPart = parts[2];

      const [year, month, day] = datePart.split('-').map(Number);
      const [hours12, minutes] = timePart.split(':').map(Number);

      // Convert back to 24-hour format for comparison
      let hours24 = hours12;
      if (ampmPart === 'AM' && hours12 === 12) {
        hours24 = 0;
      } else if (ampmPart === 'PM' && hours12 !== 12) {
        hours24 = hours12 + 12;
      }

      const generatedTime = new Date(year, month - 1, day, hours24, minutes);

      // Should be within the time range when the test was executed
      assert.ok(generatedTime >= new Date(beforeTime.getFullYear(), beforeTime.getMonth(), beforeTime.getDate(), beforeTime.getHours(), beforeTime.getMinutes()),
        'Generated timestamp should not be before test execution');
      assert.ok(generatedTime <= new Date(afterTime.getFullYear(), afterTime.getMonth(), afterTime.getDate(), afterTime.getHours(), afterTime.getMinutes()),
        'Generated timestamp should not be after test execution');
    });
  });

  suite('formatTimestamp', () => {
    test('should format date correctly with zero padding', () => {
      const testDate = new Date(2025, 0, 5, 9, 7); // January 5, 2025, 09:07 AM
      const formatted = timestampService.formatTimestamp(testDate);

      assert.strictEqual(formatted, '2025-01-05 09:07 AM', 'Should format with zero padding and AM indicator');
    });

    test('should format date correctly without zero padding needed', () => {
      const testDate = new Date(2025, 11, 25, 14, 30); // December 25, 2025, 2:30 PM
      const formatted = timestampService.formatTimestamp(testDate);

      assert.strictEqual(formatted, '2025-12-25 02:30 PM', 'Should format correctly with PM indicator');
    });

    test('should handle edge case dates', () => {
      // Test leap year
      const leapYearDate = new Date(2024, 1, 29, 23, 59); // February 29, 2024, 11:59 PM
      const formatted = timestampService.formatTimestamp(leapYearDate);

      assert.strictEqual(formatted, '2024-02-29 11:59 PM', 'Should handle leap year correctly with PM indicator');
    });

    test('should handle year boundaries', () => {
      // Test New Year's Eve
      const newYearEve = new Date(2024, 11, 31, 23, 59); // December 31, 2024, 11:59 PM
      const formatted = timestampService.formatTimestamp(newYearEve);

      assert.strictEqual(formatted, '2024-12-31 11:59 PM', 'Should handle year boundary correctly with PM indicator');
    });

    test('should handle midnight', () => {
      const midnight = new Date(2025, 5, 15, 0, 0); // June 15, 2025, 12:00 AM
      const formatted = timestampService.formatTimestamp(midnight);

      assert.strictEqual(formatted, '2025-06-15 12:00 AM', 'Should handle midnight correctly with AM indicator');
    });

    test('should handle noon', () => {
      const noon = new Date(2025, 5, 15, 12, 0); // June 15, 2025, 12:00 PM
      const formatted = timestampService.formatTimestamp(noon);

      assert.strictEqual(formatted, '2025-06-15 12:00 PM', 'Should handle noon correctly with PM indicator');
    });

    test('should handle AM times correctly', () => {
      const morningTime = new Date(2025, 5, 15, 8, 30); // June 15, 2025, 8:30 AM
      const formatted = timestampService.formatTimestamp(morningTime);

      assert.strictEqual(formatted, '2025-06-15 08:30 AM', 'Should format AM times correctly');
    });

    test('should handle PM times correctly', () => {
      const eveningTime = new Date(2025, 5, 15, 20, 45); // June 15, 2025, 8:45 PM
      const formatted = timestampService.formatTimestamp(eveningTime);

      assert.strictEqual(formatted, '2025-06-15 08:45 PM', 'Should format PM times correctly');
    });

    test('should handle 1 AM correctly', () => {
      const oneAM = new Date(2025, 5, 15, 1, 15); // June 15, 2025, 1:15 AM
      const formatted = timestampService.formatTimestamp(oneAM);

      assert.strictEqual(formatted, '2025-06-15 01:15 AM', 'Should format 1 AM correctly');
    });

    test('should handle 1 PM correctly', () => {
      const onePM = new Date(2025, 5, 15, 13, 15); // June 15, 2025, 1:15 PM
      const formatted = timestampService.formatTimestamp(onePM);

      assert.strictEqual(formatted, '2025-06-15 01:15 PM', 'Should format 1 PM correctly');
    });
  });

  suite('getCurrentTimestamp', () => {
    test('should return successful result with timestamp', () => {
      const result = timestampService.getCurrentTimestamp();

      assert.strictEqual(result.success, true, 'Should return successful result');
      assert.ok(result.data, 'Should contain timestamp data');
      assert.match(result.data!, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/, 'Should contain valid timestamp format with AM/PM');
      assert.strictEqual(result.error, undefined, 'Should not contain error');
    });

    test('should handle errors gracefully', () => {
      // Mock the formatTimestamp method to throw an error
      const originalFormatTimestamp = timestampService.formatTimestamp;
      timestampService.formatTimestamp = () => {
        throw new Error('Test error');
      };

      const result = timestampService.getCurrentTimestamp();

      assert.strictEqual(result.success, false, 'Should return failed result');
      assert.strictEqual(result.data, undefined, 'Should not contain data');
      assert.strictEqual(result.error, 'Test error', 'Should contain error message');
      assert.strictEqual(result.errorCode, ErrorCode.TIMESTAMP_GENERATION_FAILED, 'Should contain correct error code');

      // Restore original method
      timestampService.formatTimestamp = originalFormatTimestamp;
    });

    test('should handle unknown errors', () => {
      // Mock the formatTimestamp method to throw a non-Error object
      const originalFormatTimestamp = timestampService.formatTimestamp;
      timestampService.formatTimestamp = () => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error';
      };

      const result = timestampService.getCurrentTimestamp();

      assert.strictEqual(result.success, false, 'Should return failed result');
      assert.strictEqual(result.error, 'Unknown error occurred while generating timestamp', 'Should contain generic error message');
      assert.strictEqual(result.errorCode, ErrorCode.TIMESTAMP_GENERATION_FAILED, 'Should contain correct error code');

      // Restore original method
      timestampService.formatTimestamp = originalFormatTimestamp;
    });
  });

  suite('timestamp accuracy', () => {
    test('should generate consistent timestamps within same minute', () => {
      const timestamp1 = timestampService.generateTimestamp();
      const timestamp2 = timestampService.generateTimestamp();

      // Both timestamps should be identical or differ only in the minute if executed across minute boundary
      const parts1 = timestamp1.split(' ');
      const parts2 = timestamp2.split(' ');
      const [date1, time1, ampm1] = parts1;
      const [date2, time2, ampm2] = parts2;

      assert.strictEqual(date1, date2, 'Dates should be identical when generated quickly');
      assert.strictEqual(ampm1, ampm2, 'AM/PM should be identical when generated quickly');

      const [hours1, minutes1] = time1.split(':').map(Number);
      const [hours2, minutes2] = time2.split(':').map(Number);

      // Time difference should be at most 1 minute
      const time1Minutes = hours1 * 60 + minutes1;
      const time2Minutes = hours2 * 60 + minutes2;
      const timeDiff = Math.abs(time2Minutes - time1Minutes);

      assert.ok(timeDiff <= 1, 'Time difference should be at most 1 minute');
    });

    test('should maintain format consistency across multiple generations', () => {
      const timestamps = [];
      for (let i = 0; i < 5; i++) {
        timestamps.push(timestampService.generateTimestamp());
      }

      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
      timestamps.forEach((timestamp, index) => {
        assert.match(timestamp, timestampRegex, `Timestamp ${index + 1} should match AM/PM format`);
      });
    });
  });
});