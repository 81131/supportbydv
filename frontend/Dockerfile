# Stage 1: Build the React+Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install axios
RUN npm install lucide-react
RUN npm install react-easy-crop jspdf
# Copy the source code
COPY . .

# Accept the build argument and set it as an environment variable for Vite
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the application
RUN npm run build

# Stage 2: Serve the optimized static files using Nginx
FROM nginx:alpine

# Copy the custom Nginx configuration to handle React routing and the Backend Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for web traffic
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]