import zipfile, xml.etree.ElementTree as ET, re

with zipfile.ZipFile('Ink Color Formulas for Triple Stamp Press.docx') as z:
    xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)

# Map element to its parent
parent_map = {c: p for p in tree.iter() for c in p}

paragraphs = []
for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    pPr = p.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
    p_style = None
    if pPr is not None:
        pStyle = pPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pStyle')
        if pStyle is not None:
            p_style = pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')

    # Traverse all descendants of p in document order
    tokens = []
    for elem in p.iter():
        tag = elem.tag.split('}')[-1]
        if tag == 't' and elem.text:
            # Check rPr on parent run
            parent = parent_map.get(elem)
            b = False
            u = False
            if parent is not None and parent.tag.split('}')[-1] == 'r':
                rPr = parent.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                if rPr is not None:
                    b = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b') is not None
                    u = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}u') is not None
            tokens.append(('t', elem.text, b, u))
        elif tag in ('br', 'cr'):
            tokens.append(('br', '\n', False, False))

    # Group tokens into lines separated by 'br'
    raw_lines = [[]]
    for tok in tokens:
        if tok[0] == 'br':
            raw_lines.append([])
        else:
            raw_lines[-1].append(tok)

    # For each raw_line, check if it contains multiple formulas without br
    for rline in raw_lines:
        if not rline: continue
        
        # Check if rline has multiple formulas
        chunks = []
        curr = []
        for idx, (tt, text, b, u) in enumerate(rline):
            is_new = False
            if idx > 0 and b:
                # Check next token text
                next_txt = rline[idx+1][1].strip() if idx + 1 < len(rline) else ""
                if next_txt.startswith('-') or re.match(r'^(?:cdb|cbd|wdb|wbd|ez|sw|s75|301|mix)\b', next_txt, re.I):
                    is_new = True
            elif idx > 0 and ('\\' in text or ('/' in text and 'flash' in text.lower())):
                is_new = True

            if is_new and curr:
                chunks.append(curr)
                curr = []
            curr.append((tt, text, b, u))
        if curr:
            chunks.append(curr)

        for ch in chunks:
            line_text = ''.join(c[1] for c in ch).strip()
            if not line_text: continue
            has_u = any(c[3] for c in ch if c[1].strip())
            has_b = any(c[2] for c in ch if c[1].strip())
            paragraphs.append({
                'text': line_text,
                'style': p_style,
                'has_u': has_u,
                'has_b': has_b
            })

print(f"Total reconstructed lines: {len(paragraphs)}")
