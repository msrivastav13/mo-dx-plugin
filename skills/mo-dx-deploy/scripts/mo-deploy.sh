#!/usr/bin/env bash
# Saves one source file or bundle with the matching mo-dx-plugin deploy:* command.
# Exits 1 when the save fails: the plugin itself exits 0 on compile errors and
# only signals failure with a "✖" in its output.
#
# Usage: mo-deploy.sh <path> -o <org> [extra sf flags...]
set -uo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path> -o <org> [extra sf flags...]" >&2
  exit 2
fi

path="${1%/}"
shift
# A meta file deploys its source file.
path="${path%-meta.xml}"

case "/$path" in
  */lwc/*) cmd="deploy:lwc" ;;
  */aura/*) cmd="deploy:aura" ;;
  */staticresources/*) cmd="deploy:staticresource" ;;
  *.cls) cmd="deploy:apex" ;;
  *.trigger) cmd="deploy:trigger" ;;
  *.page) cmd="deploy:vf" ;;
  *.component) cmd="deploy:vfcomponent" ;;
  *)
    echo "Don't know which deploy:* command handles '$path'." >&2
    echo "Use sf project deploy start for other metadata types." >&2
    exit 2
    ;;
esac

output="$(sf "$cmd" -p "$path" "$@" 2>&1)"
status=$?
printf '%s\n' "$output"

if [[ $status -ne 0 ]] || grep -q '✖' <<<"$output"; then
  exit 1
fi
