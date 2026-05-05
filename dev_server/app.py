"""Dev server for jernerics-dashboard development.

Serves POST /query against a pre-generated SQLite file (dev_server/seed.db).
No auth required — accepts any/no Bearer token.

Generate the seed data first: python -m dev_server.generate
"""

import argparse
import sqlite3
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

_SEED_DB_PATH = Path(__file__).parent / "seed.db"

_READ_ONLY_KEYWORDS = {"SELECT", "WITH", "VALUES", "EXPLAIN", "SHOW", "DESCRIBE"}
MAX_ROWS = 50_000


class QueryRequest(BaseModel):
    sql: str


def _is_read_only(sql: str) -> bool:
    first_word = sql.strip().split()[0].upper()
    return first_word in _READ_ONLY_KEYWORDS


def create_app() -> FastAPI:
    if not _SEED_DB_PATH.exists():
        raise FileNotFoundError(
            f"Seed database not found at {_SEED_DB_PATH}. "
            "Run 'python -m dev_server.generate' first."
        )

    app = FastAPI(title="jernerics-dashboard dev server")

    @app.post("/query")
    def query(req: QueryRequest) -> JSONResponse:
        if not _is_read_only(req.sql):
            return JSONResponse(
                status_code=400,
                content={"error": "Only SELECT queries are allowed"},
            )
        con = sqlite3.connect(f"file:{_SEED_DB_PATH}?mode=ro", uri=True)
        try:
            cursor = con.execute(req.sql)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(MAX_ROWS + 1)
            if len(rows) > MAX_ROWS:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Result exceeds maximum of {MAX_ROWS} rows"},
                )
            return JSONResponse(
                content={"columns": columns, "rows": [list(r) for r in rows]}
            )
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={"error": str(e)},
            )
        finally:
            con.close()

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="jernerics-dashboard dev server")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind")
    args = parser.parse_args()

    uvicorn.run(create_app(), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
