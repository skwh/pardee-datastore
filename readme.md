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
- `ONLY_CLEAR`: with this flag set, the application only attempts to clear existing tables and table indexes, then quits. 
- `NO_SERVE`: the application loads data to the database, outputs its application config object, and quits, without starting a web server. 
- `CLEAR_CACHE`: the application clears its settings cache before attempting to load settings.

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
  - PGHOST=...(etc)
```

### Server-Assisted Client Side Caching with Redis

When running an application which makes heavy use of the DataStore's HTTP endpoints, it may be worthwhile to cache the results of some requests. The datastore's http server can integrate middleware which performs this server-assisted caching. In order to use this feature, you must:

1. Run an instance of a Redis store alongside the DataStore
2. Provide connection details to the application through these environment variables: `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASS`. All of these variables must be specified in order for the middleware caching to be enabled. `REDIS_TTL` may also be specified, the default value is `1000`. 

It is recommended that this be done through `docker-compose`:

```YAML
services:
  ...
  redis:
    image: redis:6-alpine
    ports:
      - "6379"
```

Then, for the environment variables under the DataStore service:

```YAML
environment:
  ...
  REDIS_HOST=redis
  REDIS_PORT=6379
  REDIS_PASS=password
```

The value `'redis'` works for the hostname because `docker-compose` automatically associates service names with container networks. See [Docker: Networking in Compose](https://docs.docker.com/compose/networking/) for more details about that.

You can also use the following command to run a temporary Redis instance through docker, replacing the port and password as necessary:

> `docker run -p "6379:6379" redis:6-alpine redis-server --requirepass password`

Here, the variables passed to the DataStore application would be `REDIS_HOST=localhost`, `REDIS_PORT=6379`, and `REDIS_PASS=password`, as above.

## Data Model

The application takes in data from csv files. In order to make this data useful over an HTTP API, each column must be classified in order to determine how to make a query on the data.

The application supports both monadic and dyadic datasets. Briefly, a monadic dataset is one where a measurement is taken against one unique identifier. For example, in a dataset of people's ages, each age is tied to a unique identifer, namely a person. In the dataset this would be their name.

A dyadic dataset is one where each measurement is taken against two unique identifiers as a pair. In some datasets the order of the pair matters.

In order to support both kinds of datasets, the administrator must classify the different columns for the application. 

Any given table (in a csv file) can have different types of columns:
1. **Key**: a key column is a column containing values that an end user might want to search against. The value in this column can act as a "primary key" in the sense of databases.
2. **Cokey**: a cokey column is a column containing the same values as a key column, but is used for dyadic datasets, where a pair of domain values form a unique entry in the data.
3. **Range**: a range column is a column containing a value associated with a key measured over a specific range. For timeseries data, different columns corresponding to different points in time would be represented as range columns.
4. **Anchor**: a column which contains the same value for every row in the dataset. These columns are not exposed via api.
5. **Special**: a special column is any column which does not fit the definitions of any other type of column, above.

The program then generates endpoints which allow for an end user or another application to determine the shape of the data and query against it. Querying is discussed in more detail below. 

The dataseries can be organized into a structure to provide some degree of classification and to recognize natural groupings of measurements or data sets. The DataStore provides two ways of classifying data: `groups` and `categories`.

In the settings file, discussed below, all dataseries must belong to a `group`. Every dataseries in a `group` shares the same `key` values (and `cokey`, if applicable). This way you can query multiple data series with the same `key` values. If none of your data series share `key` values, that's okay, you can put them all in separate groups. Just make the group names the same as the series names, and you'll have to pass it twice to the api (see below, "The Generated API Outline").

All dataseries may also belong to a `category`. If any dataseries does not belong to a category, no categories will be considered. If categories are avaliable, the application will store which groups the dataseries belong to as a child of their entry in the list of categories. 

There are some reserved keywords, after which `groups` and `categories` cannot be named. These are:
* `values`
* `all`

## Settings.yml

The `settings.yml` file is a way for an administrator to provide details to the application about the data being input. This file is required for proper functioning of the application. There are several different sections which can be used to configure the application and specify what data should be loaded.

These sections live at the top (the "root") of the YAML file; there should not be any spacing between the name of the section and the beginning of the line. 

### Groups Format

The `groups` section is a list of objects.
Each object corresponds to a group of series of data, each of which is represented in the `dataseries` attribute.

Each `group` should have at least a name and a list of the dataseries which it contains.

Each dataseries object **must** have the following attributes:
- `name`: The name of the data series.
- `type`: "monadic" or "dyadic"
- `location`: A path to the csv file which corresponds with this data series.

It is recommended that the data files be contained within the `config` folder, perhaps in a subfolder called `data`. The subfolders can be organized however you want, as long as the `location` attributes point to those files.

Each dataseries object **may** have the following attributes:
- `category`: Group dataseries together by providing them with the same category. Case sensitive!
- `slug`: A machine-friendly way of referring to the data series. If not provided, this is generated from the data series' name. 
- `metadata`: Any other information about the dataseries that you might want to expose over the HTTP API via `/info` (see "Generated API Outline" below).

#### Examples:
```YML
group:
  name: Church Group
  dataseries:
  - name: Church Group Birth Years
    location: ./data/church_group.csv
    type: monadic
    category: People
    slug: ChurchGroup-BY
    metadata:
      units: number of people
      author: Shelly Sanderson
```

If the example data series above did not have the `slug` attribute, the generated "slug" (machine-friendly label) would be `church-group-birth-years`. 

### Columns Format

The `columns` section is a list of objects. Each object corresponds to a column in the data file. The object provides a way for the administrator to tell the application how to treat the data.

**This section is required.**

Each column object must have the following attributes:
- `name`: The name of the column
- `type`: The datatype for values contained in that column. Possible values are `string` and `number`. 
- `label`: A label which helps the application understand how the data is structured. Possible values are `key`, `cokey`, `range`, `anchor`, and `special`. This is discussed above in **Data Model**.

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
  label: cokey

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

### Template format

If there are many groups and hundreds or thousands of possible data sets, the application can be configured to load the required information for each group and dataset. This is where the `template` section comes in.

A secondary csv file should be created with the relevant information on all of the required datasets, including their groups. 

**This section cannot be used at the same time as the `groups` section. One or the other.**

The `template` section requires a `path` be provided to this secondary csv file. It then needs a list of the column names present in the csv file. The administrator can use these column names like variables, filling in any aspect of a dataset with the value from any given column. The application will then read the secondary file and perform this replacement, registering each dataset as it is created.

The last required aspect of the `template` section is a `dataseries` entry, where each value may use a column name as a variable in "handlebars" syntax. If the name of a column is "Variable", then the handlebars syntax would be "{Variable}". This tells the application what to replace with the corresponding value in the secondary file table. Each handlebars entry in the `dataseries` object must be surrounded with double quotes ("). These entries can contain a mix of handlebars variables and hardcoded text, as in the `location` field in the example below. 

#### An example:

```YAML
template:
  path: ./data/DataInfo.csv 
  columns:
    - FirstName
    - LastName
    - UserId
    - Group
  dataseries:
    name: "{FirstName} {LastName}"
    group: "{Group}"
    location: "./data/{UserId}.csv"
```

### Categories

Dataseries can further be grouped into Categories, which are a separate way of
grouping from "groups." Dataseries can be assigned a category through the yaml
specification via the "category" keyword. The same applies for the template
section. If categories are specified in the settings, they will be reflected in the API.

### Full Example

An example `settings.yml.sample` file can be found in the `config/sample` folder of this repository. 

An example which uses the `template` format is avaliable as `settings-template.yml.sample`. 

## The Generated API Outline

Using the metadata from the settings file, and data gathered from the files themselves, the application generates an HTTP API for the different column labels and data series.

There are two categories of endpoints: endpoints to determine what columns are avaliable for query, or "shape endpoints," and endpoints to query datasets, or "query" endpoints.

### Shape Endpoints

The shape endpoints are as follows:
- `GET /keys`: Returns all column names labeled "key"
- `GET /groups/all`: Returns a JSON representation of the group structure. See below for the structure.
- `GET /groups/values`: Returns all the names of the groups.
- `GET /groups/:group/key/:key/values`: Returns all the values in the column labeled `:key` (url parameter variable)
- `GET /groups/:group/cokey/:cokey/values`: Returns all the cokey values in the column labeled `:key` (dyadic series only)
- `GET /range/values`: Returns all the columns labeled "range"
- `GET /special/values`: Returns all the columns labeled "special"
- `GET /groups/:group/dataseries/:series/info`: Returns metadata about the dataseries, provided by the administrator
- `GET /groups/:group/dataseries/values`: Returns the names of all avaliable data series, as specified in the `settings.yml` file. 
- `GET /categories/all`: Returns a JSON representation of the category structure. See below for the structure.
- `GET /categories/values`: Returns the different categories which data is sorted into
- `GET /categories/:category/dataseries`: Returns the dataseries which belong to a given category

#### Response

All shape endpoints follow a similar response pattern. A majority of the values returned from a shape endpoint are the names of a column, and some column names may have been altered to be machine friendly. 

So the response pattern is as follows:

```Javascript
{shape_category} : {
  original: string,
  alias: string
}[]
```

Where `shape_category` is one of `range`, `special`, `key`, `cokey`, `anchor`, `datasets`, `groups`, or `values`. The "original" represents how the column was named, as specified by the administrator. The "alias" is the machine-readable version of the column name. If the name was not altered, then the two fields are the same.

### All Endpoints

The groups router and the categories router both have endpoints which return a JSON representation of the structure of the data. This is to enable few-request transactions with the server so that client applications can show a rough structure of the data to a client without having to perform separate queries for each group or each category.

The structure of the response for each endpoint is as follows:

#### Groups `/all` Response

```Javascript
groups: {
  name: string;
  dataseries: string[];
}[];
```

#### Categories `/all` Response

```Javascript
categories: {
  name: string;
  series: {
    name: string;
    groups: string[];
  }[];
}[];
```

### Query Endpoints

Query endpoints are used to examine the data itself.
- `GET /groups/:group/dataseries/:series`: Selects all values from the series table and returns them as CSV or JSON. 
- `POST /groups/:group/dataseries/:series/query`: Perform a query against the data series called `:series` (url parameter variable). See the next section for how to perform a query.

In order to recieve CSV or JSON formatting, you must send the correct `Accepts` header with your request. For csv, use the MIME type `text/csv`. JSON is the default, but can be specified with the MIME type "application/json". If you use a web browser with any of these query endpoints, you are likely to recieve the CSV format, since most web browsers use the `Accepts: text/*` header. 

### The Query Format

When performing a query, a JSON object body must be sent to the query endpoint. This JSON object must have the following format:
```Javascript
{
  "domain"?: {
    "key": string,
    "values"?: string[]
  }[],
  "dyad"?: {
    "p": {
      "key": string,
      "values"?: string[]
    },
    "q": {
      "cokey": string,
      "values"?: string[]
    }
  }
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

#### Dyad

If the dataset being queried against is dyadic, then the `dyad` section of the query should be used, rather than the `domain` section. 

The two parameters in the `dyad` section are `p` and `q`, which refer to the two members of the dyad. The values in these objects should use the `key` or `cokey` entry to refer to a specific column, and then the `values[]` entries to refer to specific values in that column. 

A query using the following JSON query object:
```JSON
{
  "dyad": {
    "p": {
      "key": "PersonA",
      "values": ["Jeremy", "Mike", "Dale"]
    },
    "q": {
      "cokey": "PersonB",
      "values": ["Roger"]
    }
  }
}
```

would produce the following query on the dataseries table:

```SQL
SELECT PersonA, PersonB, ... FROM example_table_name WHERE (PersonA='Jeremy' OR PersonA='Mike' OR PersonA='Dale') AND (PersonB='Roger');
```

Notice that the `WHERE` clause in this query is different from when using the `domain` section, in order to correctly match against dyadic data. 

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

## Starting Up the DataStore

First of all, you should be using Docker. Use a `docker-compose` file to create
two services: the DataStore and the Postgres database. In the same folder as
your `docker-compose` file, create a `config` folder, which will hold
`settings.yml` and your data. In `docker-compose`, volume bind the config folder to a
volume at `/var/www/config`. Also provide the necessary environment variables
through the `environment` section of `docker-compose`.

**Make sure that the database container also has a volume binding to the config folder.**

If you have static files to be served, make sure they are also bound to a volume
in the DataStore container, one which matches the path specified in the
`SERVE_STATIC` environment variable.

Then use `docker-compose up` to start the application. Do port mapping in the
`docker-compose` as you need.

### Operational Output

The DataStore provides a log for activity once the container has been started. A
normal startup will show messages for series being loaded, database indicies
being created (or re-created), and messages for domain keys being loaded. If the
application is running properly, the last message of startup should be "Server
running."

The DataStore will then log any HTTP requests it recieves, including the IP of
the request, a response code, and the request path. 

# Planned or wishlist features

* GraphQL endpoint (would probably require significant restructuring of the data model in order to properly work alongside the `type-graphql` package)
* enable uncategorized dataseries via a category called "uncategorized"