#!/usr/bin/env bash
# Taskys installer — served by the download server (server.py)
# Usage:  curl -sSL https://taskys.squareweb.app/install.sh | bash
#         TASKYS_BASE=https://taskys.squareweb.app bash <(curl -sSL https://taskys.squareweb.app/install.sh)

set -euo pipefail

BOLD="\033[1m"; DIM="\033[2m"; RESET="\033[0m"
[ -t 1 ] || { BOLD=""; DIM=""; RESET=""; }

BASE_URL="${TASKYS_BASE:-http://localhost:8000}"
INSTALL_DIR="${HOME}/.local/bin"
APP_DIR="${HOME}/.local/share/taskys"
DESKTOP_DIR="${HOME}/.local/share/applications"

info()  { printf "${DIM}->${RESET} %s\n" "$1"; }
ok()    { printf "${BOLD}+${RESET} %s\n" "$1"; }
fail()  { printf "ERROR: %s\n" "$1" >&2; exit 1; }

printf "\n"
printf "${BOLD}  Taskys installer${RESET}\n"
printf "${DIM}  free & open-source task organizer${RESET}\n\n"

for dep in curl; do command -v "$dep" >/dev/null 2>&1 || fail "'$dep' is required."; done

mkdir -p "$INSTALL_DIR" "$APP_DIR" "$DESKTOP_DIR"

printf "${BOLD}  Downloading AppImage from ${BASE_URL}…${RESET}\n"
APP_IMAGE="${APP_DIR}/Taskys.AppImage"
curl -fSL --progress-bar -o "$APP_IMAGE" "${BASE_URL}/download/appimage" \
  || fail "download failed. Is the server running? (python3 server.py)"
chmod +x "$APP_IMAGE"
ok "AppImage installed in ${APP_IMAGE}"

# symlink in PATH for 'taskys' command (works without sudo)
ln -sf "$APP_IMAGE" "${INSTALL_DIR}/taskys"
ok "Command available: taskys"

cat > "${DESKTOP_DIR}/taskys.desktop" <<EOF
[Desktop Entry]
Name=Taskys
Comment=Free & open-source task organizer
Exec=${APP_IMAGE}
Type=Application
Categories=Utility;Office;
Terminal=false
EOF
ok "Added to application menu"

# ---- PATH check ----
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    printf "\n${DIM}Add %s to your PATH? (recommended) [Y/n]${RESET} " "$INSTALL_DIR"
    read -r answer
    if [ "${answer:-y}" != "n" ]; then
      SHELL_RC="${HOME}/.bashrc"
      [ -n "${ZSH_VERSION:-}" ] && SHELL_RC="${HOME}/.zshrc"
      echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_RC"
      ok "Added to PATH in $SHELL_RC (restart your shell)"
    fi
    ;;
esac

printf "\n"
printf "${BOLD}  All done!${RESET}\n\n"
printf "  ${DIM}Launch:${RESET}            taskys\n"
printf "  ${DIM}Or:${RESET}                 open Taskys from your menu\n\n"
