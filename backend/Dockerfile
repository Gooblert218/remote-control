# Use a Node image that includes build tools
FROM node:18-buster

# Install the system libraries RobotJS and Sharp need
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libxtst-dev \
    libpng-dev \
    libx11-dev \
    libxext-dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
