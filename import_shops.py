#!/usr/bin/env python3
import csv
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}

def col_number(cell_ref):
    letters = re.match(r'[A-Z]+', cell_ref).group()
    value = 0
    for char in letters:
        value = value * 26 + ord(char) - 64
    return value - 1

def read_sheet(path, wanted_sheet):
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read('xl/workbook.xml'))
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels}
        sheet = next(s for s in root.find('m:sheets', NS) if s.attrib['name'] == wanted_sheet)
        target = rel_map[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target = target if target.startswith('xl/') else 'xl/' + target.lstrip('/')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            for item in shared.findall('m:si', NS):
                strings.append(''.join(t.text or '' for t in item.iter('{%s}t' % NS['m'])))
        sheet_root = ET.fromstring(archive.read(target))
        rows = []
        for row in sheet_root.findall('.//m:sheetData/m:row', NS):
            values = {}
            for cell in row.findall('m:c', NS):
                ref = cell.attrib['r']
                value = cell.find('m:v', NS)
                if value is None:
                    values[col_number(ref)] = ''
                    continue
                text = value.text or ''
                if cell.attrib.get('t') == 's':
                    text = strings[int(text)]
                values[col_number(ref)] = text
            rows.append(values)
        width = max((max(row.keys(), default=-1) for row in rows), default=-1) + 1
        return [[row.get(i, '') for i in range(width)] for row in rows]

def number(value):
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None

source = Path('/Users/me/Downloads/育樂街後街一樓使用.xlsx')
rows = read_sheet(source, 'usage')
headers = [str(value).strip() for value in rows[0]]
records = []
for index, values in enumerate(rows[1:], start=1):
    row = dict(zip(headers, values))
    name = str(row.get('shop_name', '')).strip()
    longitude = number(row.get('X'))
    latitude = number(row.get('Y'))
    if not name or latitude is None or longitude is None:
        continue
    source_index = str(row.get('index') or index).strip()
    records.append({
        'id': str(row.get('id') or source_index),
        'source_index': source_index,
        'name_zh': name,
        'address_zh': str(row.get('address', '')).strip(),
        'weekday_hours': str(row.get('平日營業時間', '')).strip(),
        'longitude': longitude,
        'latitude': latitude,
        'shop_type': str(row.get('shop_type', '')).strip(),
        'main_category': str(row.get('main_cat', '')).strip(),
        'has_seat': str(row.get('has_seat', '')).strip(),
        'temp_stop': str(row.get('temp_stop', '')).strip(),
        'arcade_occupied_baseline': str(row.get('arcade_occupied', '')).strip(),
        'note': str(row.get('note', '')).strip(),
        'friendly_status': 'not_joined',
        'supports_street_redesign': False,
        'is_demo_shop': False,
        'google_maps_url': f'https://www.google.com/maps/search/?api=1&query={latitude},{longitude}'
    })

with open('/Users/me/Desktop/DEAL/shops.json', 'w', encoding='utf-8') as output:
    json.dump(records, output, ensure_ascii=False, indent=2)
print(f'Imported {len(records)} shops from {source}')
