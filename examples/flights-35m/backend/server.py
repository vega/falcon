""" Backend server for the frontend app 
This file contains the endpoints that can be called via HTTP
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import duckdb
import pyarrow as pa
from fire import Fire
from uvicorn import run

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# setup global connection to the database with a table
con = duckdb.connect()
con.query("""CREATE TABLE flights AS FROM 'data/flights_2006_2010.parquet'""")


@app.get("/query/{sql_query:path}")
async def query(sql_query: str):
    global con
    sql_query = sql_query.replace("count(*)", "count(*)::INT")
    result = con.query(sql_query).arrow()
    return Response(arrow_to_bytes(result), media_type="application/octet-stream")


def arrow_to_bytes(table: pa.Table):
    sink = pa.BufferOutputStream()
    with pa.RecordBatchStreamWriter(sink, table.schema) as writer:
        writer.write_table(table)
    bytes = sink.getvalue().to_pybytes()
    return bytes


def serve(port=8000, host="localhost"):
    run(app, port=port, host=host)


if __name__ == "__main__":
    Fire(serve)  # so I can run cli args with it
