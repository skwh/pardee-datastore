#!/bin/bash

npm run build

docker build . -t pardee-datastore:latest