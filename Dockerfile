# Use Node.js 20 (required for Firebase)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create server directory if it doesn't exist (for Docker builds)
RUN mkdir -p server

# Build React app
RUN npm run build

# Install express for the server
RUN npm install express

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the Express server
CMD ["node", "server.js"]
