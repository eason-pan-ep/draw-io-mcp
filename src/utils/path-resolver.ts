import * as path from "path";
import * as os from "os";

/**
 * Resolves file paths to absolute paths with intelligent defaults.
 *
 * Features:
 * - Translates /home/claude paths to user's Desktop
 * - Expands ~ to home directory
 * - Converts relative paths to Desktop
 * - Validates against system directories
 */
export function resolvePath(filepath: string): string {
  const desktopPath = path.join(os.homedir(), "Desktop");

  // Translate /home/claude paths to Desktop
  // This handles cases where Claude Desktop suggests /home/claude on macOS
  if (filepath.startsWith("/home/claude/")) {
    const filename = filepath.slice("/home/claude/".length);
    // Only use the filename, ignore any subdirectories
    const basename = path.basename(filename);
    filepath = path.join(desktopPath, basename);
  } else if (filepath === "/home/claude") {
    filepath = desktopPath;
  }

  // Expand ~ to home directory (keep user's specified path if they use ~)
  if (filepath.startsWith("~/")) {
    filepath = path.join(os.homedir(), filepath.slice(2));
  } else if (filepath === "~") {
    filepath = os.homedir();
  }

  // Convert relative paths to Desktop (instead of cwd)
  // This makes it very clear where files are being saved
  if (!path.isAbsolute(filepath)) {
    const basename = path.basename(filepath);
    filepath = path.join(desktopPath, basename);
  }

  // Validate the path is reasonable (not trying to create system directories)
  const normalizedPath = path.normalize(filepath);

  // Prevent creation in dangerous system directories on Unix-like systems
  if (process.platform !== "win32") {
    const invalidPrefixes = ["/usr", "/bin", "/sbin", "/etc", "/var", "/root"];
    for (const prefix of invalidPrefixes) {
      if (normalizedPath.startsWith(prefix)) {
        throw new Error(
          `Cannot create files in system directory: ${normalizedPath}. Please use a path in your home directory or Desktop.`
        );
      }
    }
  }

  return normalizedPath;
}
