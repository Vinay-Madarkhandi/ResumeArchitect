#!/bin/sh
# Restore a downloaded custom-format dump into a separate, empty database.
set -eu
if [ "$#" -ne 2 ]; then
  echo 'Usage: scripts/restore.sh <empty-database-url> <backup.dump>' >&2
  exit 2
fi
exec pg_restore --no-owner --no-privileges --single-transaction --exit-on-error --dbname="$1" "$2"
