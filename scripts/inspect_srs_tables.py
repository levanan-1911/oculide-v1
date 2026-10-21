import re

with open(r'docs/srs_content.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's extract all tables
tables = text.split('--- TABLE ')

with open(r'docs/srs_tables_extracted.txt', 'w', encoding='utf-8') as out:
    for idx, tbl in enumerate(tables[1:], 0):
        # Header info
        header_line = tbl.split('\n')[0]
        out.write(f"\n==================== TABLE {idx}: {header_line} ====================\n")
        lines = tbl.split('\n')[1:40] # first 40 rows
        for line in lines:
            if line.strip():
                out.write(line + '\n')

print("Extracted tables to docs/srs_tables_extracted.txt")
