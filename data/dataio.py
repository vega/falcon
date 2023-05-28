from __future__ import annotations
import pyarrow as pa
from pyarrow.parquet import ParquetFile, ParquetWriter


def all_rows_arrow(file_name):
    with pa.memory_map(file_name, "r") as source:
        loaded_arrays = pa.ipc.open_file(source).read_all()
        return loaded_arrays


def n_rows_parquet(
    filename: str,
    n_rows: int = 65536,
    columns: len[str] | None = None,
    all: bool = False,
) -> pa.Table:
    """returns a pyarrow table of just the first n_rows from the parquet"""

    pf = ParquetFile(filename)
    batches = pf.iter_batches(batch_size=n_rows, columns=columns)
    if all:
        return pa.Table.from_batches(batches)  # extract all
    else:
        batch = next(batches)  # just the single with n_rows
        return pa.Table.from_batches([batch])


def table_to_arrow_file(table: pa.Table, filename: str):
    """writes the pyarrow table to a file with arrow format"""

    writer = pa.RecordBatchFileWriter(filename, table.schema)
    writer.write(table)
    writer.close()


def table_to_parquet_file(table: pa.Table, filename: str):
    """writes the pyarrow table to a file with parquet format"""

    writer = ParquetWriter(filename, table.schema)
    writer.write_table(table)
    writer.close()
