import chalk from "chalk";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";
import { writeFile } from "node:fs/promises";
import type { OpenRouterKey } from "../types.js";

interface ReportOptions {
  pattern?: string;
  includeDisabled?: boolean;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
}

function getDefaultReportFilename(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `report-${year}-${month}-${day}.html`;
}

function generateHTML(keys: OpenRouterKey[]): string {
  const totalUsage = keys.reduce((sum, k) => sum + k.usage, 0);
  const totalLimit = keys.reduce((sum, k) => sum + (k.limit ?? 0), 0);
  const totalRemaining = keys.reduce(
    (sum, k) => sum + (k.limit_remaining ?? 0),
    0
  );
  const activeKeys = keys.filter((k) => !k.disabled).length;
  const disabledKeys = keys.filter((k) => k.disabled).length;

  const keyData = keys.map((k) => ({
    name: k.name,
    hash: k.hash,
    disabled: k.disabled,
    usage: k.usage,
    daily: k.usage_daily,
    weekly: k.usage_weekly,
    monthly: k.usage_monthly,
    limit: k.limit ?? 0,
    remaining: k.limit_remaining ?? 0,
    createdAt: k.created_at,
  }));

  // Sort by usage descending
  keyData.sort((a, b) => b.usage - a.usage);

  // Generate table rows
  const tableRows = keyData
    .map(
      (k) => `
    <tr>
      <td>${escapeHtml(k.name)}</td>
      <td class="hash-cell">
        <span class="hash-short">${escapeHtml(k.hash.substring(0, 8))}...</span>
        <span class="hash-full">${escapeHtml(k.hash)}</span>
        <button class="copy-btn" onclick="copyHash('${escapeHtml(k.hash)}')" 
                title="Copy full hash">
          📋
        </button>
      </td>
      <td class="center">${k.disabled ? '<span class="badge disabled">Yes</span>' : '<span class="badge active">No</span>'}</td>
      <td class="number">$${k.limit.toFixed(2)}</td>
      <td class="number ${k.remaining < 1 ? "low-budget" : ""}">${k.remaining > 0 ? "$" + k.remaining.toFixed(2) : "$0.00"}</td>
      <td class="number">$${k.usage.toFixed(2)}</td>
      <td class="number">$${k.daily.toFixed(2)}</td>
      <td class="number">$${k.weekly.toFixed(2)}</td>
      <td class="number">$${k.monthly.toFixed(2)}</td>
      <td class="date">${new Date(k.createdAt).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenRouter API Key Usage Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
        Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1800px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    .summary {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.5em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
    }
    .summary-item {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .summary-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .summary-value.success { color: #16a34a; }
    .summary-value.warning { color: #ea580c; }
    .summary-value.danger { color: #dc2626; }
    .summary-label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: auto;
    }
    .data-table h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.3em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    th {
      background: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #dee2e6;
      position: sticky;
      top: 0;
      white-space: nowrap;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .hash-cell {
      position: relative;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85em;
    }
    .hash-short {
      display: inline;
    }
    .hash-full {
      display: none;
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      background: #1f2937;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .hash-cell:hover .hash-full {
      display: block;
    }
    .copy-btn {
      margin-left: 8px;
      padding: 2px 6px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.9em;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }
    .copy-btn:active {
      background: #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge.active {
      background: #d1fae5;
      color: #065f46;
    }
    .badge.disabled {
      background: #fee2e2;
      color: #991b1b;
    }
    .number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .center {
      text-align: center;
    }
    .date {
      white-space: nowrap;
    }
    .low-budget {
      color: #dc2626;
      font-weight: 600;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>OpenRouter API Key Usage Report</h1>
    <div class="timestamp">
      Generated: ${new Date().toLocaleString()}
    </div>
    
    <div class="summary">
      <h2>Summary Statistics</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${keys.length}</div>
          <div class="summary-label">Total Keys</div>
        </div>
        <div class="summary-item">
          <div class="summary-value success">${activeKeys}</div>
          <div class="summary-label">Active Keys</div>
        </div>
        <div class="summary-item">
          <div class="summary-value warning">${disabledKeys}</div>
          <div class="summary-label">Disabled Keys</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">$${totalLimit.toFixed(2)}</div>
          <div class="summary-label">Total Limit</div>
        </div>
        <div class="summary-item">
          <div class="summary-value danger">$${totalUsage.toFixed(2)}</div>
          <div class="summary-label">Total Usage</div>
        </div>
        <div class="summary-item">
          <div class="summary-value success">$${totalRemaining.toFixed(2)}</div>
          <div class="summary-label">Total Remaining</div>
        </div>
      </div>
    </div>

    <div class="data-table">
      <h2>Detailed Key Information (sorted by usage)</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Hash</th>
            <th class="center">Disabled</th>
            <th class="number">Limit</th>
            <th class="number">Remaining</th>
            <th class="number">Total Usage</th>
            <th class="number">Daily</th>
            <th class="number">Weekly</th>
            <th class="number">Monthly</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    function copyHash(hash) {
      navigator.clipboard.writeText(hash).then(() => {
        showToast('Hash copied to clipboard!');
      }).catch(err => {
        showToast('Failed to copy hash');
        console.error('Copy failed:', err);
      });
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function reportCommand(
  options: ReportOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  const client = new OpenRouterClient(provisioningKey);
  const allKeys = await client.listKeys(true);

  let filteredKeys = allKeys;

  // Filter by pattern if specified
  if (options.pattern) {
    filteredKeys = filteredKeys.filter((key) =>
      minimatch(key.name, options.pattern!)
    );
  }

  // Filter disabled keys unless explicitly included
  if (!options.includeDisabled) {
    filteredKeys = filteredKeys.filter((key) => !key.disabled);
  }

  console.error(
    chalk.blue(`Generating report for ${filteredKeys.length} key(s)...`)
  );

  const html = generateHTML(filteredKeys);
  const outputFile = options.output || getDefaultReportFilename();
  await writeFile(outputFile, html, "utf-8");

  console.error(chalk.green(`✓ Report written to ${outputFile}`));
}
