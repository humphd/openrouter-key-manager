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
export { setLimit } from "./commands/set-limit.js";
export { bulkSetLimit } from "./commands/bulk-set-limit.js";
export { rotate } from "./commands/rotate.js";
export { bulkRotate } from "./commands/bulk-rotate.js";

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

export { OpenRouterClient } from "./lib/api-client.js";
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
  validateEmail,
  validateTags,
  validateDate,
  validateLimit,
  validateFormat,
} from "./lib/validators.js";
export { getSelectedKeys } from "./lib/key-selector.js";
export { generateHTML, getDefaultReportFilename } from "./lib/html-report.js";

export { getProvisioningKey, getTodayDate } from "./utils/config.js";
