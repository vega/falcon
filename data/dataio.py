from __future__ import annotations
import pyarrow as pa
from pyarrow.parquet import ParquetFile, ParquetWriter


def all_rows_arrow(file_name):
    with pa.memory_map(file_name, "r") as source:
        loaded_arrays = pa.ipc.open_file(source).read_all()
        return loaded_arrays


def n_rows_parquet(
    filename: str, n_rows: int = 65536, columns: len[str] | None = None
) -> pa.Table:
    """returns a pyarrow table of just the first n_rows from the parquet"""

    pf = ParquetFile(filename)
    batch = next(pf.iter_batches(batch_size=n_rows, columns=columns))
    table = pa.Table.from_batches([batch])
    return table


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
