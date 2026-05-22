import re
import pytesseract
from PIL import Image, ImageFilter, ImageOps
import io


# Matches a price at the end of a line: 45.000 / 45,000 / 45000 / 12.50
_PRICE_RE = re.compile(r'^(.+?)\s{2,}([\d]+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$')
_TOTAL_KEYWORDS = {'total', 'grand total', 'jumlah', 'subtotal', 'amount due', 'tagihan'}
_SKIP_KEYWORDS = {'tax', 'ppn', 'service', 'disc', 'diskon', 'tip', 'change', 'kembalian', 'cash', 'tunai', 'card', 'kartu'}


def _normalize_price(raw: str) -> int:
    """Turn '45.000' / '45,000' / '45000' → 45000 (integer)."""
    cleaned = raw.replace('.', '').replace(',', '')
    try:
        return int(cleaned)
    except ValueError:
        return 0


def _preprocess(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes)).convert('L')
    img = ImageOps.autocontrast(img)
    img = img.filter(ImageFilter.SHARPEN)
    return img


def parse_receipt(image_bytes: bytes) -> dict:
    img = _preprocess(image_bytes)
    text = pytesseract.image_to_string(img, config='--psm 6')

    items = []
    total = 0

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        lower = line.lower()

        # Check for total line
        if any(kw in lower for kw in _TOTAL_KEYWORDS) and not any(kw in lower for kw in _SKIP_KEYWORDS):
            m = _PRICE_RE.match(line)
            if m:
                candidate = _normalize_price(m.group(2))
                if candidate > total:
                    total = candidate
            continue

        # Skip tax/service/discount lines
        if any(kw in lower for kw in _SKIP_KEYWORDS):
            continue

        m = _PRICE_RE.match(line)
        if m:
            name = m.group(1).strip().title()
            price = _normalize_price(m.group(2))
            if price > 0:
                items.append({'name': name, 'price': price})

    # If no explicit total found, sum item prices as fallback
    if total == 0 and items:
        total = sum(i['price'] for i in items)

    return {'items': items, 'total': total, 'raw_text': text}
