#!/bin/sh
set -eu

if [ -d /data ]; then
  mkdir -p /data
  chown -R nextjs:nodejs /data
fi

exec runuser -u nextjs -- "$@"
