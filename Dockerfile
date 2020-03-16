FROM node:lts

WORKDIR /var/www

COPY package*.json ./

RUN ["npm", "ci"]

COPY . .

EXPOSE 8000
CMD ["npm", "run", "serve"]

