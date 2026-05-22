FROM python:3.10-alpine

RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:5000", "main:app"]
