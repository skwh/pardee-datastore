import { assert } from 'chai';
import "mocha";

import {
  Query,
  QueryFactory
} from "../../db/query";

describe('make_select', () => {
  it('should convert an empty query into a star', () => {
    const query: Query = {};

    const expected_value = '*';
    const actual_value = QueryFactory.make_select(query);

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
    const actual_value = QueryFactory.make_select(query);

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
    const actual_value = QueryFactory.make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have each value in special', () => {
    const query = {
      special: [ 'value1', 'value2' ]
    };

    const expected_value = 'value1,value2';
    const actual_value = QueryFactory.make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should have each value in range vals, when specified', () => {
    const query = {
      range: {
        values: [ 'val1', 'val2' ]
      }
    };

    const expected_value = 'val1,val2';
    const actual_value = QueryFactory.make_select(query);

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
    const actual_value = QueryFactory.make_select(query);

    assert.equal(actual_value, expected_value);
  });

  it('should include p and q if the query is dyadic', () => {
    const query = {
      dyad: {
        p: {
          key: "test"
        },
        q: {
          cokey: "test2"
        }
      }
    };
    
    const expected_value = "test,test2"
    const actual_value = QueryFactory.make_select(query);

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
    const actual_value = QueryFactory.make_select(query);

    assert.equal(actual_value, expected_value);
  });
});

describe('make_where', () => {
  const query_builder = new QueryFactory('test', 'monadic', {});

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
    const actual_value = query_builder.make_where(query);

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
    const actual_value = query_builder.make_where(query);

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
    const actual_value = query_builder.make_where(query);

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
    const actual_value = query_builder.make_where(query);

    assert.equal(actual_value, expected_value);
  });

  it('should return true if the domain is missing', () => {
    const query: Query = {};

    const expected_value = 'true';
    const actual_value = query_builder.make_where(query);

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
    const actual_value = query_builder.make_where(query);
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
    const actual_value = query_builder.make_where(query);
    assert.equal(actual_value, expected_value);
  });

  it('should join tests with AND if the type is dyadic', () => {
    const dyadic_builder = new QueryFactory('test', 'dyadic', {});

    const query = {
      dyad: {
        p: {
          key: "Key1",
          values: ["Val1"]
        },
        q: {
          cokey: "Key2",
          values: ["Val2"]
        }
      }
    };

    const expected_value = "(Key1='Val1') AND (Key2='Val2')";
    const actual_value = dyadic_builder.make_where(query);

    assert.equal(actual_value, expected_value);
  });
});

describe('query_to_sql', () => {
  it('should create a correct sql statement from a complex query', () => {
    const query_builder = new QueryFactory('example_table_name', 'monadic', {
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
    });

    const expected_value = `SELECT DISTINCT Key1,Special1,Special2,n1,n2,n3 FROM example_table_name WHERE Key1='Val1' OR Key1='Val2' ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  });

  it('should handle an empty query', () => {
    const query_builder = new QueryFactory('example_table_name', 'monadic', {});

    const expected_value = `SELECT DISTINCT * FROM example_table_name WHERE true ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  });

  it('should handle a query without a domain', () => {
    const query_builder = new QueryFactory('example_table_name', 'monadic', {
      range: {
        values: ["Val1"]
      }
    });

    const expected_value = `SELECT DISTINCT Val1 FROM example_table_name WHERE true ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  });

  it('should handle a dyadic query', () => {
    const query_builder = new QueryFactory('example_table_name', 'dyadic', {
      dyad: {
        p: {
          key: "Key1",
          values: ["Val1", "Val2"]
        },
        q: {
          cokey: "Cokey1",
          values: ["Val3", "Val4"]
        }
      },
      range: {
        values: ["Range1", "Range2"]
      }
    });

    const expected_value = `SELECT DISTINCT Key1,Cokey1,Range1,Range2 FROM example_table_name WHERE (Key1='Val1' OR Key1='Val2') AND (Cokey1='Val3' OR Cokey1='Val4') ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  });

  it('should handle a dyadic query with one value in the domain missing', () => {
    const query_builder = new QueryFactory('example_table_name', 'dyadic', {
      dyad: {
        p: {
          key: "Key1"
        },
        q: {
          cokey: "Key2",
          values: ['Val1']
        }
      },
      range: {
        values: ['Range1']
      }
    });
    
    const expected_value = `SELECT DISTINCT Key1,Key2,Range1 FROM example_table_name WHERE (Key1=*) AND (Key2='Val1') ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  })

  it('should handle a dyadic query with both values in the domain missing', () => {
    const query_builder = new QueryFactory('example_table_name', 'dyadic', {
      dyad: {
        p: {
          key: "Key1"
        },
        q: {
          cokey: "Key2"
        }
      },
      range: {
        values: ["Range1"]
      }
    });

    const expected_value = `SELECT DISTINCT Key1,Key2,Range1 FROM example_table_name WHERE true ;`;
    const actual_value = query_builder.query_to_sql();

    assert.equal(actual_value, expected_value);
  })
});