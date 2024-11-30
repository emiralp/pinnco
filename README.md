# Streamlined AI Context (SAC)

[Try it online at Pinn.co!](https://pinn.co)

Transform your codebase into an optimized AI-friendly format. Seamlessly integrate your entire project context with AI tools like Claude and ChatGPT.

## Why We Built This?

When working with AI tools like Claude or ChatGPT, I found myself constantly struggling with code sharing. Without using specialized IDEs, I had to either upload files separately or manually merge them. This tool magically transforms your project into AI-pastable content in seconds, and it's completely FREE! (Excluding node_modules and cache files for optimal performance)

## Features

### 🔄 Multiple Input Methods
- **Drag & Drop**: Simply drag your project files or folders directly into the interface
- **GitHub Integration**: Fetch repositories directly using URLs, with support for private repositories via Personal Access Tokens
- **Auto-Save**: Your GitHub credentials are securely saved locally for quick access

### ⚡ Smart Processing
- **Token Management**: Control output size with configurable token limits
- **Code Processing Options**:
  - Remove comments for cleaner context
  - Minify code to maximize token efficiency
- **Selective Processing**:
  - Customizable file type filtering
  - Exclude patterns for ignoring specific files/directories
  - Smart default exclusions (node_modules, cache files, etc.)

### 🔒 Security First
- **100% Local Processing**: All file processing happens in your browser
- **No Server Storage**: Your code never leaves your machine
- **Secure Credentials**: GitHub tokens are stored locally and securely

### 🎯 Optimization Features
- **Format Preservation**: Maintains code structure and readability
- **Smart Filtering**: Automatically excludes binary and unnecessary files
- **Size Management**: Handles large codebases with automatic chunking

## Technical Details

### Supported File Types
```
.js, .jsx, .ts, .tsx, .vue, .svelte, .html, .css, .scss,
.py, .rb, .go, .rs, .java, .kt, .swift, .cpp, .c, .cs,
.sql, .json, .yaml, .toml, .env, .md, .txt, .csv
```

### Default Exclusions
```
node_modules, vendor, dist, build, .git,
__pycache__, venv, .env, coverage, tmp
```

## Usage Tips

1. **For GitHub Repositories**:
   - Use the GitHub URL input for direct repository access
   - Add a Personal Access Token for private repositories
   - Settings are automatically saved for future use

2. **For Local Projects**:
   - Drag and drop your project folder
   - Use Advanced Settings to customize processing
   - Adjust token limits based on your AI tool's constraints

3. **Optimize Output**:
   - Enable comment removal for cleaner context
   - Use minification for larger codebases
   - Add custom exclude patterns for project-specific needs

## Try Our Other Tools

Check out our free AI tool suite: [Luw.ai](https://luw.ai?utm_source=PinnGit)

## About

Built by [Luvi Technologies](https://pinn.co), for developers. Streamline your AI workflow today.

---

🌟 Star us on [GitHub](https://github.com/emiralp/pinnco/) if you find this useful!

This tools works best with AI assistants like Claude and ChatGPT, transforming your development workflow into a more efficient and streamlined process.