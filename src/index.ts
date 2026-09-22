export * from "./utils/errors.js";

export type * from "./types.js";

export { create } from "./commands/create.js";
export { bulkCreate } from "./commands/bulk-create.js";
export { destroy } from "./commands/destroy.js";
export { bulkDestroy } from "./commands/bulk-destroy.js";
export { list } from "./commands/list.js";
export { disable } from "./commands/disable.js";
export { enable } from "./commands/enable.js";
export { report } from "./commands/report.js";
export { analytics } from "./commands/analytics.js";
export { setLimit } from "./commands/set-limit.js";
export { bulkSetLimit } from "./commands/bulk-set-limit.js";
export { rotate } from "./commands/rotate.js";
export { bulkRotate } from "./commands/bulk-rotate.js";
export {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from "./commands/workspaces.js";

export type { CreateOptions, CreateResult } from "./commands/create.js";
export type {
  BulkCreateOptions,
  BulkCreateResult,
} from "./commands/bulk-create.js";
export type {
  BulkDestroyOptions,
  BulkDestroyResult,
} from "./commands/bulk-destroy.js";
export type { DestroyOptions, DestroyResult } from "./commands/destroy.js";
export type { DisableOptions, DisableResult } from "./commands/disable.js";
export type { EnableOptions, EnableResult } from "./commands/enable.js";
export type { ReportOptions, ReportResult } from "./commands/report.js";
export type {
  AnalyticsKeyRow,
  AnalyticsMetrics,
  AnalyticsModelRow,
  AnalyticsOptions,
  AnalyticsPeriod,
  AnalyticsRange,
  AnalyticsResult,
  AnalyticsSummaryRow,
  AnalyticsView,
} from "./commands/analytics.js";
export type { SetLimitOptions, SetLimitResult } from "./commands/set-limit.js";
export type {
  BulkSetLimitOptions,
  BulkSetLimitResult,
} from "./commands/bulk-set-limit.js";
export type { RotateOptions, RotateResult } from "./commands/rotate.js";
export type {
  BulkRotateOptions,
  BulkRotateResult,
} from "./commands/bulk-rotate.js";
export type { ListOptions, ListResult } from "./commands/list.js";
export type {
  CreateWorkspaceOptions,
  DeleteWorkspaceOptions,
  ListWorkspacesOptions,
} from "./commands/workspaces.js";

export { OpenRouterClient } from "./lib/api-client.js";
export type {
  AnalyticsMetadata,
  AnalyticsQuery,
  RawAnalyticsResult,
  RawAnalyticsRow,
} from "./lib/api-client.js";
export {
  getAnalyticsMeta,
  queryAnalytics,
  type RawAnalyticsOptions,
} from "./lib/analytics-api.js";
export { parseAccountList, parseKeyFile } from "./lib/file-parser.js";
export {
  generateKeyName,
  generateOutputFilename,
} from "./lib/key-formatter.js";
export {
  outputCreatedKeys,
  outputKeyList,
  type KeyListItem,
} from "./lib/output-formatter.js";
export {
  formatAnalytics,
  formatAnalyticsAsCsv,
  formatAnalyticsAsJson,
  formatAnalyticsAsTable,
  outputAnalytics,
} from "./lib/analytics-formatter.js";
export {
  validateEmail,
  validateTags,
  validateDate,
  validateLimit,
  validateExpiry,
  validateFormat,
} from "./lib/validators.js";
export { getSelectedKeys } from "./lib/key-selector.js";
export { generateHTML, getDefaultReportFilename } from "./lib/html-report.js";

export { getProvisioningKey, getTodayDate } from "./utils/config.js";
export {
  resolveWorkspace,
  resolveWorkspaceRequired,
} from "./utils/workspaces.js";
