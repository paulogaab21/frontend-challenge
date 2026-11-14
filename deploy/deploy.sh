#!/usr/bin/env bash
#
# Publishes the demo build (static files + in-browser MSW backend) to a VPS that
# serves it with Caddy. Works from Linux, macOS and Git Bash on Windows.
#
#   bash deploy/deploy.sh setup      once per server: Caddy, folders, site config
#   bash deploy/deploy.sh            build, upload a release and switch to it
#   bash deploy/deploy.sh rollback   switch back to the previous release
#   bash deploy/deploy.sh check      smoke-test the published site
#
# Configuration (environment variables):
#   DEPLOY_HOST        SSH destination (user@host) required; e.g. in deploy/deploy.env
#   DEPLOY_DOMAIN      canonical public host name  default: gabrieldevprojetos.com.br
#   DEPLOY_ALIASES     host names redirected to it default: www.<DEPLOY_DOMAIN> ("" = none)
#   DEPLOY_IP          public IPv4 of the server   default: taken from DEPLOY_HOST
#   DEPLOY_ROOT        folder on the server        default: /var/www/kurio
#   DEPLOY_SSH_OPTS    extra ssh options           e.g. "-i ~/.ssh/google_cloud"
#   DEPLOY_SKIP_BUILD  "1" uploads the existing dist/ as is
#
# Layout on the server:
#   $DEPLOY_ROOT/releases/<utc timestamp>-<git sha>/   one folder per release
#   $DEPLOY_ROOT/current -> releases/<...>             switched atomically
set -euo pipefail

cd "$(dirname "$0")/.."

# Local, git-ignored settings (the server address is not part of the repository).
# shellcheck disable=SC1091
[[ -f deploy/deploy.env ]] && source deploy/deploy.env

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST=user@host (for example in deploy/deploy.env)}"
DOMAIN="${DEPLOY_DOMAIN:-gabrieldevprojetos.com.br}"
ALIASES="${DEPLOY_ALIASES-www.${DOMAIN}}"
IP="${DEPLOY_IP:-${HOST#*@}}"
ROOT="${DEPLOY_ROOT:-/var/www/kurio}"
KEEP_RELEASES=5
# shellcheck disable=SC2206
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 ${DEPLOY_SSH_OPTS:-})

remote() {
  ssh "${SSH_OPTS[@]}" "$HOST" "$@"
}

render_caddyfile() {
  # "a.example b.example" -> "a.example, b.example" (Caddy site address list)
  local aliases="${ALIASES// /, }"
  sed \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__ALIASES__|${aliases}|g" \
    -e "s|__IP__|${IP}|g" \
    -e "s|__ROOT__|${ROOT}|g" \
    deploy/Caddyfile.template |
    if [[ -z "$ALIASES" ]]; then sed '/^# BEGIN aliases/,/^# END aliases/d'; else cat; fi
}

setup() {
  if ! [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "DEPLOY_IP must be the public IPv4 of the server (got: $IP)" >&2
    exit 1
  fi

  echo "==> Installing Caddy on ${HOST}"
  remote "command -v caddy >/dev/null 2>&1 || { sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy; }"

  echo "==> Preparing ${ROOT}"
  remote "sudo mkdir -p '${ROOT}/releases' && sudo chown -R \"\$(id -un)\":\"\$(id -gn)\" '${ROOT}'"

  echo "==> Installing the site configuration for https://${DOMAIN}"
  local rendered
  rendered="$(render_caddyfile)"
  if grep -q '__[A-Z]*__' <<<"$rendered"; then
    echo "The site configuration still has unresolved placeholders" >&2
    exit 1
  fi
  remote "sudo tee /etc/caddy/Caddyfile >/dev/null && sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 && sudo systemctl enable --quiet caddy && sudo systemctl reload-or-restart caddy" <<<"$rendered"

  echo "==> Server ready. Publish with: bash deploy/deploy.sh"
}

release() {
  if [[ "${DEPLOY_SKIP_BUILD:-0}" != "1" ]]; then
    echo "==> Building"
    npm run build
  fi
  [[ -f dist/index.html ]] || {
    echo "dist/index.html not found — run the build first" >&2
    exit 1
  }

  local id
  id="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"

  echo "==> Uploading release ${id}"
  tar -C dist -czf - . |
    remote "mkdir -p '${ROOT}/releases/${id}' && tar -xzf - -C '${ROOT}/releases/${id}' && printf '%s\n' '${id}' > '${ROOT}/releases/${id}/version.txt'"

  echo "==> Switching to ${id}"
  # A symlink replaced with rename(2): requests never see a half-written release.
  remote "ln -sfn 'releases/${id}' '${ROOT}/current.next' && mv -Tf '${ROOT}/current.next' '${ROOT}/current' && cd '${ROOT}/releases' && ls -1t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf --"

  check
}

rollback() {
  local previous
  previous="$(remote "cd '${ROOT}/releases' && ls -1t | sed -n 2p")"
  [[ -n "$previous" ]] || {
    echo "No previous release to roll back to" >&2
    exit 1
  }
  echo "==> Rolling back to ${previous}"
  # The previous release becomes the newest again, so a second rollback toggles.
  remote "touch '${ROOT}/releases/${previous}' && ln -sfn 'releases/${previous}' '${ROOT}/current.next' && mv -Tf '${ROOT}/current.next' '${ROOT}/current'"
  check
}

check() {
  echo "==> Checking https://${DOMAIN}"
  local failed=0 path status
  # The home page, a deep link (client-side route) and the service worker script.
  for path in / /nft/emerald-ape-042 /mockServiceWorker.js /version.txt; do
    status="$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "https://${DOMAIN}${path}" || true)"
    printf '    %-28s %s\n' "$path" "$status"
    [[ "$status" == "200" ]] || failed=1
  done
  status="$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "https://${DOMAIN}/api/nfts" || true)"
  printf '    %-28s %s (expected 404: the API only exists in the browser)\n' "/api/nfts" "$status"
  [[ "$status" == "404" ]] || failed=1
  echo "    version: $(curl -sS -m 30 "https://${DOMAIN}/version.txt" || echo '?')"
  if [[ "$failed" != "0" ]]; then
    echo "Smoke check failed" >&2
    exit 1
  fi
  echo "==> Published: https://${DOMAIN}"
}

case "${1:-release}" in
  setup) setup ;;
  release) release ;;
  rollback) rollback ;;
  check) check ;;
  *)
    echo "Usage: bash deploy/deploy.sh [setup|release|rollback|check]" >&2
    exit 1
    ;;
esac
