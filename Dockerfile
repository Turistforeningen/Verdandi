# The full version of the node docker image contains ImageMagick
FROM node:12.16.1

# Create a directory where the application code should live and set it as the
# current working directory
RUN mkdir -p /app
WORKDIR /app

# Add berglas
COPY --from=gcr.io/berglas/berglas:latest /bin/berglas /bin/berglas

# Copy applicaiton files
COPY build/. /app/

ENV NODE_ENV=production
CMD exec /bin/berglas exec -- node /app/src/server.js
