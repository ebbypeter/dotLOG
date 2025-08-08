# Troubleshooting Guide

## Common Issues

### Timestamps Not Being Added

#### Issue: File opens but no timestamp is inserted

**Possible Causes:**

1. File doesn't start with ".LOG" (case-sensitive)
2. Unsupported file type
3. File is read-only
4. Extension not activated

**Solutions:**

1. **Check First Line**
   - Ensure the very first line contains exactly `.LOG` (all caps, with period)
   - No spaces before or after
   - No additional text on the same line

   ✅ Correct:

   ```
   .LOG
   My log content...
   ```

   ❌ Incorrect:

   ```
   .log
   .LOG - My Log
    .LOG
   ```

2. **Verify File Type**
   - Only .txt, .log, and .md files are supported
   - Check file extension in VS Code status bar
   - Rename file if necessary

3. **Check File Permissions**
   - Ensure file is not read-only
   - Check file properties in your operating system
   - Try creating a new file to test

4. **Verify Extension Status**
   - Go to Extensions panel (Ctrl+Shift+X)
   - Search for "dotLOG"
   - Ensure extension is enabled
   - Try disabling and re-enabling

#### Issue: Timestamp appears in wrong format

**Expected Formats:**

- .txt/.log files: Plain text `2025-08-08 14:30`
- .md files: Heading `## 2025-08-08 14:30`

**Solutions:**

1. Check file extension matches expected format
2. Verify VS Code language mode (bottom right of status bar)
3. Try changing file extension and reopening

### Performance Issues

#### Issue: VS Code becomes slow when opening files

**Possible Causes:**

1. Extension processing too many files
2. Large files causing delays
3. System resource constraints

**Solutions:**

1. **Check File Sizes**
   - Extension works best with files under 1MB
   - Consider splitting very large log files

2. **Monitor Extension Activity**
   - Open VS Code Developer Tools (Help > Toggle Developer Tools)
   - Check Console for error messages
   - Look for performance warnings

3. **Disable Other Extensions**
   - Temporarily disable other extensions to isolate issue
   - Re-enable one by one to identify conflicts

#### Issue: Processing takes longer than expected

**Expected Performance:**

- Timestamp insertion should complete within 100ms
- No noticeable delay in file opening

**Diagnostic Steps:**

1. Open VS Code Developer Tools
2. Go to Console tab
3. Look for timing information or errors
4. Report performance issues with system details

### Extension Activation Issues

#### Issue: Extension doesn't activate

**Symptoms:**

- No timestamp insertion occurs
- Extension not listed in active extensions

**Solutions:**

1. **Check Activation Events**
   - Extension activates when opening .txt, .log, or .md files
   - Try opening a supported file type

2. **Reload VS Code**
   - Use Command Palette (Ctrl+Shift+P)
   - Run "Developer: Reload Window"

3. **Check Extension Installation**
   - Go to Extensions panel
   - Verify dotLOG is installed and enabled
   - Try uninstalling and reinstalling

4. **Check VS Code Version**
   - Extension requires VS Code 1.100.0 or higher
   - Update VS Code if necessary

### File Handling Issues

#### Issue: Cursor not positioned correctly after timestamp

**Expected Behavior:**

- Cursor should be positioned after the inserted timestamp
- Ready for immediate typing

**Solutions:**

1. Wait a moment after file opens for processing to complete
2. Click at the end of the document if cursor positioning fails
3. Report issue if problem persists

#### Issue: Multiple timestamps added on single file open

**Expected Behavior:**

- One timestamp per file open event
- Multiple opens should add multiple timestamps

**Possible Causes:**

1. Rapid file opening/closing
2. Extension event handling issues

**Solutions:**

1. Wait for processing to complete before closing/reopening
2. Check for duplicate event listeners (development issue)

### Error Messages

#### Issue: "Cannot edit read-only file" errors

**Cause:** File has read-only permissions

**Solutions:**

1. Change file permissions in your operating system
2. Copy file to a writable location
3. Use "Save As" to create a writable copy

#### Issue: Extension errors in Developer Console

**Common Error Types:**

1. **Permission Errors**

   ```
   Error: EACCES: permission denied
   ```

   - Check file and directory permissions
   - Run VS Code with appropriate privileges

2. **File System Errors**

   ```
   Error: ENOENT: no such file or directory
   ```

   - File may have been moved or deleted
   - Refresh file explorer and try again

3. **Document Edit Errors**

   ```
   Error: Document edit failed
   ```

   - File may be locked by another process
   - Try closing and reopening the file

## Diagnostic Information

### Collecting Debug Information

When reporting issues, please include:

1. **System Information**
   - Operating System and version
   - VS Code version
   - dotLOG extension version

2. **File Information**
   - File type and extension
   - File size (approximately)
   - First few lines of file content (if not sensitive)

3. **Error Details**
   - Exact error messages from Developer Console
   - Steps to reproduce the issue
   - Expected vs actual behavior

### Enabling Debug Logging

1. Open VS Code Developer Tools (Help > Toggle Developer Tools)
2. Go to Console tab
3. Look for messages starting with "dotLOG:"
4. Copy relevant log messages when reporting issues

### Testing Extension Functionality

#### Quick Test Procedure

1. Create a new file: `test.txt`
2. Add content:

   ```
   .LOG
   This is a test file
   ```

3. Save the file
4. Close and reopen the file
5. Verify timestamp is added

#### Expected Result

```
.LOG
This is a test file

2025-08-08 14:30
```

## Getting Help

### Before Reporting Issues

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Try the quick test procedure above
4. Collect diagnostic information

### Reporting Issues

**GitHub Issues:** [https://github.com/ebbypeter/dotLOG/issues](https://github.com/ebbypeter/dotLOG/issues)

**Include in your report:**

- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- System information
- Error messages (if any)
- Screenshots (if helpful)

### Feature Requests

**GitHub Discussions:** [https://github.com/ebbypeter/dotLOG/discussions](https://github.com/ebbypeter/dotLOG/discussions)

### Community Support

- Check GitHub Discussions for community help
- Search VS Code extension documentation
- Review extension marketplace page

## Known Limitations

### Current Limitations

1. **File Types**: Only supports .txt, .log, and .md files
2. **Timestamp Format**: Fixed "YYYY-MM-DD HH:MM" format
3. **Timezone**: Uses local system time only
4. **Trigger**: Only processes files on open, not on save
5. **Case Sensitivity**: ".LOG" must be exact (all caps)

### Planned Improvements

- Configurable timestamp formats
- Additional file type support
- Custom trigger options
- Timezone configuration

## Advanced Troubleshooting

### Extension Development Issues

If you're developing or modifying the extension:

1. **Build Issues**

   ```bash
   npm run compile
   # Check for TypeScript compilation errors
   ```

2. **Test Failures**

   ```bash
   npm test
   # Run full test suite
   ```

3. **Packaging Issues**

   ```bash
   npm run package
   # Check for packaging errors
   ```

### Performance Profiling

For performance issues:

1. Open VS Code Developer Tools
2. Go to Performance tab
3. Record while opening a .LOG file
4. Analyze timing information
5. Report findings with performance data

### Memory Issues

If experiencing memory problems:

1. Monitor VS Code memory usage
2. Check for memory leaks in extension
3. Report with memory usage statistics
4. Include system specifications
