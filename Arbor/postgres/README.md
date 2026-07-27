# Arbor PostgreSQL

This PostgreSQL service is managed by `Arbor/docker-compose.yml`.
It uses `pgvector/pgvector:pg17` so Arbor can support vector search later.

## Start

```powershell
docker compose -f Arbor/docker-compose.yml up -d postgres
```

## Stop

```powershell
docker compose -f Arbor/docker-compose.yml stop postgres
```

## Connection

```txt
postgres://arbor:arbor@localhost:5433/arbor
```
