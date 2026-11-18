#!/bin/sh
set -eu

dump=$(mktemp)
trap 'rm -f "$dump"' EXIT
aws_s3() { aws --endpoint-url "$S3_ENDPOINT" s3 "$@"; }

while :; do
  if pg_dump --format=custom --no-owner --file="$dump" &&
     aws_s3 cp "$dump" "s3://backups/postgres/$(date -u +%Y%m%dT%H%M%SZ).dump" --only-show-errors; then
    date +%s > /tmp/last-backup
    printf '{"msg":"Postgres backup uploaded"}\n'
    # LocalStack editions may store lifecycle rules without enforcing them.
    cutoff=$(date -u -d "@$(($(date +%s) - 14 * 86400))" +%Y%m%dT%H%M%SZ)
    if listing=$(aws_s3 ls s3://backups/postgres/); then
      printf '%s\n' "$listing" | awk -v cutoff="$cutoff" '$4 ~ /^[0-9]+T[0-9]+Z\.dump$/ && $4 < cutoff ".dump" { print $4 }' |
        while IFS= read -r file; do aws_s3 rm "s3://backups/postgres/$file" --only-show-errors; done
    fi
    now=$(date +%s)
    sleep "$((86400 - now % 86400))"
  else
    printf '{"level":"error","msg":"Postgres backup failed"}\n' >&2
    sleep 300
  fi
done
