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

# Build React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the server using serve with PORT environment variable
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
