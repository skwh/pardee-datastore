#!/bin/bash

npm run build

docker build . -t derbyevan/pardee-datastore:latest
docker push derbyevan/pardee-datastore:latest