check:
    bun x biome check .
    bun x tsc --noEmit
    bun run build

fix:
    bun x biome check --write .

dev-server:
    python -m dev_server
