#!/usr/bin/env python3
"""
extract_docx_formulas.py
Triple Stamp Tools - Screen Printing & Apparel Production

Parses "Ink Color Formulas for Triple Stamp Press.docx" to extract, clean, normalize,
and separate valid ink formulas from questionable/ambiguous ones.
Generates:
- backend/scripts/clean_ink_formulas.json
- backend/scripts/questionable_formulas.json
- backend/scripts/import_ink_formulas.sql
"""

import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime

DOCX_FILE = "Ink Color Formulas for Triple Stamp Press.docx"
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
CLEAN_JSON = os.path.join(SCRIPTS_DIR, "clean_ink_formulas.json")
QUESTIONABLE_JSON = os.path.join(SCRIPTS_DIR, "questionable_formulas.json")
SQL_FILE = os.path.join(SCRIPTS_DIR, "import_ink_formulas.sql")

BASE_MAP = {
    'cdb': 'cdb',
    'cbd': 'cdb',
    'cd': 'cdb',
    'wdb': 'wdb',
    'wbd': 'wdb',
    'ez': 'ez clear',
    'ez clear': 'ez clear',
    'ezclear': 'ez clear',
    'sw': 'stretch white',
    'stretch white': 'stretch white',
    'stretchwhite': 'stretch white',
    's75': 'wdb',
    's-75': 'wdb',
    'stretch': 'stretch',
    'stretch clear': 'stretch',
    'stretchclear': 'stretch',
    'matte': 'mix',
    '301': '301',
    '301base': '301',
    '301c': '301',
    '301 c': '301',
    'mix': 'mix',
    '50/50': 'mix',
    'binder': 'binder'
}

INGREDIENT_MAP = {
    'yellow': 'yellow',
    'gold': 'gold',
    'pink': 'pink',
    'rubine': 'rubine',
    'rub': 'rubine',
    'orange': 'orange',
    'black': 'black',
    'k': 'black',
    'green': 'green',
    'violet': 'violet',
    'process': 'process',
    'pro': 'process',
    'process blue': 'process',
    'reflex': 'reflex',
    'reflex blue': 'reflex',
    'ref': 'reflex',
    'agent': 'agent',
    'flo yellow': 'flo yellow',
    'flo. yellow': 'flo yellow',
    'neon yellow': 'flo yellow',
    'fluorescent yellow': 'flo yellow',
    'flo pink': 'flo pink',
    'flo. pink': 'flo pink',
    'neon pink': 'flo pink',
    'fluorescent pink': 'flo pink',
    'flo orange': 'flo orange',
    'flo. orange': 'flo orange',
    'neon orange': 'flo orange',
    'fluorescent orange': 'flo orange',
    'flo green': 'flo green',
    'flo. green': 'flo green',
    'neon green': 'flo green',
    'fluorescent green': 'flo green',
    'flo blue': 'flo blue',
    'flo red': 'flo red',
    'warm red': 'warm red',
    'warmred': 'warm red',
    'wr': 'warm red',
    'brilliant red': 'warm red',
    'white': 'white',
    # Additives
    'matte': 'matte',
    'mat': 'matte',
    'ez': 'ez',
    'ez clear': 'ez',
    'cdb': 'cdb',
    'cbd': 'cdb',
    'wdb': 'wdb',
    'wbd': 'wdb',
    's75': 'wdb',
    'sw': 'stretch white',
    'stretch': 'stretch',
    'stretch white': 'stretch white',
    'stretch clear': 'stretch clear',
    '301': '301',
    'fixer': 'fixer'
}

def clean_date_str(text):
    m = re.search(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b', text)
    if m:
        m1, d1, y1 = m.group(1), m.group(2), m.group(3)
        if len(y1) == 2:
            y1 = '20' + y1
        month = m1.zfill(2)
        day = d1.zfill(2)
        return f"{y1}-{month}-{day}"
    m_my = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b', text, re.I)
    if m_my:
        months = {'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
                  'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'}
        mon_str = m_my.group(1)[:3].lower()
        yr = m_my.group(2)
        return f"{yr}-{months[mon_str]}-01"
    return ""

def normalize_fraction(val_str):
    val_str = val_str.replace(',', '.').strip()
    if '/' in val_str:
        parts = val_str.split('/')
        try:
            num = float(parts[0])
            denom = float(parts[1])
            res = round(num / denom, 4)
            return str(int(res)) if res.is_integer() else str(res)
        except Exception:
            return val_str
    try:
        f = float(val_str)
        return str(int(f)) if f.is_integer() else str(round(f, 4))
    except Exception:
        return val_str

def parse_docx_lines(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        tree = ET.fromstring(xml_content)

    parent_map = {c: p for p in tree.iter() for c in p}
    paragraphs = []

    for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        pPr = p.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
        p_style = None
        if pPr is not None:
            pStyle = pPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pStyle')
            if pStyle is not None:
                p_style = pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')

        tokens = []
        for elem in p.iter():
            tag = elem.tag.split('}')[-1]
            if tag == 't' and elem.text:
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

        raw_lines = [[]]
        for tok in tokens:
            if tok[0] == 'br':
                raw_lines.append([])
            else:
                raw_lines[-1].append(tok)

        for rline in raw_lines:
            if not rline: continue
            
            chunks = []
            curr = []
            for idx, (tt, text, b, u) in enumerate(rline):
                is_new = False
                if idx > 0 and b:
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

    # Stitch orphaned dash lines to their preceding color names
    merged_lines = []
    for l in paragraphs:
        txt = l['text']
        if (txt.startswith('- ') or txt.startswith('-- ')) and merged_lines:
            prev = merged_lines[-1]
            if len(prev['text'].split()) <= 6 and not (' - ' in prev['text']):
                prev['text'] = f"{prev['text']} {txt}"
                continue
        merged_lines.append(l)

    return merged_lines

def is_formula_line(text):
    if re.search(r'\d+(?:\.\d+)?%|\b(?:drops?|parts?)\b', text, re.I):
        return True
    if re.search(r'[-–—]\s*(?:ez|cdb|cbd|wdb|wbd|s75|sw|matte|301|mix|stretch)\b', text, re.I):
        return True
    if re.search(r'\b(?:\d+(?:\.\d+)?|\.\d+)\s*(?:rubine|gold|orange|yellow|black|reflex|process|violet|green|pink|agent|wr|k)\b', text, re.I):
        return True
    if re.match(r'^\s*white\s*[-–—]\s*(?:wdb|s75|sw|cdb|stretch|mix|50/50)', text, re.I):
        return True
    return False

def parse_color_formula(text):
    notes = []
    
    for m in re.finditer(r'\{([^}]+)\}', text):
        notes.append(m.group(1).strip())
    text = re.sub(r'\{[^}]+\}', ' ', text)

    for m in re.finditer(r'\*\*([^*]+)\*\*', text):
        notes.append(m.group(1).strip())
    text = re.sub(r'\*\*[^*]+\*\*', ' ', text)

    for m in re.finditer(r'\[([^\]]+)\]', text):
        content = m.group(1).strip()
        if not re.search(r'\d+(?:\.\d+)?%', content):
            notes.append(content)
            text = text.replace(m.group(0), ' ')
    
    m_paren = re.search(r'\(([^)]*(?:revolver|mesh|hit|screen|flood|print)[^)]*)\)', text, re.I)
    if m_paren:
        notes.append(m_paren.group(1).strip())
        text = text.replace(m_paren.group(0), ' ')

    parts = re.split(r'\s+[-–—]+\s+', text)
    if len(parts) == 1:
        parts = re.split(r'\s*:\s*', text)
    
    if len(parts) < 2:
        return None, True, f"Missing delimiter separating color and formula: '{text}'"

    color_name = parts[0].strip().strip('"').strip("'").strip()
    
    if not color_name or color_name == '??' or color_name.startswith('??'):
        return None, True, f"Invalid or missing color name: '{color_name}'"

    base = "cdb"
    formula_str = ""

    if len(parts) >= 3:
        potential_base = parts[1].strip().lower()
        if potential_base in BASE_MAP:
            base = BASE_MAP[potential_base]
            formula_str = " / ".join(parts[2:])
        elif any(b in potential_base for b in ('cdb', 'cbd', 'wdb', 'wbd', 'ez', 's75', 'sw', '301', 'mix', '50/50', 'stretch')):
            base = "mix" if ('/' in potential_base or '\\' in potential_base or '&' in potential_base) else BASE_MAP.get(potential_base, potential_base)
            formula_str = " / ".join(parts[2:])
        else:
            formula_str = " / ".join(parts[1:])
    else:
        p1 = parts[1].strip()
        m_base = re.match(r'^(ez clear|ez|cdb|cbd|wdb|wbd|s75|sw|stretch white|stretch|301|mix|50/50)\b[\s\-:]*(.*)', p1, re.I)
        if m_base:
            base_cand = m_base.group(1).lower()
            base = BASE_MAP.get(base_cand, base_cand)
            formula_str = m_base.group(2)
        else:
            formula_str = p1

    # Special handling for White inks where formula is base-only or base ratio
    if color_name.lower().startswith('white') and (not formula_str.strip() or re.match(r'^(?:wdb|s75|sw|stretch|cdb|50/50|mix)$', formula_str.strip(), re.I)):
        pure_base = formula_str.strip().lower() if formula_str.strip() else base
        if '/' in pure_base or 'mix' in pure_base or '50/50' in pure_base:
            ingredients = [{'percentage': '50', 'ingredient': 'cdb'}, {'percentage': '50', 'ingredient': 'stretch white'}]
            base = 'mix'
        else:
            base = BASE_MAP.get(pure_base, 'stretch white')
            ingredients = [{'percentage': '100', 'ingredient': 'white'}]
        note_text = "; ".join([n for n in notes if n])
        return {'color': color_name, 'base': base, 'formula': ingredients, 'note': note_text}, False, ""

    norm_str = re.sub(r'\|+|\+', ' / ', formula_str)
    raw_tokens = re.split(r'[/,]+', norm_str)

    ingredients = []
    ing_pat = re.compile(r'(\d+(?:\.\d+)?|\.\d+|\d+/\d+|\d+,\d+)\s*%?\s*([a-zA-Z\.\s0-9]+)')

    for tok in raw_tokens:
        tok = tok.strip().strip('[').strip(']').strip()
        if not tok:
            continue
        
        if 'activated base' in tok.lower() or ('agent' in tok.lower() and not re.search(r'\d', tok)):
            ingredients.append({'percentage': '6', 'ingredient': 'agent'})
            continue

        m_drops = re.search(r'(\d+)\s*drops?\s+([a-zA-Z\s]+)', tok, re.I)
        if m_drops:
            num_drops = int(m_drops.group(1))
            ing_raw = m_drops.group(2).strip().lower()
            ing_clean = INGREDIENT_MAP.get(ing_raw, ing_raw)
            pct_val = str(round(num_drops * 0.02, 3))
            ingredients.append({'percentage': pct_val, 'ingredient': ing_clean})
            continue

        m_301 = re.search(r'(\d+(?:\.\d+)?|\.\d+)\s*%?\s*301[c]?', tok, re.I)
        if m_301:
            ingredients.append({'percentage': normalize_fraction(m_301.group(1)), 'ingredient': '301'})
            continue

        m = ing_pat.search(tok)
        if m:
            pct_raw = m.group(1)
            ing_raw = m.group(2).strip().lower()
            ing_clean = re.sub(r'\b(?:drops?|parts?)\b', '', ing_raw).strip()
            
            if ing_clean in INGREDIENT_MAP:
                ing_final = INGREDIENT_MAP[ing_clean]
            else:
                found = False
                for k in sorted(INGREDIENT_MAP.keys(), key=len, reverse=True):
                    if k in ing_clean:
                        ing_final = INGREDIENT_MAP[k]
                        found = True
                        break
                if not found:
                    ing_final = ing_clean if ing_clean else 'other'

            pct_final = normalize_fraction(pct_raw)
            ingredients.append({'percentage': pct_final, 'ingredient': ing_final})
        elif 'white' in tok.lower() and ('stretch' in tok.lower() or 'wdb' in tok.lower() or 's75' in tok.lower() or 'sw' in tok.lower()):
            ingredients.append({'percentage': '100', 'ingredient': 'white'})
        else:
            if len(tok.split()) <= 4 and not re.search(r'\d', tok):
                notes.append(tok)

    if not ingredients:
        return None, True, f"No parseable ingredients found in '{text}'"

    for ing in ingredients:
        try:
            val = float(ing['percentage'])
            if val < 0 or val > 200:
                return None, True, f"Suspicious percentage value: {val}% for {ing['ingredient']} in '{text}'"
        except Exception:
            return None, True, f"Non-numeric percentage '{ing['percentage']}' in '{text}'"

    note_text = "; ".join([n for n in notes if n])
    result = {
        'color': color_name,
        'base': base,
        'formula': ingredients,
        'note': note_text
    }
    return result, False, ""

def extract_all():
    print(f"Reading {DOCX_FILE}...")
    lines = parse_docx_lines(DOCX_FILE)
    print(f"Total structured lines (after stitching): {len(lines)}")

    clean_jobs = []
    questionable_items = []

    SECTION_CLIENTS = {
        "brandito": "BRANDITO",
        "fsr": "FSR",
        "port merchandise": "PORT MERCH",
        "port merch": "PORT MERCH",
        "the veil brewing co": "THE VEIL",
        "the veil": "THE VEIL",
        "venture richmond / rff": "VENTURE RICHMOND",
        "venture richmond": "VENTURE RICHMOND"
    }

    section_client = None
    current_client = "TRIPLE STAMP PRESS"
    current_job = "HOUSE FORMULAS"
    current_date = ""
    current_location = ""
    current_notes = []
    current_rows = []

    def commit_job():
        nonlocal current_rows, current_location, current_notes
        if not current_rows:
            return

        notes_str = "; ".join([n for n in current_notes if n]).strip()
        job_data = {
            'clientName': current_client,
            'jobName': current_job,
            'printLocation': current_location,
            'date': current_date,
            'formulaName': f"{current_client} // {current_job}" + (f" ({current_date})" if current_date else ""),
            'rows': current_rows,
            'notes': notes_str
        }

        has_color = any(r.get('type') == 'color' for r in current_rows)
        if not has_color:
            questionable_items.append({'item': job_data, 'reason': 'No color formulas in job'})
        elif current_client in ('??', '?') or current_job in ('??', '?'):
            questionable_items.append({'item': job_data, 'reason': 'Unknown/placeholder client or job name'})
        else:
            clean_jobs.append(job_data)

        current_rows = []
        current_location = ""
        current_notes = []

    for item in lines:
        text = item['text'].strip()
        if not text:
            continue

        if re.match(r'^-([A-Z#]|1-9)-+$', text) or text in ('COMMON FORMULAS!', 'C', 'TRIPLE STAMP PRESS'):
            section_client = None
            continue

        t_lower = text.lower()
        matched_sec = None
        if '//' not in text:
            for k, v in SECTION_CLIENTS.items():
                if t_lower == k or t_lower.startswith(k + " ") or t_lower.startswith(k + "\t"):
                    matched_sec = v
                    break
        
        if matched_sec:
            commit_job()
            section_client = matched_sec
            current_client = matched_sec
            current_job = "GENERAL"
            current_date = ""
            continue

        # If inside a major client section
        if section_client:
            if section_client == "THE VEIL" and text == "WILD WANDER":
                commit_job()
                section_client = None
                current_client = "WILD WANDER"
                current_job = "GENERAL"
                current_date = ""
                continue

            if is_formula_line(text):
                parsed, is_q, q_reason = parse_color_formula(text)
                if is_q or not parsed:
                    questionable_items.append({
                        'client': current_client,
                        'job': current_job,
                        'raw_text': text,
                        'reason': q_reason
                    })
                else:
                    if parsed.get('note'):
                        current_notes.append(parsed['note'])
                    current_rows.append({
                        'type': 'color',
                        'color': parsed['color'],
                        'base': parsed['base'],
                        'formula': parsed['formula']
                    })
                continue

            if re.search(r'\bflash\b|\bf\b\s*[/\\\\]|[/\\\\]\s*\bf\b', text, re.I):
                current_notes.append(f"Print order: {text}")
                if current_rows:
                    current_rows.append({'type': 'flash'})
                continue

            commit_job()
            current_client = section_client
            if '//' in text:
                parts = text.split('//')
                raw_job = parts[-1].strip().strip('*').strip()
            else:
                raw_job = text.strip('*').strip()
            
            m_note = re.search(r'\(([^)]+)\)', raw_job)
            d = clean_date_str(raw_job)
            if m_note and not d:
                current_notes.append(m_note.group(1).strip())
                raw_job = raw_job.replace(m_note.group(0), ' ').strip()
            current_date = d
            if d:
                raw_job = re.sub(r'\(?\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\)?', '', raw_job).strip()
            
            loc_m = re.search(r'\b(hoodies?|totes?|onesies?|left[- ]chest|pocket|back|sleeve|front|bandanas?)\b', raw_job, re.I)
            if loc_m:
                current_location = loc_m.group(0).title()

            current_job = raw_job if raw_job else "GENERAL"
            continue

        # Outside of major client section
        if '//' in text and not is_formula_line(text):
            commit_job()
            c_part, j_part = text.split('//', 1)
            current_client = c_part.strip().strip('*').strip()
            raw_job = j_part.strip().strip('*').strip()
            
            m_note = re.search(r'\(([^)]+)\)', raw_job)
            if m_note:
                current_notes.append(m_note.group(1).strip())
                raw_job = raw_job.replace(m_note.group(0), ' ').strip()
                
            d = clean_date_str(raw_job)
            current_date = d
            if d:
                raw_job = re.sub(r'\(?\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\)?', '', raw_job).strip()
            current_job = raw_job if raw_job else "GENERAL"
            continue

        if (item['has_u'] or item['style'] in ('Heading1', 'Heading2', 'Title')) and not is_formula_line(text):
            commit_job()
            d = clean_date_str(text)
            is_job_like = bool(d) or (text.startswith('[') and text.endswith(']')) or any(w in text.lower() for w in ('tees', 'hoodie', 'tote', 'tag', 'print', 'colorway', 'replacing', 'revolve', 'double', 'tanks', 'shelf', 'sweatshirt', 'onesie', 'bandana', 'pockets'))
            if is_job_like:
                current_date = d
                raw_job = text.strip('*').strip()
                if d:
                    raw_job = re.sub(r'\(?\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\)?', '', raw_job).strip()
                current_job = raw_job if raw_job else "GENERAL"
            else:
                current_client = text.strip('*').strip()
                current_job = "GENERAL"
                current_date = ""
            continue

        if is_formula_line(text):
            parsed, is_q, q_reason = parse_color_formula(text)
            if is_q or not parsed:
                questionable_items.append({
                    'client': current_client,
                    'job': current_job,
                    'raw_text': text,
                    'reason': q_reason
                })
            else:
                if parsed.get('note'):
                    current_notes.append(parsed['note'])
                current_rows.append({
                    'type': 'color',
                    'color': parsed['color'],
                    'base': parsed['base'],
                    'formula': parsed['formula']
                })
            continue

        if re.search(r'\bflash\b|\bf\b\s*[/\\\\]|[/\\\\]\s*\bf\b', text, re.I):
            current_notes.append(f"Print order: {text}")
            if current_rows:
                current_rows.append({'type': 'flash'})
            continue

        d = clean_date_str(text)
        if d or len(text.split()) <= 8:
            commit_job()
            raw_job = text.strip('*').strip()
            
            m_note = re.search(r'\(([^)]+)\)', raw_job)
            if m_note and not d:
                current_notes.append(m_note.group(1).strip())
                raw_job = raw_job.replace(m_note.group(0), ' ').strip()
                
            if d:
                current_date = d
                raw_job = re.sub(r'\(?\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\)?', '', raw_job).strip()
            else:
                current_date = ""

            loc_m = re.search(r'\b(hoodies?|totes?|onesies?|left[- ]chest|pocket|back|sleeve|front|bandanas?)\b', raw_job, re.I)
            if loc_m:
                current_location = loc_m.group(0).title()

            current_job = raw_job if raw_job else "GENERAL"
        else:
            current_notes.append(text)

    commit_job()

    clean_color_count = sum(len([r for r in j['rows'] if r.get('type') == 'color']) for j in clean_jobs)

    print(f"\n==========================================")
    print(f"Extraction Summary:")
    print(f"  Clean Jobs: {len(clean_jobs)}")
    print(f"  Clean Color Formulas: {clean_color_count}")
    print(f"  Questionable Items Isolated: {len(questionable_items)}")
    print(f"==========================================")

    with open(CLEAN_JSON, 'w', encoding='utf-8') as f:
        json.dump(clean_jobs, f, indent=2)
    print(f"Clean formulas saved: {CLEAN_JSON}")

    with open(QUESTIONABLE_JSON, 'w', encoding='utf-8') as f:
        json.dump(questionable_items, f, indent=2)
    print(f"Questionable items saved: {QUESTIONABLE_JSON}")

    with open(SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- =====================================================================\n")
        f.write("-- Triple Stamp Tools - Ink Formulas Migration\n")
        f.write(f"-- Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Total Clean Jobs: {len(clean_jobs)}\n")
        f.write(f"-- Total Color Formulas: {clean_color_count}\n")
        f.write("-- =====================================================================\n\n")
        
        f.write("-- Ensure notes column exists on ink_formulas\n")
        f.write("ALTER TABLE ink_formulas ADD COLUMN IF NOT EXISTS notes text DEFAULT '';\n\n")

        batch_size = 50
        for b_start in range(0, len(clean_jobs), batch_size):
            batch = clean_jobs[b_start:b_start + batch_size]
            f.write("INSERT INTO ink_formulas (\"clientName\", \"jobName\", \"printLocation\", date, \"formulaName\", rows, notes)\nVALUES\n")
            value_lines = []
            for j in batch:
                c_esc = j['clientName'].replace("'", "''")
                j_esc = j['jobName'].replace("'", "''")
                loc_esc = j['printLocation'].replace("'", "''")
                d_esc = j['date'].replace("'", "''")
                fn_esc = j['formulaName'].replace("'", "''")
                rows_json = json.dumps(j['rows']).replace("'", "''")
                n_esc = j['notes'].replace("'", "''")
                value_lines.append(f"  ('{c_esc}', '{j_esc}', '{loc_esc}', '{d_esc}', '{fn_esc}', '{rows_json}'::jsonb, '{n_esc}')")
            f.write(",\n".join(value_lines))
            f.write(";\n\n")

    print(f"SQL migration script generated: {SQL_FILE}")

if __name__ == "__main__":
    extract_all()
