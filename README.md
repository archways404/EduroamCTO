# EduroamCTO

A cross-platform CLI tool that configures and connects your device to Eduroam automatically using your university credentials.

---

## Installation & Usage

### macOS

Open your terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/archways404/EduroamCTO/master/unix.sh)"
```

This script will:
- Detect your OS and architecture (Apple Silicon, Intel, etc.)
- Download the correct binary
- Automatically run it to guide you through Eduroam setup

> macOS includes `/bin/bash` by default even if you're using zsh.

---

### Windows

Open **PowerShell** and run:

```powershell
irm https://raw.githubusercontent.com/archways404/EduroamCTO/master/win.ps1 | iex
```

This script will:
- Detect your architecture
- Download the appropriate `.exe` binary
- Run it and guide you through setup

> ⚠️ Make sure PowerShell is allowed to run scripts on your system.

---

## Privacy & Security

- Your credentials are only used to fetch and configure your Eduroam profile.
- No sensitive data is stored or transmitted elsewhere.

---

## 🛠️ Issues

If you encounter any problems, please [open an issue](https://github.com/archways404/EduroamCTO/issues).

---

Made by [archways404](https://github.com/archways404)
