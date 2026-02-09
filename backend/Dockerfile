# Use the 'bullseye' version of Node - it has better compatibility for C++ builds
FROM node:18-bullseye

# Install EVERY system dependency required for RobotJS and Screenshotting
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libxtst-dev \
    libpng-dev \
    libx11-dev \
    libxext-dev \
    libxi-dev \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better for caching)
COPY package*.json ./

# We use --build-from-source to ensure RobotJS matches the Linux environment
RUN npm install --build-from-source

COPY . .

# Set the port Render expects
EXPOSE 10000

# xvfb-run creates a 'fake' monitor so your screenshot code doesn't crash
CMD ["xvfb-run", "-a", "node", "index.js"]
