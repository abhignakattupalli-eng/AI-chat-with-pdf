from pathlib import Path
from app.pdf_processor import extract_and_process_pdf
from app.vector_store import vector_store
from app.rag_engine import generate_rag_answer

pdf = Path('sample_docs/AI_Technology_and_RAG_Architecture_Report.pdf')
pages, chunks = extract_and_process_pdf(pdf, 'test-doc-1', pdf.name)
print(f'Extracted {pages} pages and {len(chunks)} chunks.')
vector_store.add_chunks(chunks)

res = generate_rag_answer('What is the optimal chunk size and overlap for RAG?', chat_history=[])
print('\n--- GENERATED ANSWER ---')
print(res['answer'][:300] + '...')
print('\n--- SOURCES ---')
print(f"Sources count: {len(res['sources'])}")
for s in res['sources'][:2]:
    print(f"  - Source: {s['filename']} (Page {s['page_number']}) Similarity: {s['similarity']}")

# Clean up test doc
vector_store.delete_document('test-doc-1')
print('Cleaned up test document from index.')
