# Pardee DataStore guide

This application is designed to take structured data in the form of csv files and expose it over an http api.

## Running the DataStore

The application requires certain files to be in certain places to run:
- config folder, containing:
  - settings.yml (see below)
  - (any path structure)
    - csv files (data)

When the application is run (via docker), it must be run with a mounted volume at /var/www/config representing this config folder.

The application also has the following options from the command line:
1. optional path to the config folder (default '../config')
2. folder for the server to serve static assets from (none by default)
3. CORS options for the api endpoints; namely the CORS trusted origin ('*' by default)

## Settings.yml

