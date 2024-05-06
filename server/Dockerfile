# Use an official Node.js image.
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files.
COPY package*.json ./

# Install dependencies.
RUN npm install --production

# Copy the rest of the application files.
COPY dist/ dist/

# Set the environment variable.
ENV NODE_ENV=production

# Expose the port that the app will use.
EXPOSE 3000

# Run the application.
CMD ["node", "dist/index.js"]
