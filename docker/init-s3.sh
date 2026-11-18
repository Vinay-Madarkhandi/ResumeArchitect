#!/bin/sh
set -eu

for bucket in resume-uploads resume-exports backups; do
  if ! awslocal s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    if [ "$AWS_DEFAULT_REGION" = us-east-1 ]; then
      awslocal s3api create-bucket --bucket "$bucket"
    else
      awslocal s3api create-bucket --bucket "$bucket" --create-bucket-configuration "LocationConstraint=$AWS_DEFAULT_REGION"
    fi
  fi
done

awslocal s3api put-bucket-lifecycle-configuration --bucket backups --lifecycle-configuration '{
  "Rules":[{"ID":"expire-dumps","Filter":{"Prefix":"postgres/"},"Status":"Enabled","Expiration":{"Days":14}}]
}'
