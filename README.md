# Draw.io MCP Server

A Model Context Protocol (MCP) server that enables Claude to create and manipulate Draw.io diagrams directly through conversation.

## Features

- Create new Draw.io diagram files
- Add various shapes (rectangles, ellipses, rhombus, cylinders, hexagons, clouds, etc.)
- Add connectors/arrows between shapes
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

## Available Tools

The MCP server provides the following tools:

1. **create_diagram** - Create a new Draw.io diagram file
2. **add_shape** - Add shapes (rectangle, ellipse, rhombus, cylinder, hexagon, cloud, step, parallelogram, trapezoid, triangle)
3. **add_connector** - Add connectors between shapes with different styles (straight, curved, orthogonal)
4. **read_diagram** - Read the raw XML content of a diagram
5. **list_shapes** - List all shapes in a diagram with their properties

## Path Handling

The server intelligently handles file paths across different platforms:

### Supported Path Formats

- **Relative paths**: `diagram.drawio` or `./diagrams/flowchart.drawio`
  - Resolved relative to the current working directory

- **Absolute paths**: `/Users/username/Documents/diagram.drawio`
  - Used as-is (validated for safety)

- **Home directory**: `~/Documents/diagram.drawio`
  - Expands `~` to your home directory

### Automatic Path Translation (macOS)

When Claude Desktop suggests paths like `/home/claude/diagram.drawio` on macOS, the server automatically translates them to your actual home directory:
- `/home/claude/diagram.drawio` → `/Users/yourusername/diagram.drawio`
- `/home/claude/Documents/test.drawio` → `/Users/yourusername/Documents/test.drawio`

This ensures seamless operation without manual path adjustments.

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
