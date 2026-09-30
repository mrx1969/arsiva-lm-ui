/**
 * Non-secret application constants.
 * Secrets and environment-specific IDs belong in Script Properties.
 */
const APP = Object.freeze({
  NAME: 'Arsiva-LM',
  VERSION: '0.5.0',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MASTER_CACHE_SECONDS: 300,
  DASHBOARD_CACHE_SECONDS: 30,
  LOCK_TIMEOUT_MS: 10000,
  TIME_ZONE: 'Asia/Jakarta'
});

const PROPERTY_KEYS = Object.freeze({
  ADMIN_EMAIL: 'ADMIN_EMAIL',
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  SHARED_DRIVE_ROOT_FOLDER_ID: 'SHARED_DRIVE_ROOT_FOLDER_ID',
  APPS_SCRIPT_SHARED_SECRET: 'APPS_SCRIPT_SHARED_SECRET',
  APPS_SCRIPT_PREVIOUS_SECRET: 'APPS_SCRIPT_PREVIOUS_SECRET',
  ALLOWED_GOOGLE_DOMAINS: 'ALLOWED_GOOGLE_DOMAINS',
  APP_ENV: 'APP_ENV'
});

const SHEETS = Object.freeze({
  SETTINGS: 'Settings',
  DIVISIONS: 'Divisions',
  UNITS: 'Units',
  CATEGORIES: 'Categories',
  USERS: 'Users',
  NUMBER_COUNTERS: 'NumberCounters',
  FILE_UPLOADS: 'FileUploads',
  ARCHIVES: 'Archives',
  ACCESS_GRANTS: 'AccessGrants',
  APPROVER_CONFIGS: 'ApproverConfigs',
  SUBMISSIONS: 'Submissions',
  APPROVAL_TASKS: 'ApprovalTasks',
  APPROVALS: 'Approvals',
  NOTIFICATIONS: 'Notifications',
  AUDIT_LOGS: 'AuditLogs',
  IDEMPOTENCY_KEYS: 'IdempotencyKeys',
  OPERATIONS: 'Operations',
  SEARCH_INDEX: 'SearchIndex',
  REPORT_JOBS: 'ReportJobs',
  STORAGE_LOCATIONS: 'StorageLocations',
  STORAGE_BOXES: 'StorageBoxes',
  ARCHIVE_PLACEMENTS: 'ArchivePlacements',
  PHYSICAL_MOVEMENTS: 'PhysicalMovements'
});

const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_DIVISION: 'ADMIN_DIVISION',
  VERIFIER: 'VERIFIER',
  // Nilai lama tetap dikenali agar data sebelum v0.5.0 tidak langsung rusak.
  APPROVER_L1: 'APPROVER_L1',
  APPROVER_L2: 'APPROVER_L2',
  USER: 'USER'
});

const ARCHIVE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  // Status lama tetap dibaca selama masa transisi schema.
  PENDING_L1: 'PENDING_L1',
  PENDING_L2: 'PENDING_L2',
  FINAL: 'FINAL'
});

const SHEET_SCHEMAS = Object.freeze({
  Settings: [
    'key', 'value', 'description', 'updated_at', 'updated_by_email'
  ],
  Divisions: [
    'id', 'code', 'name', 'drive_group_email', 'active_folder_id',
    'archive_number_format', 'is_active', 'created_at', 'updated_at', 'row_version'
  ],
  Units: [
    'id', 'division_id', 'code', 'name', 'is_active',
    'created_at', 'updated_at', 'row_version'
  ],
  Categories: [
    'id', 'code', 'name', 'description', 'is_active',
    'created_at', 'updated_at', 'row_version'
  ],
  Users: [
    'id', 'google_sub', 'email', 'full_name', 'role', 'division_id', 'unit_id',
    'is_active', 'last_login_at', 'created_at', 'updated_at', 'row_version'
  ],
  NumberCounters: [
    'division_id', 'year', 'last_sequence', 'updated_at', 'updated_by_email'
  ],
  FileUploads: [
    'id', 'requested_by_user_id', 'requested_by_email', 'expected_file_name',
    'expected_mime_type', 'expected_size_bytes', 'expected_checksum', 'drive_file_id',
    'drive_parent_folder_id', 'actual_mime_type', 'actual_size_bytes', 'actual_checksum',
    'status', 'expires_at', 'verified_at', 'consumed_at', 'failure_reason',
    'created_at', 'updated_at', 'row_version'
  ],
  Archives: [
    'id', 'archive_number', 'title', 'division_id', 'unit_id', 'category_id',
    'classification_path', 'tags_json', 'status', 'uploaded_by_user_id', 'upload_id',
    'drive_file_id', 'drive_parent_folder_id', 'original_file_name', 'mime_type',
    'size_bytes', 'checksum', 'archive_date', 'current_submission_cycle',
    'needs_revision', 'deleted_at', 'deleted_by_user_id', 'deletion_reason',
    'created_at', 'updated_at', 'row_version'
  ],
  AccessGrants: [
    'id', 'archive_id', 'grantee_user_id', 'permission', 'reason', 'expires_at',
    'granted_by_user_id', 'revoked_at', 'revoked_by_user_id',
    'created_at', 'updated_at', 'row_version'
  ],
  ApproverConfigs: [
    'id', 'division_id', 'level', 'primary_approver_user_id',
    'alternate_approver_user_id', 'effective_from', 'effective_until', 'is_active',
    'created_at', 'updated_at', 'row_version'
  ],
  Submissions: [
    'id', 'archive_id', 'cycle_number', 'submitted_by_user_id',
    'submitted_at', 'result', 'completed_at', 'created_at'
  ],
  ApprovalTasks: [
    'id', 'submission_id', 'archive_id', 'level', 'assigned_to_user_id', 'status',
    'assigned_at', 'due_at', 'reminder_sent_at', 'escalated_at', 'completed_at',
    'created_at', 'updated_at', 'row_version'
  ],
  Approvals: [
    'id', 'submission_id', 'task_id', 'archive_id', 'approver_user_id',
    'level', 'decision', 'note', 'decided_at', 'created_at'
  ],
  Notifications: [
    'id', 'user_id', 'type', 'title', 'message', 'data_json', 'read_at',
    'email_status', 'email_sent_at', 'email_attempts', 'last_email_error',
    'created_at', 'updated_at', 'row_version'
  ],
  AuditLogs: [
    'id', 'occurred_at', 'request_id', 'actor_user_id', 'actor_email_snapshot',
    'action', 'entity_type', 'entity_id', 'before_json', 'after_json',
    'metadata_json', 'previous_hash', 'row_hash'
  ],
  IdempotencyKeys: [
    'key', 'actor_user_id', 'action', 'request_hash', 'response_json',
    'status', 'expires_at', 'created_at', 'completed_at'
  ],
  Operations: [
    'id', 'request_id', 'action', 'entity_type', 'entity_id', 'status',
    'steps_json', 'last_completed_step', 'error_message', 'started_at',
    'completed_at', 'recovery_attempts', 'updated_at'
  ],
  SearchIndex: [
    'archive_id', 'access_division_id', 'archive_number_normalized',
    'title_normalized', 'category_normalized', 'unit_normalized', 'tags_normalized',
    'combined_text', 'status', 'archive_date', 'is_deleted',
    'source_row_version', 'indexed_at'
  ],
  ReportJobs: [
    'id', 'requested_by_user_id', 'format', 'filters_json', 'status',
    'drive_file_id', 'expires_at', 'failure_reason', 'created_at',
    'started_at', 'completed_at', 'updated_at', 'row_version'
  ],
  StorageLocations: [
    'id', 'code', 'name', 'type', 'parent_id', 'capacity', 'status', 'notes',
    'barcode_value', 'created_at', 'updated_at', 'row_version'
  ],
  StorageBoxes: [
    'id', 'code', 'label', 'location_id', 'capacity', 'occupancy', 'status',
    'barcode_value', 'created_at', 'updated_at', 'row_version'
  ],
  ArchivePlacements: [
    'id', 'archive_id', 'box_id', 'location_id', 'placed_at',
    'placed_by_user_id', 'removed_at', 'row_version'
  ],
  PhysicalMovements: [
    'id', 'archive_id', 'box_id', 'from_location_id', 'to_location_id',
    'action', 'actor_user_id', 'occurred_at', 'notes'
  ]
});

const SETTINGS_DEFAULTS = Object.freeze([
  ['SCHEMA_VERSION', '3', 'Versi schema Google Sheets'],
  ['DATA_VERSION', '1', 'Versi invalidasi cache'],
  ['MAX_FILE_SIZE_BYTES', '52428800', 'Maksimum file 50 MB'],
  ['SEARCH_CACHE_SECONDS', '300', 'TTL cache pencarian/master data'],
  ['REMINDER_HOURS', '12', 'Jam sebelum pengingat verifikasi'],
  ['ESCALATION_HOURS', '24', 'Jam sebelum eskalasi verifikasi'],
  ['PHYSICAL_CAPACITY_WARNING_PERCENT', '80', 'Batas peringatan kapasitas lokasi fisik'],
  ['PRIMARY_STORAGE_LOCATION_NAME', 'Ruang Arsip Terpusat 01', 'Nama ruang arsip utama']
]);
