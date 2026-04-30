FROM nginx:alpine

COPY . /usr/share/nginx/html

# Cache-bust site.css references with a content hash so each deploy
# invalidates the browser/CDN immutable cache automatically.
RUN HASH=$(md5sum /usr/share/nginx/html/site.css | cut -c1-12) && \
    echo "site.css cache-bust hash: ${HASH}" && \
    sed -i 's|href="site\.css"|href="site.css?v=PLACEHOLDER"|g' /usr/share/nginx/html/*.html && \
    sed -i "s|site\.css?v=[^\"]*|site.css?v=${HASH}|g" /usr/share/nginx/html/*.html && \
    chmod -R 755 /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
