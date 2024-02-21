#!/bin/bash
set -exuo pipefail

cd "$(dirname "$0")/.."

./scripts/download-pages.ts
./scripts/parse-pages.ts
