# Build stage
FROM python:3.12-slim as builder

WORKDIR /app

COPY engine/ engine/
RUN pip install --user --no-cache-dir ./engine

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the knowledge-hub MCP server against the mounted workspace
CMD ["ag-mcp", "--workspace", "/app"]
