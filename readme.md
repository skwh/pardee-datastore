# Pardee DataStore guide

This application is designed to take structured data in the form of csv files, a settings file, and expose the data over an http api. The csv files must all have the same columns.

In this document, a "user" is someone who visits the application in its final state. An "administrator" is the person setting up the application.

## Running the DataStore

The application requires certain files to be in certain places to run:
- `/config/`:
  - `settings.yml` (see below)
  - (any path structure)
    - csv files (data, see below)

When the application is run (which should occur via docker), it must be run with a mounted volume at `/var/www/config` representing this config folder.

The application also has the following environment variables avaliable:
- `CONFIG_PATH`: optional path to the config folder (default `config`)
- `SERVE_STATIC`: folder for the server to serve static assets from (none by default)
- `CORS_ORIGIN`: the CORS trusted origin (`*` by default)
- `CLEAR_OLD`: should the application attempt to drop old tables in the db associated with the application? usually used for development (`false` by default)

The application is designed to be run alongside a Postgres database. Provide the application the parameters for the database with the following environment variables:
- `PGUSER`
- `PGDATABASE`
- `PGHOST`
- `PGPORT`
- `PGPASSWORD`

These environment variables should be specified through a `docker-compose.yml` file or equivalent. For example:

```YAML
environment:
  - CONFIG_PATH=settings/config
  - SERVE_STATIC=view/dist
  - CORS_ORIGIN=example.com
  - PGUSER=postgres
  - PGHOST= ...(etc)
```

## Data Model

The application takes in data from csv files. In order to make this data useful over an HTTP API, each column must be classified in order to determine how to make a query on the data.

Any given table (in a csv file) can have different types of columns:
1. **Key**: a key column is a column containing values that an end user might want to search against. The value in this column can act as a "primary key" in the sense of databases.
2. **Range**: a range column is a column containing a value associated with a key measured over a specific range. For timeseries data, different columns corresponding to different points in time would be represented as range columns.
3. **Special**: a special column is any column which does not fit the definitions of any other type of column, above.

The program then generates endpoints which allow for an end user or another application to determine the shape of the data and query against it. Querying is discussed in more detail below. 

## Settings.yml

The `settings.yml` file is a way for an administrator to provide details to the application about the data being input. This file is required for proper functioning of the application. The two top-level headings in the settings file are `columns` and `dataseries`. 

### Dataseries Format

The `dataseries` section is a list of objects. Each object corresponds to a single series of data, also called a data set, represented by a single csv file. 

Each dataseries object must have the following attributes:
- `name`: The name of the data series.
- `location`: A path to the csv file which corresponds with this data series.

It is recommended that the data files be contained within the `config` folder, perhaps in a subfolder called `data`. The subfolders can be organized however you want, as long as the `location` attributes point to those files.

Each dataseries object may have the following attributes:
- `category`: Group dataseries together by providing them with the same category. Case sensitive!
- `units`: Units for the measurements in this data series.
- `slug`: A machine-friendly way of referring to the data series. If not provided, this is generated from the data series' name. 

#### Examples:
```YML
dataseries:
- name: Church Group Birth Years
  location: ./data/church_group.csv
  category: People
  units: number of people
  slug: ChurchGroup-BY
```

If the example data series above did not have the `slug` attribute, the generated "slug" (machine-friendly label) would be `church-group-birth-years`. 

### Columns Format

The `columns` section is a list of objects. Each object corresponds to a column in the data file. The object provides a way for the administrator to tell the application how to treat the data.

Each column object must have the following attributes:
- `name`: The name of the column
- `type`: The datatype for values contained in that column. Possible values are `string` and `number`. 
- `label`: One of three labels, which helps the application understand how the data is structured. Possible values are `key`, `range`, and `special`.

Each column object may have the following attributes:
- `modifier`: A flag that the program should parse this column differently. Possible values currently only include `many`.

#### Examples:
```YML
columns:
- name: FirstName
  type: string
  label: key

- name: UserID
  type: number
  label: key

- name: EmailAddress
  type: string
  label: special

- name: NumberOfPets
  type: number
  label: special

- name: 10..100
  type: number
  label: range
  modifier: many
```

#### The `many` format

If a column has the `modifier:many` attribute, then the application will process the name of the column differently: it will expect a range of values as the column's name, and it will generate a column for every value in that range with that value as its name.

A column with the `many` modifier should have its name in the following format: `a..b` where *a*,*b* are integers, and *a* < *b*. The application will generate columns for every *k* such that *a* <= *k* <= *b*.

The `many` modifier is primarliy used to generate column entires for multiple years. If a column name is only a number (as should be the case in a many modifier), it will be aliased to the string `n{number}`. This is because Postgres does not support columns which start with numeric characters.  

### Full Example

An example `settings.yml` file can be found in the `config/sample` folder of this repository. 

## The Generated API Outline

Using the metadata from the settings file, and data gathered from the files themselves, the application generates an HTTP API for the different column labels and data series.

There are two categories of endpoints: endpoints to determine what columns are avaliable for query, or "shape endpoints," and endpoints to query datasets, or "query" endpoints.

### Shape Endpoints

The shape endpoints are as follows:
- `GET /keys`: Returns all column names labeled "key"
- `GET /key/:key/values`: Returns all the values in the column labeled `:key` (url parameter variable)
- `GET /range/values`: Returns all the columns labeled "range"
- `GET /special/values`: Returns all the columns labeled "special"

#### Response

All shape endpoints follow a similar response pattern. Any value returned from a shape endpoint is the name of a column, and some column names may have been altered to be machine friendly. 

So the response pattern is as follows:

```Javascript
{shape_category} : {
  original: string,
  alias: string
}[]
```

Where `shape_category` is one of `range`, `special`, `key`, or `values`. The "original" represents how the column was named, as specified by the administrator. The "alias" is the machine-readable version of the column name. If the name was not altered, then the two fields are the same.

### Query Endpoints

Query endpoints are used to examine the data itself.
- `GET /dataseries/values`: Returns the names of all avaliable data series, as specified in the `settings.yml` file. 
- `POST /dataseries/:series/query`: Perform a query against the data series called `:series` (url parameter variable). See the next section for how to perform a query.

### The Query Format

When performing a query, a JSON object body must be sent to the query endpoint. This JSON object must have the following format:
```Javascript
{
  "domain"?: {
    "key": string,
    "values"?: string[]
  }[],
  "range"?: {
    "from"?: string,
    "to"?: string,
    "values"?: string[]
  },
  "special"?: string[]
}
```

Each parameter marked with a `?` is optional. You should combine the different options to get the most out of your queries. 

#### Domain

For "domain", provide a list of domain columns, and any of their values to filter upon. For example, a query, using the columns specified above:
```JSON
{
  "domain": [
    {
      "key": "FirstName",
      "values": [
        "Rebecca",
        "George"
      ]
    }
  ]
}
```

This query would select all rows with the first name "Rebecca" or "George" and would select all other special and range columns for those rows. This is the equivalent of the SQL expression:
```SQL
SELECT * FROM table_name WHERE firstname="Rebecca" OR firstname="George";
```

#### Range

For "range", you can either provide specific values (columns) of the range to return data for, or you can provide a range of values.

For example, these two are equivalent:
```JSON
{
  "range": {
    "values": [ "12", "13", "14", "15" ]
  }
}
```
And
```JSON
{
  "range": {
    "from": 12,
    "to": 15
  }
}
```

The equivalent SQL expression is:
```SQL
SELECT n12, n13, n14, n15 FROM table_name;
```

#### Special

This option is more self-explanatory. Any value in `special` is the name of a column labeled special in the `settings.yml` file.

```JSON
{
  "special": [
    "EmailAddress",
    "NumberOfPets"
  ]
}
```

The equivalent SQL expression is:
```SQL
SELECT EmailAddress, NumberOfPets FROM table_name;
```

## Serving Static Assets

Since this application is a web server, why not serve static assets alongside it, such as a Javascript Single Page App? 

Provide the environment variable `SERVE_STATIC` with a path to static files to be served. This path must also be mounted as a volume to the Docker container!

The application will mount them at the root `/`. Make sure their names don't conflict with the endpoints listed above!

For example, as an environment variable:
```
SERVE_STATIC=view/dist
```
And in `docker-compose.yml`:
```YAML
volumes:
  - type: bind
    source: ./dist/
    target: /var/www/view/dist
```