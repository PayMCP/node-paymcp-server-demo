FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# First, set up the paymcp-ts package
COPY paymcp-ts/package.json paymcp-ts/tsconfig.json /app/paymcp-ts/
COPY paymcp-ts/src /app/paymcp-ts/src

# Build paymcp-ts
WORKDIR /app/paymcp-ts
RUN npm install --legacy-peer-deps && \
    npm run build

# Now set up the demo server
WORKDIR /app/server

# Copy package files first for better caching
COPY node-paymcp-server-demo/package.json .
COPY node-paymcp-server-demo/tsconfig.json .

# Update package.json to point to the correct paymcp-ts location
RUN sed -i 's|"paymcp": "file:../paymcp-ts"|"paymcp": "file:/app/paymcp-ts"|' package.json

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY node-paymcp-server-demo/src ./src

# Copy providers.json if it exists
COPY node-paymcp-server-demo/providers.json* ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 5004

# Start the server
CMD ["npm", "start"]