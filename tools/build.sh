#!/bin/sh
set -eu

go run ./tools/build-assets
go build -o "${VERCEL_OUTPUT_FILE:-stivi.xyz}" .
