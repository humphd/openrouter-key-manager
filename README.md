# OpenRouter Key Manager

A Node.js CLI tool for managing OpenRouter.ai API keys for students.

## Installation

```bash
npm install -g openrouter-key-manager
```

Or run directly with `npx`:

```bash
npx openrouter-key-manager [command] [options]
```

## Prerequisites

You need an OpenRouter.ai API Provisioning Key to use this tool. You can obtain one from your OpenRouter.ai account dashboard.

## Authentication

The tool requires an OpenRouter.ai API Provisioning Key, which can be provided in two ways:

1. **Environment Variable** (recommended):

   ```bash
   export OPENAI_PROVISIONING_KEY=your_provisioning_key_here
   ```

2. **Command Line Argument**:

   ```bash
   openrouter-key-manager --provisioning-key your_key_here [command]
   ```

## Usage

```bash
openrouter-key-manager [options] <command>
```

### Global Options

- `-k, --provisioning-key <key>` - OpenRouter.ai API Provisioning Key
  (overrides OPENAI_PROVISIONING_KEY env var)
- `--email-domain <domain>` - Student email domain to append to usernames
  when creating email addresses (default `myseneca.ca`)
- `-h, --help` - Display help information
- `-v, --version` - Display version information

### Commands

#### `create`

Create an API key for a single student with a spending limit.

```bash
openrouter-key-manager create [options]
```

**Options:**

- `-l, --limit <dollar limit>` - The spending limit in dollars for this
  API key, for example `10` for `$10` limit (required)
- `-u, --username <username>` - Student's username (will append
  `@myseneca.ca` to create email)
- `-e, --email <email>` - Student's email address (alternative to username)
- `-s, --student-id <id>` - Student's ID number (required)
- `-c, --course <course>` - Course code (required)
- `-d, --date <date>` - Issue date (optional, defaults to today in
  YYYY-MM-DD format)
- `-f, --format <format>` - Output format: `table`, `json`, or `csv`
  (default: table)
- `-o, --output <file>` - Write output to file instead of stdout

**Note:** One of `--username` or `--email` must be provided.

**Example:**

```bash
# Using username
openrouter-key-manager create \
  --limit 10 \
  --username jsmith \
  --student-id 123456789 \
  --course WEB422

# Using email
openrouter-key-manager create \
  --limit 10 \
  --email jsmith@myseneca.ca \
  --student-id 123456789 \
  --course WEB422

# Output as JSON to file
openrouter-key-manager create \
  --limit 10 \
  --username jsmith \
  --student-id 123456789 \
  --course WEB422 \
  --format json \
  --output keys.json
```

**Output Fields:**

- `email` - Student's email address
- `student_id` - Student's ID number
- `course` - Course code
- `issued_date` - Date the key was issued (`YYYY-MM-DD`)
- `key_name` - The generated key name
- `api_key` - The actual API key
- `hash` - The key's unique hash identifier

**Key Name Format:**

Each key is named with student info in the following format:

```text
{email} {student_id} {course} {issued-date}
```

Example: `jsmith@myseneca.ca 123456789 WEB422 2024-01-15`

---

#### `bulk-create`

Create API keys for multiple students with a spending limit from a CSV or
TSV file.

```bash
openrouter-key-manager bulk-create [options] <file>
```

**Arguments:**

- `<file>` - Path to CSV or TSV file containing student information

**Options:**

- `-l, --limit <dollar limit>` - The spending limit in dollars for this
  API key, for example `10` for `$10` limit (required)
- `-c, --course <course>` - Course code (required)
- `-d, --date <date>` - Issue date (optional, defaults to today in
  YYYY-MM-DD format)
- `--delimiter <char>` - Field delimiter (optional, auto-detected from
  file extension: `.csv` = `,`, `.tsv` = `\t`)
- `--skip-header <boolean>` - Skip the first row (default: true)
- `-f, --format <format>` - Output format: `table`, `json`, or `csv`
  (default: table)
- `-o, --output <file>` - Write output to file instead of stdout

**CSV/TSV Format:**

Input files should contain at least these columns in order, following the
export format from Blackboard:

1. Last Name
2. First Name
3. Username
4. Student ID

Additional columns are ignored. The Username is used to generate the email
address by appending the email domain (default: `@myseneca.ca`,
configurable via `--email-domain`).

**Example CSV:**

```csv
Last Name,First Name,Username,Student ID
Smith,John,jsmith,123456789
Doe,Jane,jdoe,987654321
```

**Example:**

```bash
# Create keys and display as table
openrouter-key-manager bulk-create \
  --limit 10 \
  --course WEB422 \
  students.csv

# Create keys and save as CSV for later deletion
openrouter-key-manager bulk-create \
  --limit 10 \
  --course WEB422 \
  --format csv \
  --output web422-keys.csv \
  students.csv

# Create keys and save as JSON
openrouter-key-manager bulk-create \
  --limit 10 \
  --course WEB422 \
  --format json \
  --output web422-keys.json \
  students.csv
```

**Output:**

The output includes all information needed to identify and use the keys:

- `email` - Student's email address
- `student_id` - Student's ID number
- `course` - Course code
- `issued_date` - Date the key was issued
- `key_name` - The generated key name
- `api_key` - The actual API key
- `hash` - The key's unique hash identifier

---

#### `list`

List API keys with their names, hashes, and remaining budgets.

```bash
openrouter-key-manager list [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern (e.g., `*WEB422*`,
  `*@myseneca.ca*`)
- `--include-disabled` - Include disabled keys in the output
- `-f, --format <format>` - Output format: `table`, `json`, or `csv`
  (default: table)
- `-o, --output <file>` - Write output to file instead of stdout

**Glob Patterns:**

The pattern option supports standard glob wildcards:

- `*` - Matches any characters
- `?` - Matches a single character
- `**` - Matches across path separators

**Example:**

```bash
# List all active keys
openrouter-key-manager list

# List keys for a specific course
openrouter-key-manager list --pattern "*WEB422*"

# List keys for a specific date
openrouter-key-manager list --pattern "*2024-01-15*"

# List all keys including disabled ones
openrouter-key-manager list --include-disabled

# Export to CSV
openrouter-key-manager list \
  --pattern "*WEB422*" \
  --format csv \
  --output web422-keys.csv
```

**Output Fields:**

- `name` - The key name
- `hash` - The key's unique hash identifier
- `remaining` - Remaining budget in dollars
- `disabled` - Whether the key is disabled

---

#### `disable`

Disable one or more API keys. Disabled keys cannot be used but can be
re-enabled later.

```bash
openrouter-key-manager disable [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to disable
- `--confirm` - Skip confirmation prompt

**Note:** One of `--pattern` or `--hash` must be provided. When multiple
keys match a pattern, you will be prompted to confirm unless `--confirm`
is used.

**Example:**

```bash
# Disable a specific key by hash
openrouter-key-manager disable \
  --hash sk-or-v1-abc123... \
  --confirm

# Disable all keys for a course (with confirmation)
openrouter-key-manager disable --pattern "*WEB422*"

# Disable all keys for a specific student
openrouter-key-manager disable \
  --pattern "jsmith@myseneca.ca*" \
  --confirm
```

---

#### `delete`

Permanently delete one or more API keys. This action cannot be undone.

```bash
openrouter-key-manager delete [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--hash <hash>` - Specific key hash to delete
- `--confirm` - Skip confirmation prompt

**Note:** One of `--pattern` or `--hash` must be provided. When multiple
keys match a pattern, you will be prompted to confirm unless `--confirm`
is used.

**Example:**

```bash
# Delete a specific key by hash
openrouter-key-manager delete \
  --hash sk-or-v1-abc123... \
  --confirm

# Delete all keys for a course (with confirmation)
openrouter-key-manager delete --pattern "*WEB422*"

# Delete all keys from a specific date
openrouter-key-manager delete \
  --pattern "*2024-01-15*" \
  --confirm
```

---

#### `bulk-delete`

Delete API keys previously created for multiple students. Accepts either
the original student roster CSV/TSV file OR the output file from
`bulk-create`.

```bash
openrouter-key-manager bulk-delete [options] <file>
```

**Arguments:**

- `<file>` - Path to CSV/TSV/JSON file containing student or key
  information

**Options:**

- `-c, --course <course>` - Course code (required if using student roster
  file)
- `-d, --date <date>` - Issue date (required if using student roster file)
- `--delimiter <char>` - Field delimiter for CSV/TSV (optional,
  auto-detected)
- `--skip-header <boolean>` - Skip the first row (default: true)
- `--confirm` - Skip confirmation prompt

**Input File Types:**

1. **Student Roster (CSV/TSV)** - Original Blackboard export
   - Requires `--course` and `--date` options
   - Uses columns: Last Name, First Name, Username, Student ID

2. **Key Output File (CSV/JSON)** - Output from `bulk-create`
   - Does NOT require `--course` or `--date` (uses values from file)
   - Uses columns/fields: email, student_id, course, issued_date, hash

**Example:**

```bash
# Delete using original student roster
openrouter-key-manager bulk-delete \
  --course WEB422 \
  --date 2024-01-15 \
  students.csv \
  --confirm

# Delete using output from bulk-create (CSV)
openrouter-key-manager bulk-delete \
  web422-keys.csv \
  --confirm

# Delete using output from bulk-create (JSON)
openrouter-key-manager bulk-delete \
  web422-keys.json \
  --confirm
```

---

#### `report`

Generate a comprehensive HTML report with usage statistics and detailed
information for all keys.

```bash
openrouter-key-manager report [options]
```

**Options:**

- `-p, --pattern <pattern>` - Filter by glob pattern
- `--include-disabled` - Include disabled keys in the report
- `-o, --output <file>` - Output HTML file (default:
  `report-YYYY-MM-DD.html`)

**Example:**

```bash
# Generate report for all active keys
openrouter-key-manager report

# Generate report for a specific course
openrouter-key-manager report \
  --pattern "*WEB422*" \
  --output web422-report.html

# Generate report including disabled keys
openrouter-key-manager report --include-disabled

# Generate report for a specific date
openrouter-key-manager report \
  --pattern "*2024-01-15*"
```

**Report Contents:**

The generated HTML report includes:

- **Summary Statistics**
  - Total number of keys
  - Active vs disabled keys
  - Total budget limit
  - Total usage across all keys
  - Total remaining budget

- **Detailed Table** (sorted by usage, highest first)
  - Key name
  - Hash (truncated, hover to see full, click to copy)
  - Disabled status
  - Budget limit
  - Remaining budget (highlighted in red if < $1)
  - Total usage
  - Daily usage
  - Weekly usage
  - Monthly usage
  - Creation date

The report is a self-contained HTML file that can be opened in any web
browser and shared with others.

---

## Examples

### Complete Workflow

1. **Set up authentication:**

   ```bash
   export OPENAI_PROVISIONING_KEY=your_provisioning_key_here
   ```

2. **Create keys for a class at the start of semester:**

   ```bash
   openrouter-key-manager bulk-create \
     --limit 10 \
     --course WEB422 \
     --format csv \
     --output web422-2024-01-keys.csv \
     blackboard_students.csv
   ```

3. **Check on key usage mid-semester:**

   ```bash
   # Quick list to see remaining budgets
   openrouter-key-manager list --pattern "*WEB422*"

   # Generate detailed report
   openrouter-key-manager report \
     --pattern "*WEB422*" \
     --output web422-midterm-report.html
   ```

4. **Disable a specific student's key:**

   ```bash
   openrouter-key-manager disable \
     --pattern "jsmith@myseneca.ca*" \
     --confirm
   ```

5. **Delete all keys at end of semester:**

   ```bash
   openrouter-key-manager bulk-delete \
     web422-2024-01-keys.csv \
     --confirm
   ```

### Pattern Matching Examples

```bash
# All keys for a specific course
openrouter-key-manager list --pattern "*WEB422*"

# All keys for a specific student
openrouter-key-manager list --pattern "jsmith@myseneca.ca*"

# All keys from a specific date
openrouter-key-manager list --pattern "*2024-01-15*"

# All keys for students with a specific ID pattern
openrouter-key-manager list --pattern "*123456*"

# Combine multiple filters (course AND date)
openrouter-key-manager list --pattern "*WEB422*2024-01-15*"
```

### Output Examples

**Table Format (list command):**

```
┌──────────────────────────────────────────┬──────────────────────────────────────────┬────────────┬──────────┐
│ Name                                     │ Hash                                     │ Remaining  │ Disabled │
├──────────────────────────────────────────┼──────────────────────────────────────────┼────────────┼──────────┤
│ jsmith@myseneca.ca 123456789 WEB422 2... │ sk-or-v1-abc123def456...                 │ $8.45      │ No       │
│ jdoe@myseneca.ca 987654321 WEB422 2024...│ sk-or-v1-def456ghi789...                 │ $2.10      │ No       │
└──────────────────────────────────────────┴──────────────────────────────────────────┴────────────┴──────────┘
```

**JSON Format:**

```json
[
  {
    "name": "jsmith@myseneca.ca 123456789 WEB422 2024-01-15",
    "hash": "sk-or-v1-abc123def456...",
    "remaining": 8.45,
    "disabled": false
  },
  {
    "name": "jdoe@myseneca.ca 987654321 WEB422 2024-01-15",
    "hash": "sk-or-v1-def456ghi789...",
    "remaining": 2.1,
    "disabled": false
  }
]
```

**CSV Format:**

```csv
name,hash,remaining,disabled
jsmith@myseneca.ca 123456789 WEB422 2024-01-15,sk-or-v1-abc123def456...,8.45,false
jdoe@myseneca.ca 987654321 WEB422 2024-01-15,sk-or-v1-def456ghi789...,2.10,false
```

## Key Management Best Practices

1. **Save creation output** - Always save the output from `bulk-create`
   to a file for later reference and deletion

2. **Use patterns for filtering** - Leverage glob patterns to manage
   groups of keys efficiently

3. **Regular monitoring** - Generate reports periodically to track usage
   and identify issues

4. **Disable before delete** - Consider disabling keys first to test
   impact before permanent deletion

5. **Consistent naming** - The automatic naming format ensures keys are
   easily identifiable and filterable

## License

BSD-2 Clause
