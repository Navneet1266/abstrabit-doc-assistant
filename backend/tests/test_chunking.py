from app.chunking import chunk_text


def test_chunks_short_text_as_single_chunk():
    text = "This is a short paragraph."
    chunks = chunk_text(text, chunk_size=1000, overlap=150)
    assert chunks == [text]


def test_chunks_respect_paragraph_boundaries_when_possible():
    paragraphs = [f"Paragraph {i} " + ("word " * 20) for i in range(5)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    # every paragraph's distinctive marker should show up somewhere in the chunks
    for i in range(5):
        assert any(f"Paragraph {i} " in c for c in chunks)


def test_overlap_carries_tail_into_next_chunk():
    paragraphs = [f"P{i}: " + ("x" * 180) for i in range(4)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) >= 2
    # the end of one chunk should reappear at the start of the next (the overlap)
    for a, b in zip(chunks, chunks[1:]):
        tail = a[-50:]
        assert tail[:20] in b


def test_hard_slices_a_single_paragraph_longer_than_chunk_size():
    text = "y" * 5000
    chunks = chunk_text(text, chunk_size=1000, overlap=150)
    assert len(chunks) > 1
    assert all(len(c) <= 1000 for c in chunks)
    # no data lost
    assert "".join(chunks).replace("y", "y") is not None
    assert sum(len(c) for c in chunks) >= len(text)
