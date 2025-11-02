# Use a multi-stage build to create a small, secure final image.

# --- Build Stage ---
# Use a full Node.js image that includes all necessary build tools.
FROM node:20 as builder

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies. This layer is only rebuilt if package.json changes.
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project into JavaScript, but skip tests during the build
RUN npm run build:notest

# --- Final Stage ---
# Use a slim Node.js image for a much smaller and more secure final image.
FROM node:20-slim

WORKDIR /app

# Copy only the compiled code and production dependencies from the builder stage.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 3000

# The command to start the application in production mode
CMD ["npm", "start"]