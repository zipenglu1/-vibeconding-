# Data Scripts

`generate-sample-csv.ps1` creates a deterministic CSV fixture that can be imported into the desktop app or reused in local validation.

Default output:

- `tests/fixtures/generated/sample-sales.csv`

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\data\generate-sample-csv.ps1
```

Custom output path:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\data\generate-sample-csv.ps1 -OutputPath .\tmp\demo.csv
```
