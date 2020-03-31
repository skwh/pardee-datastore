import { assert } from 'chai';
import "mocha";

import {
  Query,
  make_select,
  make_where,
  query_to_sql
} from "../../db/query";

describe('make_select', () => {
  it('should convert an empty query into a star', () => {
    const query: Query = {};

    const expected_value = '*';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should convert a query with only domain values into a modified star', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1", "Val2"]
        }
      ]
    };

    const expected_value = 'Key1,*';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have each key of the domain', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1", "Val2"]
        }
      ]
    };

    const expected_value = 'Key1,*';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have each value in special', () => {
    const query = {
      special: [ 'value1', 'value2' ]
    };

    const expected_value = 'value1,value2';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have each value in range vals, when specified', () => {
    const query = {
      range: {
        values: [ 'val1', 'val2' ]
      }
    };

    const expected_value = 'val1,val2';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have a spread of numeric range vals, when specified', () => {
    const query = {
      range: {
        from: '1',
        to: '4'
      }
    };

    const expected_value = 'n1,n2,n3,n4';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should return star if all value arrays are empty', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: []
        }
      ],
      range: {
        values: []
      },
      special: []
    };

    const expected_value = '*';
    const actual_value = make_select(query);

    assert.equal(actual_value, expected_value);
  });
});

describe('make_where', () => {
  it('should create an equality test between key and value in the domain', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1"]
        }
      ]
    };

    const expected_value = "Key1='Val1'";
    const actual_value = make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should create tests between a key and multiple values in the domain', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1", "Val2"]
        }
      ]
    };

    const expected_value = "Key1='Val1' OR Key1='Val2'";
    const actual_value = make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should join tests between different keys with OR', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1"]
        },
        {
          key: "Key2",
          values: ["Val2"]
        }
      ]
    };

    const expected_value = "Key1='Val1' OR Key2='Val2'";
    const actual_value = make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should correctly join a complicated query', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1", "Val2"]
        },
        {
          key: "Key2",
          values: ["Val3"]
        },
        {
          key: "Key3",
          values: ["Val4", "Val5", "Val6"]
        }
      ]
    };

    const expected_value = "Key1='Val1' OR Key1='Val2' OR Key2='Val3' OR Key3='Val4' OR Key3='Val5' OR Key3='Val6'";
    const actual_value = make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should return true if the domain is missing', () => {
    const query: Query = {};

    const expected_value = 'true';
    const actual_value = make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should return true if all of the values of the domain are empty', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: []
        },
        {
          key: "Key2",
          values: []
        }
      ]
    };

    const expected_value = 'true';
    const actual_value = make_where(query);
    assert.equal(actual_value, expected_value);
  });

  it('should not return true if only some of the values of the domain are empty', () => {
    const query = {
      domain: [
        {
          key: "Key1",
          values: []
        },
        {
          key: "Key2",
          values: ["Val2"]
        }
      ]
    };

    const expected_value = "Key2='Val2'";
    const actual_value = make_where(query);
    assert.equal(actual_value, expected_value);
  })
});

describe('query_to_sql', () => {
  it('should create a correct sql statement from a complex query', () => {
    const query: Query = {
      domain: [
        {
          key: "Key1",
          values: ["Val1", "Val2"]
        }
      ],
      range: {
        from: '1',
        to: '3'
      },
      special: ['Special1', 'Special2']
    };
    const table_name = 'example_table_name';

    const expected_value = `SELECT DISTINCT Key1,Special1,Special2,n1,n2,n3 FROM example_table_name WHERE Key1='Val1' OR Key1='Val2' ;`;
    const actual_value = query_to_sql(table_name, query);

    assert.equal(actual_value, expected_value);
  });

  it('should handle an empty query', () => {
    const query: Query = {};
    const table_name = "example_table_name";

    const expected_value = `SELECT DISTINCT * FROM example_table_name WHERE true ;`;
    const actual_value = query_to_sql(table_name, query);

    assert.equal(actual_value, expected_value);
  });

  it('should handle a query without a domain', () => {
    const query: Query = {
      range: {
        values: ["Val1"]
      }
    };
    const table_name = "example_table_name";

    const expected_value = `SELECT DISTINCT Val1 FROM example_table_name WHERE true ;`;
    const actual_value = query_to_sql(table_name, query);

    assert.equal(actual_value, expected_value);
  });
});