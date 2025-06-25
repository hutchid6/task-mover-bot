# Use an ARM-compatible Node image (for Raspberry Pi)
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy bot source
COPY . .

# Load .env file (or mount it at runtime)
ENV NODE_ENV=production

# Run the bot
CMD ["node", "app.js"]
