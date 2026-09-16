# Arsiva-LM Apps Script

Folder ini adalah project Google Apps Script terpisah. Semua file di `src/` dapat dipush menggunakan `clasp`.

## Susunan File

```text
src/
├── appsscript.json
├── Config.gs
├── Code.gs
├── Setup.gs
├── Database.gs
├── AuthService.gs
├── CacheService.gs
├── DashboardService.gs
├── ArchiveService.gs
├── NotificationService.gs
├── AuditService.gs
├── Validation.gs
├── Utils.gs
├── index.html
├── styles.html
└── scripts.html
```

## Entry Point

- `doGet()` menyajikan HTMLService UI.
- `setupProject()` membuat/memeriksa spreadsheet dan tab.
- `getDashboardBootstrap()` adalah satu round-trip untuk data kritis dashboard.
- `getArchivesPage()` menyediakan pagination/filter.
- `searchArchives()` menyediakan pencarian ter-debounce dari client.
- `markNotificationRead()` adalah contoh safe optimistic mutation.

## Prinsip Implementasi

- Spreadsheet dibuka sekali per execution dan referensinya digunakan ulang.
- Pembacaan menggunakan `getValues()` per range, bukan per cell.
- Mutasi satu row menggunakan satu `setValues()`.
- `ScriptLock` melindungi write bersama.
- Cache master data selalu menyertakan `DATA_VERSION`.
- Response hanya berupa JSON-compatible values.
- UI tidak menyimpan permission atau credential di browser storage.

Lihat [README utama](../../README.md) untuk setup lengkap.

