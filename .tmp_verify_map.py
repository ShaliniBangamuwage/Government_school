import json, io
from pathlib import Path
import requests
from pypdf import PdfReader

path = Path(r'D:\school\data\mathematics-course-catalog.json')
obj = json.loads(path.read_text(encoding='utf-8'))
entries = obj.get('entries', [])
print('TOTAL_ENTRIES=' + str(len(entries)))

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/pdf,application/octet-stream,*/*;q=0.8'
})

for entry in entries:
    url = entry.get('officialPdfUrl') or ''
    grade = entry.get('grade')
    medium = entry.get('medium')
    try:
        r = session.get(url, timeout=20, allow_redirects=True)
        status = r.status_code
        ctype = r.headers.get('Content-Type', '')
        clen = len(r.content)
        is_pdf = 'pdf' in ctype.lower() or r.content.startswith(b'%PDF-')
        pages = None
        if is_pdf:
            try:
                pages = len(PdfReader(io.BytesIO(r.content)).pages)
            except Exception as ex:
                pages = f'ERR:{type(ex).__name__}'
        print(f"{grade}|{medium}|{status}|{ctype}|{clen}|{pages}|{url}")
    except Exception as ex:
        print(f"{grade}|{medium}|ERROR|{type(ex).__name__}:{ex}|0|{url}")
