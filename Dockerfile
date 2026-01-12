FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

HEALTHCHECK --interval=1h --timeout=10s --retries=3 \
    CMD test -f /app/data.db || exit 1

CMD ["python", "app/main.py"]
