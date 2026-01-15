# Draw.io MCP Server

A Model Context Protocol (MCP) server that enables Claude to create and manipulate Draw.io diagrams directly through conversation.

## Features

- Create new Draw.io diagram files
- Add various shapes (rectangles, ellipses, rhombus, cylinders, hexagons, clouds, etc.)
- Add connectors/arrows between shapes
- **Multi-line text support** - Use `\n` for line breaks in shape labels (great for class diagrams)
- Customize colors, positions, and sizes
- List and read existing diagrams
- Intelligent path resolution (supports relative, absolute, and ~ paths)
- Automatic path translation for cross-platform compatibility

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd draw-io-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration for Claude Desktop

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop config file:

### macOS
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Edit: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "draw-io": {
      "command": "node",
      "args": ["/absolute/path/to/draw-io-mcp/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/draw-io-mcp` with the actual path to this project directory.

After adding the configuration, restart Claude Desktop.

## Usage Examples

Once configured, you can ask Claude to create diagrams:

### Example 1: Simple Flowchart
```
Create a flowchart at ./flowchart.drawio with:
1. A "Start" rectangle at (100, 50)
2. A "Process Data" rectangle at (100, 150)
3. A "Decision" rhombus at (100, 250)
4. Connect them with arrows
```

### Example 2: Architecture Diagram
```
Create a system architecture diagram at ./architecture.drawio showing:
- A cloud shape for "Cloud Services"
- A cylinder for "Database"
- Rectangles for different services
- Connect them appropriately
```

### Example 3: Class Diagram with Multi-line Text
```
Create a class diagram for a Vehicle hierarchy with:
- A Vehicle class with attributes (brand, model) and methods (start, stop)
- A Car subclass with numDoors attribute
- A Motorcycle subclass with engineCC attribute
Use \n for line breaks to separate class name, attributes, and methods
```

The `\n` in shape text creates proper line breaks, so text like:
```
Vehicle\n---\n- brand: String\n+ start(): void
```
Renders as:
```
Vehicle
---
- brand: String
+ start(): void
```

## Available Tools

The MCP server provides the following tools:

1. **create_diagram** - Create a new Draw.io diagram file
2. **add_shape** - Add shapes (rectangle, ellipse, rhombus, cylinder, hexagon, cloud, step, parallelogram, trapezoid, triangle). Supports multi-line text with `\n`
3. **add_connector** - Add connectors between shapes with different styles (straight, curved, orthogonal)
4. **read_diagram** - Read the raw XML content of a diagram
5. **list_shapes** - List all shapes in a diagram with their properties

## Path Handling

**All diagrams are saved to your Desktop by default** to make it easy to find them. The server intelligently handles file paths across different platforms:

### Default Behavior

- **Simple filenames**: `diagram.drawio` → Saved to your Desktop
- **Relative paths**: `./flowchart.drawio` → Saved to your Desktop (subdirectories ignored)
- **Claude-suggested paths**: `/home/claude/test.drawio` → Saved to your Desktop

This makes it crystal clear where your files are - they're always on **YOUR computer's Desktop**, not on any remote machine.

### Supported Path Formats

- **Desktop (default)**: `diagram.drawio`
  - Saved to `~/Desktop/diagram.drawio`

- **Absolute paths**: `/Users/username/Documents/diagram.drawio`
  - Used as-is (validated for safety)
  - Lets you save to specific locations if needed

- **Home directory subdirectories**: `~/Documents/diagram.drawio`
  - Expands `~` and saves to the specified location
  - Useful for organizing diagrams in specific folders

### Automatic Path Translation

When Claude Desktop suggests paths like `/home/claude/diagram.drawio`, the server automatically translates them to your Desktop:
- `/home/claude/diagram.drawio` → `~/Desktop/diagram.drawio`
- `/home/claude/subfolder/test.drawio` → `~/Desktop/test.drawio`

This ensures you always know where your files are saved.

### Safety Features

The server prevents file creation in system directories (`/usr`, `/bin`, `/etc`, etc.) to protect your system.

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

## File Format

Draw.io files (.drawio) are XML-based files that can be opened with:
- Draw.io web app (https://app.diagrams.net)
- Draw.io desktop application
- VS Code with Draw.io extension

## License

MIT
