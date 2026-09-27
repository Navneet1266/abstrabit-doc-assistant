"""Guards the actual tenancy mechanism: the workspace filter must be part of
the vector query's WHERE clause, not a filter applied afterward to unscoped
results. This inspects the query text itself so a future refactor that
accidentally drops the predicate (e.g. "select everything, filter in Python")
fails CI immediately rather than silently leaking data across workspaces."""

import inspect

from app import retrieval


def test_retrieve_chunks_filters_by_workspace_inside_the_sql():
    source = inspect.getsource(retrieval.retrieve_chunks)
    assert "WHERE c.workspace_id = $1" in source
    assert "ORDER BY c.embedding <=> $2" in source


def test_retrieve_chunks_signature_requires_workspace_id():
    params = list(inspect.signature(retrieval.retrieve_chunks).parameters)
    assert "workspace_id" in params
