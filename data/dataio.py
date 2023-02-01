import pyarrow as pa
from pyarrow.parquet import ParquetFile


def n_rows_parquet(filename: str, n_rows: int = 1) -> pa.Table:
    """returns a pyarrow table of just the first n_rows from the parquet"""

    pf = ParquetFile(filename)
    batch = next(pf.iter_batches(batch_size=n_rows))
    table = pa.Table.from_batches([batch])
    return table


def table_to_arrow_file(table: pa.Table, filename: str):
    """writes the pyarrow table to a file with arrow format"""

    writer = pa.RecordBatchFileWriter(filename, table.schema)
    writer.write(table)
    writer.close()
