# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
WORKDIR /app/server
CMD ["npm", "start"]
