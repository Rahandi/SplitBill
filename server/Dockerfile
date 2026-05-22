FROM python:3.10-alpine

RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python3", "main.py"]
