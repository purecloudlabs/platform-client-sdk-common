# Developer Guide: CLI SDK Client Generator (`clisdkclient`)

---

## 1. ✨ Project Overview

### 🔍 Purpose
The `clisdkclient` is a custom CLI SDK Generator designed to produce Go-based command-line interfaces (CLIs) from OpenAPI (Swagger) specifications. Unlike traditional generators (e.g., Swagger Codegen or OpenAPI Generator), this tool is tailored to produce highly structured, extendable CLI applications using:

- Fine-grained command structures
- Custom operation mapping
- Mustache-based templating
- Post-processing pipelines
- **Multi-stage build process** with comprehensive logging

### ⚡ Key Differentiators
| Feature | `clisdkclient` | Traditional SDK Generators |
|--------|----------------|-----------------------------|
| CLI-native SDK | ✅ Yes (Go CLI commands) | ❌ Usually REST wrappers only |
| Swagger input support | ✅ Live URL and file path | ✅ Static input |
| Mustache templating | ✅ Yes | ✅ Yes (limited scope) |
| Post-process enhancement | ✅ Multi-stage pipeline | ❌ Minimal or none |
| Extendable command injection | ✅ via `extensions/` | ❌ Rare |
| **Build Performance** | ✅ **37-minute full build** | ❌ Variable |
| **Command Generation** | ✅ **87 top-level commands, 1,896 API paths** | ❌ Limited |

---

## 2. 📂 Project Structure

### ▶ Source (`resources/sdk/clisdkclient/`)

```
clisdkclient/
├── config.json                 # Primary SDK generator config
├── localconfig.yml            # Local override config
├── templates.zip              # Compressed template files
├── scripts.zip                # Compressed script files
├── extensions/                # Custom Go command code
│   ├── go.mod                 # Go module dependencies
│   ├── go.sum                 # Dependency checksums
│   ├── gc.go                  # Main entry point
│   ├── config/                # Configuration management
│   │   └── config.go          # Profile, OAuth, proxy settings
│   ├── services/              # Command execution services
│   │   ├── commandservice.go  # HTTP methods, pagination
│   │   └── commandservice_test.go
│   ├── utils/                 # Utility functions
│   │   ├── general.go         # Flags, formatting, PKCE
│   │   ├── filter.go          # Data filtering
│   │   ├── render.go          # Output rendering
│   │   └── testutils.go       # Testing utilities
│   ├── logger/                # Logging system
│   │   └── logger.go          # Multi-level logging
│   ├── retry/                 # Retry mechanism
│   │   └── retry.go           # Configurable retry policies
│   ├── restclient/            # HTTP client
│   │   ├── restclient_test.go # REST client tests
│   │   └── tls/               # TLS certificate generation
│   ├── models/                # Data models
│   ├── cmd/                   # Command implementations
│   │   ├── profiles/          # Profile management
│   │   ├── logging/           # Logging commands
│   │   ├── autopagination/    # Pagination settings
│   │   └── [10 other cmd dirs]
│   └── [other extension dirs]
├── scripts/                   # TypeScript build scripts
│   ├── preprocess-swagger.ts  # Swagger processing
│   ├── prebuild-postrun.ts    # Configuration setup
│   ├── postbuild-postrun.ts   # Finalization
│   ├── post-process.ts        # Core CLI generation
│   ├── generate-operationid-mappings.ts
│   ├── resourceDefinitions.ts # TypeScript interfaces
│   ├── publishBrew.sh         # Homebrew publishing
│   ├── generate-docs.sh       # Documentation generation
│   └── rename-module.sh       # Empty placeholder
├── templates/                 # Mustache templates
│   ├── api.mustache           # Main API command template
│   ├── api_json.mustache      # API documentation JSON
│   ├── root.mustache          # Root command template
│   ├── restclient.mustache    # HTTP client template
│   ├── model.mustache         # Data model template
│   ├── gitignore.mustache     # Git ignore template
│   ├── Makefile.mustache      # Build automation
│   ├── README.md              # CLI documentation template
│   └── operation_example.mustache # Command example
└── resources/
    └── operationNameOverrides.json # Operation name mappings
```

### ▶ Output (`output/clisdkclient/`)

```
clisdkclient/
├── README.md                  # CLI SDK usage guide
├── Makefile                   # Build automation script
├── swagger.json               # Processed OpenAPI spec
├── APIData.json               # Final model for Mustache rendering
├── version.json               # Version metadata
├── docs/                      # Operation group JSONs
├── build/                     # Generated Go source code
│   └── gc/                    # Main CLI package
│       ├── cmd/               # Generated command files
│       ├── models/            # Generated data models
│       ├── services/          # Generated services
│       └── utils/             # Generated utilities
└── notificationMappings.json  # Notification to command mappings (if any)
```

---

## 3. ⚙️ Prerequisites

### System Requirements
| Requirement | Details |
|-------------|---------|
| OS | Linux / macOS / Windows WSL2 |
| Language | **Go (>= 1.23.0)** |
| **Java** | **Required for OpenAPI Generator (JAR execution)** |
| **Node.js** | **Required for post-process scripts (TypeScript-based)** |
| **curl** | **Required for Swagger downloads** |

### Required Tools
- **Go 1.23.0+** for building the generated CLI
- **Java 8+** for OpenAPI Generator execution
- **Node.js + npm** for pre/post-processing stages
- **Make** (or compatible shell) for running automated tasks
- **Git** for repository cloning
- **PowerShell** (Windows) or **Bash** (Linux/macOS) for script execution

### Setup Instructions
```sh
# Install Go 1.23.0+ and Node.js (ensure both are in PATH)
# Install Java 8+ for OpenAPI Generator
# Install curl for Swagger downloads

# Optional: install Mustache CLI for template testing
npm install -g mustache

# Clone SDK generator repo (if using Git)
git clone <your-sdk-repo>
cd platform-client-sdk-common
```

---

## 4. 🧰 Frameworks, Libraries, and Tools Used

| Tool/Library | Purpose |
|--------------|---------|
| **Go 1.23.0** | Language for generated CLI SDK |
| **Mustache** | Template engine for SDK code generation |
| **Node.js / TypeScript** | Used for scripting pre-/post-processors |
| **Swagger (OpenAPI)** | Source specification for all API command generation |
| **Commander (Node)** | Likely used in dev tooling to parse CLI arguments |
| **Cobra (Go)** | CLI framework for generated commands |
| **Viper (Go)** | Configuration management |
| **OpenAPI Generator** | Core code generation engine |

---

## 5. 🔄 How It Works: Input ➜ Output Pipeline

### **Build Process Overview**

1. **SDK Builder Script** (Initialization)
   - Entry point: `sdkBuilder.ts`
   - Detects the SDK type (`clisdkclient`) and invokes the full pipeline  

2. **Prebuild Stage**
   - **Git Repository Cloning:** Clones `platform-client-sdk-cli` repository
   - **Swagger Preprocessing:** Handled by `preprocess-swagger.ts`
     - Downloads Swagger spec from live URLs
     - Applies overrides and filters
     - **Processes 1,896 API paths into 87 top-level commands**
     - Outputs intermediate files: `newSwagger.json`, `topLevelCommands.json`, `resourceDefinitions.json`
   - **Version + Config Merge:** Handled by `prebuild-postrun.ts`
     - Loads `config.json` and `version.json`
     - Merges into a unified configuration object
   - **Proxy Setup:** Executes `proxy-npm.ts` for network configuration

3. **Build Stage**
   - **OpenAPI Generator Execution:** Runs swagger-codegen with clisdkclient language
     - **Command:** `java -jar openapi-generator-cli.jar generate -g clisdkclient`

   - **Post-processing Pipeline:** Handled by `post-process.ts`
     - Generates CLI structure using templates and intermediate JSON
     - Produces final file trees: command files, help files, root commands
     - **Creates 87 command groups with 1,896 API operations**

4. **Postbuild Stage**
   - **Post-Build Cleanup & Finalization:** Handled by `postbuild-postrun.ts`
     - Final path checks, file moves, cleanup, metadata additions
     - **File operations and validation**

---

## 6. 📘 Swagger/OpenAPI Usage

- Swagger spec is used as the **single source of truth** for command creation
- **Live Swagger URLs:**
  - Main: `https://api.mypurecloud.com/api/v2/docs/swagger`
  - Preview: `https://api.mypurecloud.com/api/v2/docs/swaggerpreview`
- Operations (`operationId`) are translated into command names
- Parameters, request bodies, and response structures are extracted to:
  - Create CLI flags
  - Validate inputs
  - Populate help text

### Intermediate Artifacts
- `newSwagger.json` — Cleaned-up spec for processing
- `topLevelCommands.json` — Built from Swagger tags and paths (87 commands)
- `resourceDefinitions.json` — Maps each resource's methods and structure (1,896 definitions)

---

## 7. 🧩 Mustache Template Usage

- All code generation is driven by **Mustache templates** stored in `resources/templates/`
- **Template Files:**
  - `api.mustache` : Template for API command files
  - `root.mustache` : Root `cmd/root.go` entrypoint
  - `restclient.mustache` : HTTP client implementation
  - `model.mustache` : Data model generation
  - `gitignore.mustache` : Git ignore file
  - `Makefile.mustache` : Build automation
  - `README.md` : CLI documentation
  - `api_json.mustache` : API documentation JSON
  - `operation_example.mustache` : Command examples

### Template Rendering
Input JSON like `APIData.json` and `resourceDefinitions.json` are passed to Mustache to render the templates. Variables in templates are derived from the Swagger paths, methods, parameters, and operationIds.

Example Variable:
```mustache
{{operationName}} => list-users
{{httpMethod}} => GET
{{path}} => /api/v2/users
```

The `api.mustache` file specifically defines:
- Cobra-based command registration
- Description, permission help text
- Flag generation from queryParams
- HTTP path/method binding
- Retry configuration and HTTP call logic

It also imports:
```go
import (
  "fmt"
  "net/url"
  "strings"
  "time"
  "github.com/spf13/cobra"
  "github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
  "github.com/mypurecloud/platform-client-sdk-cli/build/gc/retry"
  "github.com/mypurecloud/platform-client-sdk-cli/build/gc/services"
  "github.com/mypurecloud/platform-client-sdk-cli/build/gc/utils"
  "github.com/mypurecloud/platform-client-sdk-cli/build/gc/models"
)
```

---

## 8. ⚙️ CLI SDK Generator Behavior

The `clisdkclient` generator differs from standard OpenAPI generators by producing:

- **Fully structured Go-based CLI command files**
- **Commands mapped to `cobra.Command` entries with logical nesting**
- **Commands grouped by Swagger tag or path prefix into subfolders**
- **Command structure defined using intermediate JSON (`topLevelCommands.json` and `resourceDefinitions.json`)**
- **87 top-level command groups with 1,896 API operations**

Where Swagger Codegen might only generate HTTP wrappers, this tool:
- Parses Swagger and derives command usage syntax
- Embeds retry logic, permissions metadata, and usage documentation
- Injects extensibility points via the `extensions/` directory
- **Supports multiple OAuth grant types** (Client Credentials, Implicit, PKCE)
- **Provides comprehensive logging and configuration management**

---

## 9. 🛠️ Custom Processing & Enhancements

### **Operation Name Overrides**
File: `operationNameOverrides.json`
- Maps specific `operationId`s to CLI-friendly command names
- **114 operation overrides** applied during processing
- Avoids awkward or overly verbose command names derived directly from API

### **Extensions Directory** (Comprehensive Go Codebase)
Path: `extensions/`
- **13 command subdirectories** with custom Go implementations
- **Services package** - HTTP methods, pagination, retry logic
- **Utils package** - Flags, formatting, PKCE, filtering
- **Config package** - Profile management, OAuth, proxy settings
- **Logger package** - Multi-level logging with platform-specific paths
- **Retry package** - Configurable retry policies with exponential backoff
- **Models package** - Data structures and interfaces
- **REST Client package** - HTTP client with TLS support

### **Command Categories Generated**
- **Profiles** - Configuration management 
- **Logging** - Log file management 
- **Autopagination** - Pagination settings 
- **Alternative Formats** - Output formatting
- **Completion** - Shell completion
- **Experimental** - Experimental features
- **Gateway** - Gateway configuration
- **Proxy** - Proxy settings
- **Notifications** - Notification channels
- **Usage Query** - API usage queries
- **Groups Members** - Group management
- **Dummy Command** - Testing commands

---

## 10. ⚠️ Gotchas & Tips

| Area | Tip or Warning |
|------|----------------|
| **Missing operationId** | Commands won't generate without a unique `operationId` |
| **Swagger format issues** | Ensure valid OpenAPI 2.0/3.0 spec — strict parsing enforced |
| **JSON escaping** | Description or param values with quotes must be escaped correctly |
| **Mustache variables** | Ensure input JSON matches exactly what templates expect |
| **File path issues** | Scripts are sensitive to full path names on Windows vs Linux |
| **Memory usage** | Large Swagger files (1,896 paths) require sufficient memory |
| **Build time** | Full build takes ~37 minutes - plan accordingly |
| **Java requirement** | OpenAPI Generator requires Java 8+ installation |
| **Network access** | Requires internet access for Swagger downloads |

---

## 12. 🔄 How API Operations Become CLI Commands

Every REST API operation from the Swagger spec is transformed into a CLI command through the following steps:

### **Translation Flow:**
1. **Extract `operationId` from Swagger**
   - This becomes the CLI subcommand name (e.g., `get-user`, `create-profile`)

2. **Apply operation name overrides** (optional)
   - Via `operationNameOverrides.json` to map `getUserById` → `get`
   - **114 overrides applied** during processing

3. **Group by API Tag**
   - Tags in Swagger (e.g., `users`, `analytics`) become command groups
   - **87 top-level command groups** created

4. **Render via Mustache**
   - Template like `api.mustache` defines structure: imports, command registration, flags, usage

5. **Resulting Output:**
   - Each tag → folder in Go
   - Each operation → command registered via `cobra.Command`
   - **1,896 API operations** processed into CLI commands

### **Command File Example (Rendered):**
```go
var getCmd = &cobra.Command{
  Use:   "get",
  Short: "Get user by ID",
  Long:  "Retrieve detailed information about a user",
  Run: func(cmd *cobra.Command, args []string) {
    ... // HTTP request logic
  },
}
```

### **🔁 TypeScript Files Involved in the Sequence**

| TypeScript File | Role in the Workflow |
|------------------|------------------------|
| `sdkBuilder.ts` | Entry point to start SDK generation. Parses command-line arguments and triggers generation for `clisdkclient`. |
| `preprocess-swagger.ts` | Downloads and preprocesses the raw Swagger spec. Applies any overrides and creates `topLevelCommands.json`, `resourceDefinitions.json`, and `newSwagger.json`. **Processes 1,896 API paths in ~37 seconds**. |
| `prebuild-postrun.ts` | Loads `version.json` and merges with other runtime config to produce complete input metadata. |
| `post-process.ts` | Translates processed Swagger into CLI structure. Passes content into Mustache templates like `api.mustache`. **Generates 87 command groups in ~2 minutes**. |
| `postbuild-postrun.ts` | Finalizes the output: validates paths, may move or rename files, and prepares the output for packaging. |

Each stage passes artifacts to the next, forming a modular and maintainable pipeline.

---

## 13. 🧾 Command Documentation Generation

### **🧠 Script Responsible for `docs/*.json` Generation**

The JSON documentation files under `output/clisdkclient/docs/*.json` are generated by:

- **`post-process.ts`** — this script uses `newSwagger.json` as its primary input. It analyzes Swagger tags and operations directly from the preprocessed spec.
- It then groups operations by tag and emits one JSON file per domain (e.g., `analytics.json`, `users.json`).
- **87 documentation files** generated (one per command group)
- Each file includes metadata such as:
  - CLI command structure and descriptions
  - HTTP methods and endpoint paths
  - Required permissions and parameter descriptions

This documentation generation is executed in tandem with Go command rendering via Mustache templates such as `api.mustache`.

CLI documentation is auto-generated using:

### **Source:**
- Swagger `description`, `summary`, `parameters`, and `responses`
- Embedded inline in templates via Mustache tags (e.g., `{{description}}`, `{{required}}`, `{{allowableValues}}`)

### **Output Locations:**
- In-code help text (embedded via `cobra.Command`'s `Short`, `Long` fields)
- Files in `/docs/*.json` summarizing each domain/tag and operations

### **Example:**
```go
Short: "Create a new user",
Long: `Create a user using a POST operation. Permissions required: users:create.`,
```

These elements support both:
- CLI runtime help (`mycli users create --help`)
- Tooling/UI integration for generating Markdown or HTML docs externally

---

## 14. 🔍 Supporting Scripts: Roles and Dependencies

Below is a breakdown of important TypeScript files in `sdk/clisdkclient/scripts` and how they contribute to the CLI SDK generation lifecycle:

| Script File | Purpose |
|-------------|---------|
| `generate-operationid-mappings.ts` | Creates mappings between Swagger operationIds and CLI-friendly names; often used to detect and normalize naming consistency across resources. |
| `preprocess-swagger.ts` | Loads Swagger spec (from URL or file), applies overrides, and generates intermediate JSON files (`newSwagger.json`, `topLevelCommands.json`, `resourceDefinitions.json`). **Processes 1,896 API paths**. |
| `resourceDefinitions.ts` | Contains logic to define CLI resource groupings (mapping operations to command categories/tags), consumed during post-processing. |
| `prebuild-postrun.ts` | Prepares version and configuration context used by template rendering — merges `config.json`, `version.json`, and dynamic overrides. |
| `post-process.ts` | Core logic for stitching together CLI files: parses resources and templates (`api.mustache`) to emit Go source code using Mustache. **Generates 87 command groups**. |
| `postbuild-postrun.ts` | Final cleanup step. Validates generated output, post-processes formatting, and manages destination folder structure. |
| `publishBrew.sh` | Homebrew publishing script for macOS distribution. |
| `generate-docs.sh` | Documentation generation script for CLI help files. |

### **How They Connect (Log Correlation):**
The logs show the following execution order:

1. `sdkBuilder.ts` triggers the process (via CLI input).
2. `preprocess-swagger.ts` fetches and refines API spec (**37 seconds**).
3. `prebuild-postrun.ts` prepares runtime version metadata.
4. `post-process.ts` invokes Mustache templates to generate commands (**2 minutes**).
5. `postbuild-postrun.ts` validates and formats the final output.

Each of these files can be run as standalone steps or chained in a CI/CD pipeline.

