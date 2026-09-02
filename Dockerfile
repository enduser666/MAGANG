FROM node:22-alpine

WORKDIR /app

# Install dependencies first (for better cache utilization)
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
