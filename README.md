# OpenRouter Key Manager

A Node.js library and CLI tool for [creating and managing](https://openrouter.ai/docs/features/provisioning-api-keys) [OpenRouter.ai](https://openrouter.ai/) API keys with flexible tagging and bulk operations.

## Features

- **Bulk Operations**: Create, delete, rotate, and adjust limits for multiple keys at once
- **Flexible Tagging**: Organize API keys with custom tags for easy filtering
- **Usage Tracking**: Monitor spending and generate detailed HTML reports
- **Pattern Matching**: Use glob patterns to manage groups of keys
- **Key Rotation**: Securely rotate keys while preserving names and limits
- **CSV-Based**: Simple CSV input/output for easy integration
- **Programmatic API**: Use as a library in your applications

## Installation

```bash
npm install openrouter-key-manager
```

Or run directly with `npx`:

```bash
npx openrouter-key-manager@latest [command] [options]
```

## Prerequisites

You need an **OpenRouter.ai Provisioning API Key**. Get one from your [OpenRouter.ai account dashboard](https://openrouter.ai/settings/keys).

Provide your **OpenRouter.ai Provisioning API Key** in one of two ways:

**Environment Variable (recommended):**

```bash
export OPENROUTER_PROVISIONING_KEY=your_provisioning_key_here
```

**Command Line Argument (CLI only):**

```bash
openrouter-key-manager --provisioning-key your_key_here [command]
```

## Usage

### CLI Usage

See the [CLI Commands](#commands) section below for detailed command documentation.

### Library Usage

Import and use the library functions in your application:

```typescript
import {
  create,
  bulkCreate,
  list,
  destroy,
  disable,
  enable,
  setLimit,
  rotate,
  report,
} from "openrouter-key-manager";

// Create a single key
const key = await create({
  provisioningKey: "your-provisioning-key",
  email: "alice@example.com",
  tags: ["CCP555", "student"],
  limit: 15,
});

console.log(`Created key: ${key.apiKey}`);
console.log(`Hash: ${key.hash}`);

// List all keys
const keys = await list({
  provisioningKey: "your-provisioning-key",
  includeDisabled: false,
});

console.log(`Found ${keys.length} active keys`);

// Disable a key
const result = await disable({
  provisioningKey: "your-provisioning-key",
  hash: key.hash,
});

console.log(`Disabled ${result.modified.length} key(s)`);

// Generate an HTML report
const reportResult = await report({
  provisioningKey: "your-provisioning-key",
  pattern: "*CCP555*",
});

// Save the HTML report
await writeFile("report.html", reportResult.html);
```

#### Library API Reference

All library functions accept an options object with a `provisioningKey` property, or you can pass it via environment variable:

```typescript
// Option 1: Pass provisioning key directly
const key = await create({
  provisioningKey: "your-key",
  email: "alice@example.com",
  limit: 15,
});

// Option 2: Use environment variable
process.env.OPENROUTER_PROVISIONING_KEY = "your-key";
const key = await create({
  email: "alice@example.com",
  limit: 15,
});
```

- **`create(options)`** - Create a single API key

  ```typescript
  interface CreateOptions {
    provisioningKey?: string;
    email: string;
    limit: number;
    tags?: string[];
    date?: string; // YYYY-MM-DD
  }
  ```

- **`bulkCreate(file, options)`** - Create multiple keys from CSV/JSON

  ```typescript
  interface BulkCreateOptions {
    provisioningKey?: string;
    limit: number;
    date?: string;
    delimiter?: string;
    skipHeader?: boolean;
  }
  ```

- **`list(options)`** - List API keys

  ```typescript
  interface ListOptions {
    provisioningKey?: string;
    pattern?: string;
    includeDisabled?: boolean;
  }
  ```

- **`destroy(options)`** - Delete API keys

  ```typescript
  interface DestroyOptions {
    provisioningKey?: string;
    pattern?: string;
    hash?: string;
  }
  ```

- **`disable(options)`** / **`enable(options)`** - Disable/enable keys

  ```typescript
  interface DisableOptions {
    provisioningKey?: string;
    pattern?: string;
    hash?: string;
  }
  ```

- **`setLimit(options)`** - Update spending limits

  ```typescript
  interface SetLimitOptions {
    provisioningKey?: string;
    pattern?: string;
    hash?: string;
    limit: number;
  }
  ```

- **`rotate(options)`** - Rotate API keys

  ```typescript
  interface RotateOptions {
    provisioningKey?: string;
    pattern?: string;
    hash?: string;
  }
  ```

- **`report(options)`** - Generate HTML usage report

  ```typescript
  interface ReportOptions {
    provisioningKey?: string;
    pattern?: string;
    includeDisabled?: boolean;
  }
  ```

## Quick Start

### 1. Create API Keys for Multiple Users

Create a CSV file with user information, including their `email` and one or more `tag`s (every column after `email` is considered a tag):

**accounts.csv:**

```csv
email,course,role
alice@example.com,CCP555,student
bob@example.com,CCP555,student
carol@example.com,CCP555,professor
```

Use this file to create keys for each user with the specified spending limit (limits are per user and in US dollars):

```bash
openrouter-key-manager bulk-create --limit 15 accounts.csv
```

This will generate API Keys for all users in `accounts.csv` and create a CSV file (e.g., `CCP555-student-2025-01-15.csv`) containing the newly created keys:

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-def456...,hash-def456...
carol@example.com CCP555 professor 2025-01-15,sk-or-v1-ghi789...,hash-ghi789...
```

**Important:**

- The `key` column contains the actual API keys to distribute to users
- The `hash` column is used for management operations (list, disable, delete, rotate)
- **Keep this CSV file secure** - it contains sensitive API keys

### 2. Monitor Usage

List all active keys (use `--include-disabled` to see all keys):

```bash
openrouter-key-manager list
```

By default, the `name` and `hash` columns are truncated for readability. Use `--full` to see complete values:

```bash
openrouter-key-manager list --full
```

List keys by pattern (e.g., email or tag):

```bash
openrouter-key-manager list --pattern "*CCP555*"
```

Generate a detailed HTML report for all or some keys:

```bash
openrouter-key-manager report --pattern "*CCP555*"
```

### 3. Adjust Spending Limits

Increase limits for students running low on credits:

```bash
# Single key by hash
openrouter-key-manager set-limit --hash abc123... --limit 25 -y

# All students in a course
openrouter-key-manager set-limit --pattern "*CCP555*student*" --limit 25 -y

# Bulk update from CSV
openrouter-key-manager bulk-set-limit --limit 25 CCP555-student-2025-01-15.csv -y
```

### 4. Rotate Keys

Rotate keys for security (generates new keys with same names and limits):

```bash
# Rotate specific key
openrouter-key-manager rotate --hash abc123... -y

# Rotate all keys for a course
openrouter-key-manager rotate --pattern "*CCP555*" -y

# Bulk rotate from CSV
openrouter-key-manager bulk-rotate CCP555-student-2025-01-15.csv -y
```

### 5. Manage Keys

Disable keys temporarily:

```bash
openrouter-key-manager disable --pattern "*CCP555*student*" -y
```

Re-enable keys:

```bash
openrouter-key-manager enable --pattern "*CCP555*student*" -y
```

Delete keys permanently:

```bash
# Delete by pattern
openrouter-key-manager delete --pattern "*CCP555*" -y

# Or delete using the hash from your CSV
openrouter-key-manager delete --hash abc123... -y
```

## Commands

### `create`

Create a single API key and save it to a CSV file.

```bash
openrouter-key-manager create [options]
```

**Required Options:**

- `-l, --limit <amount>` - Spending limit in US dollars (e.g., `10` for $10)
- `-e, --email <email>` - User's email address

**Optional:**

- `-t, --tags <tags...>` - Space-separated tags (e.g., `"CCP555 student"`)
- `-d, --date <date>` - Issue date in `YYYY-MM-DD` format (default: today)
- `-o, --output <file>` - CSV output filename (default: auto-generated)

**Examples:**

```bash
# Create key with tags
openrouter-key-manager create \
  --limit 10 \
  --email alice@example.com \
  --tags "CCP555 student"

# Create key without tags
openrouter-key-manager create \
  --limit 10 \
  --email bob@example.com

# Specify custom output filename
openrouter-key-manager create \
  --limit 10 \
  --email alice@example.com \
  --tags CCP555 student \
  --output alice-key.csv
```

**Output:**

Creates a CSV file with the key `name`, `key`, and `hash` columns:

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
```

- **name**: The key identifier (email + tags + date)
- **key**: The actual API key to give to the user
- **hash**: The key's unique identifier for management operations

**Default Filename:** `{email}-{date}.csv` or `{tags}-{date}.csv`

---

### `bulk-create`

Create API keys for multiple users from a CSV/TSV file.

```bash
openrouter-key-manager bulk-create [options] <file>
```

**Arguments:**

- `<file>` - CSV or TSV file with account information

**Required Options:**

- `-l, --limit <amount>` - Spending limit in US dollars (e.g., `10` for $10)

**Optional:**

- `-d, --date <date>` - Issue date in `YYYY-MM-DD` format (default: today)
- `--delimiter <char>` - Field delimiter (auto-detected: `.csv`=`,`,
  `.tsv`=`\t`)
- `--skip-header [boolean]` - Skip first row (default: `true`)
- `-o, --output <file>` - CSV output filename (default: auto-generated)

**Input File Format:**

The input CSV must have `email` as the first column. All subsequent columns
are treated as `tag`s (optional):

```csv
email,tag1,tag2,tag3
alice@example.com,CCP555,student,section-A
bob@example.com,CCP555,student,section-B
carol@example.com,CCP555,professor
dave@example.com
```

**Key Points:**

- First column: email (required)
- Remaining columns: tags (optional)
- Empty tag cells are ignored
- Rows can have just email with no tags

**Examples:**

```bash
# Create keys with default output filename
openrouter-key-manager bulk-create --limit 10 accounts.csv

# Specify custom output filename
openrouter-key-manager bulk-create \
  --limit 10 \
  --output ccp555-keys.csv \
  accounts.csv

# Use TSV file
openrouter-key-manager bulk-create --limit 10 accounts.tsv

# Specify custom delimiter
openrouter-key-manager bulk-create \
  --limit 10 \
  --delimiter "|" \
  accounts.txt
```

**Output:**

Creates a CSV file with `name`, `key`, and `hash` columns:

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-def456...,hash-def456...
```

- **name**: The key identifier (email + tags + date)
- **key**: The actual API key to distribute to users
- **hash**: The key's unique identifier for management operations

**Default Filename:** `{tags}-{date}.csv` (e.g., `CCP555-student-2025-01-15.csv`)

**Security Note:** This CSV contains actual API keys. Store it securely and distribute keys to users through secure channels.

---

### `list`

List API keys with usage information.

```bash
openrouter-key-manager list [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--include-disabled` - Include disabled keys (default: false)
- `-f, --format <format>` - Output format: `table`, `json`, or `csv`
  (default: `table`)
- `-o, --output <file>` - Write to file instead of stdout
- `--full` - Show full name and hash (default: truncated)

**Examples:**

```bash
# List all active keys (truncated display)
openrouter-key-manager list

# List with full name and hash
openrouter-key-manager list --full

# List keys matching a pattern
openrouter-key-manager list --pattern "*CCP555*"

# List keys for a specific user
openrouter-key-manager list --pattern "alice@example.com*"

# Include disabled keys
openrouter-key-manager list --include-disabled

# Export to CSV
openrouter-key-manager list \
  --pattern "*CCP555*" \
  --format csv \
  --output ccp555-status.csv
```

**Output Fields:**

- `name` - Key name (email + tags + date)
  - **Default**: Truncated at first space (shows email only)
  - **With `--full`**: Complete name
- `hash` - Key hash identifier (for management operations)
  - **Default**: First 7 characters
  - **With `--full`**: Complete hash
- `remaining` - Remaining budget in dollars
- `disabled` - Whether the key is disabled

**Note:** The `list` command does **not** show the actual API keys for
security reasons. It only shows the hash, which can be used for management
operations.

**Truncation Behavior:**

By default, the table format truncates columns for readability:

- `name`: Shows only the email (splits at first space)
- `hash`: Shows first 7 characters

Use `--full` to see complete values. JSON and CSV formats always show full values.

**CSV Output Format:**

```csv
name,hash,remaining,disabled
alice@example.com CCP555 student 2025-01-15,hash-abc123...,8.45,false
bob@example.com CCP555 student 2025-01-15,hash-def456...,2.10,false
```

**Glob Patterns:**

Use standard glob wildcards (quote to avoid shell expansion):

- `*` - Match any characters
- `?` - Match single character
- `**` - Match across separators

Examples:

- `"*CCP555*"` - All keys with CCP555 tag
- `"alice@example.com*"` - All keys for alice
- `"*2025-01-15*"` - All keys from specific date
- `"*CCP555*student*"` - Keys with both tags

---

### `set-limit`

Set the spending limit for one or more API keys.

```bash
openrouter-key-manager set-limit [options]
```

**Required Options:**

- `-l, --limit <amount>` - New spending limit in US dollars (e.g., `25` for $25)

**Other Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to update
- `-y, --confirm` - Skip confirmation prompt

**Note:** Either `--pattern` or `--hash` is required (but not both).

**Examples:**

```bash
# Update specific key by hash
openrouter-key-manager set-limit --hash hash-abc123... --limit 25 -y

# Update all keys matching pattern (with confirmation)
openrouter-key-manager set-limit --pattern "*CCP555*student*" --limit 25

# Update all keys for a user
openrouter-key-manager set-limit --pattern "alice@example.com*" --limit 30 -y

# Increase limits for all students in a course
openrouter-key-manager set-limit --pattern "*CCP555*" --limit 20 -y
```

**Use Cases:**

- Students running low on credits mid-semester
- Adjusting budgets for final projects
- Increasing limits for TAs or professors
- Bulk budget adjustments

---

### `bulk-set-limit`

Set spending limits for multiple API keys using a CSV or JSON file.

```bash
openrouter-key-manager bulk-set-limit [options] <file>
```

**Arguments:**

- `<file>` - CSV or JSON file with key information

**Required Options:**

- `-l, --limit <amount>` - New spending limit in US dollars (e.g., `25` for $25)

**Other Options:**

- `--delimiter <char>` - Field delimiter for CSV (auto-detected)
- `--skip-header [boolean]` - Skip first row (default: true)
- `-y, --confirm` - Skip confirmation prompt

**Input File Format:**

You can use the CSV file created by `create` or `bulk-create`, or create a simple CSV with just `name` and `hash` columns:

**CSV (from bulk-create):**

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-def456...,hash-def456...
```

**CSV (minimal):**

```csv
name,hash
alice@example.com CCP555 student 2025-01-15,hash-abc123...
bob@example.com CCP555 student 2025-01-15,hash-def456...
```

**JSON:**

```json
[
  {
    "name": "alice@example.com CCP555 student 2025-01-15",
    "hash": "hash-abc123..."
  },
  {
    "name": "bob@example.com CCP555 student 2025-01-15",
    "hash": "hash-def456..."
  }
]
```

**Examples:**

```bash
# Update limits using CSV from bulk-create
openrouter-key-manager bulk-set-limit \
  --limit 25 \
  CCP555-student-2025-01-15.csv -y

# Update with confirmation prompt
openrouter-key-manager bulk-set-limit \
  --limit 30 \
  CCP555-keys.csv

# Update using JSON file
openrouter-key-manager bulk-set-limit \
  --limit 20 \
  keys.json -y
```

**Use Cases:**

- Mid-semester budget increases for entire class
- Adjusting limits for specific groups
- Restoring limits after temporary reductions

---

### `rotate`

Rotate one or more API keys by deleting the old key and creating a new one with the same name and limit. **This generates new API keys that must be distributed to users.**

```bash
openrouter-key-manager rotate [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to rotate
- `-y, --confirm` - Skip confirmation prompt
- `-o, --output <file>` - CSV output file (default: auto-generated)

**Note:** Either `--pattern` or `--hash` is required (but not both).

**Examples:**

```bash
# Rotate specific key by hash
openrouter-key-manager rotate --hash hash-abc123... -y

# Rotate all keys matching pattern (with confirmation)
openrouter-key-manager rotate --pattern "*CCP555*"

# Rotate all keys for a user
openrouter-key-manager rotate --pattern "alice@example.com*" -y

# Rotate with custom output filename
openrouter-key-manager rotate \
  --pattern "*CCP555*" \
  --output ccp555-rotated-keys.csv -y
```

**Output:**

Creates a CSV file with the new keys:

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-xyz789...,hash-xyz789...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-uvw456...,hash-uvw456...
```

**Important:**

- Old keys are **permanently deleted**
- New keys have the **same name and limit** as the old keys
- Users **must update** to the new API keys
- The old API keys will **no longer work**

**Use Cases:**

- Security incident response (compromised keys)
- Semester transitions (reuse same key names)
- Periodic security rotation policy
- Revoking access while maintaining key structure

**Default Filename:** `rotated-{date}.csv`

---

### `bulk-rotate`

Rotate multiple API keys using a CSV or JSON file.

```bash
openrouter-key-manager bulk-rotate [options] <file>
```

**Arguments:**

- `<file>` - CSV or JSON file with key information

**Options:**

- `--delimiter <char>` - Field delimiter for CSV (auto-detected)
- `--skip-header [boolean]` - Skip first row (default: true)
- `-y, --confirm` - Skip confirmation prompt
- `-o, --output <file>` - CSV output file (default: auto-generated)

**Input File Format:**

You can use the CSV file created by `create` or `bulk-create`, or create a simple CSV with just `name` and `hash` columns:

**CSV (from bulk-create):**

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-def456...,hash-def456...
```

**CSV (minimal):**

```csv
name,hash
alice@example.com CCP555 student 2025-01-15,hash-abc123...
bob@example.com CCP555 student 2025-01-15,hash-def456...
```

**JSON:**

```json
[
  {
    "name": "alice@example.com CCP555 student 2025-01-15",
    "hash": "hash-abc123..."
  },
  {
    "name": "bob@example.com CCP555 student 2025-01-15",
    "hash": "hash-def456..."
  }
]
```

**Examples:**

```bash
# Rotate using CSV from bulk-create
openrouter-key-manager bulk-rotate CCP555-student-2025-01-15.csv -y

# Rotate with confirmation prompt
openrouter-key-manager bulk-rotate CCP555-keys.csv

# Rotate using JSON file
openrouter-key-manager bulk-rotate keys.json -y

# Specify custom output filename
openrouter-key-manager bulk-rotate \
  --output ccp555-new-keys.csv \
  CCP555-old-keys.csv -y
```

**Output:**

Creates a CSV file with the new keys:

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-xyz789...,hash-xyz789...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-uvw456...,hash-uvw456...
```

**Important:**

- Old keys are **permanently deleted**
- New keys have the **same names and limits** as the old keys
- Users **must update** to the new API keys
- The old API keys will **no longer work**

**Use Cases:**

- Rotating all keys at semester end
- Security incident affecting multiple users
- Implementing periodic rotation policy
- Migrating to new key generation

**Default Filename:** `rotated-{date}.csv`

---

### `disable`

Disable one or more API keys. Disabled keys cannot be used but can be re-enabled later.

```bash
openrouter-key-manager disable [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to disable
- `-y, --confirm` - Skip confirmation prompt

**Note:** Either `--pattern` or `--hash` is required (but not both).

**Examples:**

```bash
# Disable specific key by hash
openrouter-key-manager disable --hash hash-abc123... -y

# Disable all keys matching pattern (with confirmation)
openrouter-key-manager disable --pattern "*CCP555*"

# Disable all keys for a user
openrouter-key-manager disable --pattern "alice@example.com*" -y
```

---

### `enable`

Re-enable one or more previously disabled API keys.

```bash
openrouter-key-manager enable [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to enable
- `-y, --confirm` - Skip confirmation prompt

**Note:** Either `--pattern` or `--hash` is required (but not both).

**Examples:**

```bash
# Enable specific key by hash
openrouter-key-manager enable --hash hash-abc123... -y

# Enable all keys matching pattern (with confirmation)
openrouter-key-manager enable --pattern "*CCP555*"

# Enable all keys for a user
openrouter-key-manager enable --pattern "alice@example.com*" -y
```

---

### `delete`

Permanently delete one or more API keys. **This cannot be undone.**

```bash
openrouter-key-manager delete [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to delete
- `-y, --confirm` - Skip confirmation prompt

**Note:** Either `--pattern` or `--hash` is required (but not both).

**Examples:**

```bash
# Delete specific key by hash
openrouter-key-manager delete --hash hash-abc123... -y

# Delete all keys matching pattern (with confirmation)
openrouter-key-manager delete --pattern "*CCP555*"

# Delete all keys from specific date
openrouter-key-manager delete --pattern "*2025-01-15*" -y
```

---

### `bulk-delete`

Delete multiple API keys using a CSV or JSON file.

```bash
openrouter-key-manager bulk-delete [options] <file>
```

**Arguments:**

- `<file>` - CSV or JSON file with key information

**Options:**

- `--delimiter <char>` - Field delimiter for CSV (auto-detected)
- `--skip-header [boolean]` - Skip first row (default: true)
- `-y, --confirm` - Skip confirmation prompt

**Input File Format:**

You can use the CSV file created by `create` or `bulk-create`, or create a simple CSV with just `name` and `hash` columns (i.e., the `key` itself is not needed):

**CSV (from bulk-create):**

```csv
name,key,hash
alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123...,hash-abc123...
bob@example.com CCP555 student 2025-01-15,sk-or-v1-def456...,hash-def456...
```

**CSV (minimal):**

```csv
name,hash
alice@example.com CCP555 student 2025-01-15,hash-abc123...
bob@example.com CCP555 student 2025-01-15,hash-def456...
```

**JSON:**

```json
[
  {
    "name": "alice@example.com CCP555 student 2025-01-15",
    "hash": "hash-abc123..."
  },
  {
    "name": "bob@example.com CCP555 student 2025-01-15",
    "hash": "hash-def456..."
  }
]
```

**Note:** The `bulk-delete` command only needs the `name` and `hash` columns. If your CSV has additional columns (like `key`), they will be ignored.

**Examples:**

```bash
# Delete using CSV from bulk-create
openrouter-key-manager bulk-delete CCP555-student-2025-01-15.csv -y

# Delete with confirmation prompt
openrouter-key-manager bulk-delete CCP555-keys.csv

# Delete using JSON file
openrouter-key-manager bulk-delete keys.json -y
```

---

### `report`

Generate a comprehensive HTML report with usage statistics.

```bash
openrouter-key-manager report [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--include-disabled` - Include disabled keys (default: false)
- `-o, --output <file>` - Output filename (default:
  `report-YYYY-MM-DD.html`)

**Examples:**

```bash
# Generate report for all active keys
openrouter-key-manager report

# Generate report for specific pattern
openrouter-key-manager report \
  --pattern "*CCP555*" \
  --output ccp555-report.html

# Include disabled keys
openrouter-key-manager report --include-disabled

# Report for specific date
openrouter-key-manager report --pattern "*2025-01-15*"
```

**Report Contents:**

The HTML report includes:

**Summary Statistics:**

- Total keys (active/disabled)
- Total budget limit
- Total usage
- Total remaining budget

**Detailed Table (sorted by usage):**

- Key name
- Hash (hover to see full, click to copy)
- Disabled status
- Budget limit
- Remaining budget (highlighted if < $1)
- Total usage
- Daily/weekly/monthly usage
- Creation date

The report is a self-contained HTML file that works in any browser.

---

## Key Naming Convention

Keys are automatically named using this format:

```
{email} {tag1} {tag2} ... {YYYY-MM-DD}
```

**Examples:**

- `alice@example.com CCP555 student 2025-01-15`
- `bob@example.com research AI-lab 2025-01-15`
- `carol@example.com 2025-01-15` (no tags)

**Tag Rules:**

- Tags cannot contain spaces (use hyphens or underscores)
- Tags are optional
- Tags make filtering easier

---

## Complete Workflow Example

### Semester Setup

**1. Prepare student list (students.csv):**

```csv
email,course,role,section
alice@example.com,CCP555,student,A
bob@example.com,CCP555,student,A
carol@example.com,CCP555,student,B
dave@example.com,CCP555,TA
```

**2. Create keys with $15 limit:**

```bash
openrouter-key-manager bulk-create \
  --limit 15 \
  --output ccp555-winter2025.csv \
  students.csv
```

**3. Distribute keys to students:**

The CSV file contains three columns:

- `name`: Key identifier
- `key`: The actual API key (distribute this to users)
- `hash`: Management identifier (keep for yourself)

You can:

- Extract the `key` column and email to students
- Create individual files per student
- Import into your LMS
- Use a script to send personalized emails

**Example: Extract keys for distribution**

```bash
# Extract just email and key columns
cut -d',' -f1,2 ccp555-winter2025.csv | tail -n +2 > keys-to-distribute.csv
```

### During Semester

**4. Check usage weekly:**

```bash
# Quick status check (truncated display)
openrouter-key-manager list --pattern "*CCP555*"

# Detailed report
openrouter-key-manager report \
  --pattern "*CCP555*" \
  --output weekly-report.html
```

**5. Handle budget issues:**

```bash
# Increase limits for students running low
openrouter-key-manager set-limit \
  --pattern "*CCP555*student*" \
  --limit 25 -y

# Or increase specific student's limit
openrouter-key-manager set-limit \
  --pattern "alice@example.com*" \
  --limit 30 -y
```

**6. Handle security issues:**

```bash
# Disable a specific student's key temporarily
openrouter-key-manager disable --pattern "alice@example.com*" -y

# Rotate compromised key (generates new key)
openrouter-key-manager rotate --pattern "alice@example.com*" -y

# Re-enable after issue is resolved
openrouter-key-manager enable --pattern "alice@example.com*" -y
```

### End of Semester

**7. Clean up:**

```bash
# Delete all course keys using the original CSV
openrouter-key-manager bulk-delete ccp555-winter2025.csv -y

# Or delete by pattern
openrouter-key-manager delete --pattern "*CCP555*" -y
```

---

## Best Practices

1. **Secure storage** - The CSV files from `create`/`bulk-create`/`rotate` contain
   actual API keys. Store them securely and distribute keys through secure
   channels.

2. **Keep creation CSVs** - Save the CSV output for later management
   operations (the hash column is needed for disable/delete/rotate/set-limit).

3. **Use meaningful tags** - Choose tags that make filtering easy (course
   codes, roles, sections).

4. **Consistent naming** - Establish tag conventions (e.g.,
   `COURSE-ROLE-SECTION`).

5. **Regular monitoring** - Generate reports periodically to track usage and
   identify students running low on credits.

6. **Proactive limit adjustments** - Use `set-limit` to increase budgets before
   students run out, rather than waiting for complaints.

7. **Disable before delete** - Test impact by disabling keys before permanent
   deletion. Use `enable` to restore access if needed.

8. **Rotate for security** - Use `rotate` instead of `delete` + `create` when
   you want to maintain the same key names and limits.

9. **Pattern matching** - Use glob patterns to manage groups efficiently.

10. **File organization** - Use descriptive output filenames:
    - `ccp555-winter2025.csv`
    - `research-team-keys.csv`
    - `admin-staff-2025.csv`

11. **Backup** - Keep copies of CSV files in version control or secure storage
    (encrypted if they contain API keys).

12. **Key distribution** - Extract just the `key` column when distributing to
    users. Don't share the `hash` column publicly.

13. **Use `-y` for automation** - The `-y` flag (shorthand for `--confirm`)
    is useful in scripts to skip confirmation prompts.

14. **Mutual exclusivity** - Remember that `--pattern` and `--hash` cannot be
    used together. Choose the appropriate one for your use case.

15. **Rotation vs. Creation** - Use `rotate` when you want to keep the same
    key names (e.g., semester transitions). Use `create` when you want new
    names with updated dates.

16. **Truncated display** - Use the default `list` output for quick overviews
    (shows just emails). Use `--full` when you need complete names and hashes
    for management operations.

---

## License

BSD-2-Clause
