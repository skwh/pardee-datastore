// import { assert } from 'chai';
// import 'mocha';

// import {
//   handlebars_replace,
//   handlebars_replace_object,
//   verify_template_format
// } from '../../settings/template';

// describe('handlebars_replace', () => {
//   it('should replace at least one handlebar value in a string', () => {
//     const vars = {
//       'Var1': 'Val1'
//     };
//     const template = '{Var1}';

//     const expected_value = 'Val1';
//     const actual_value = handlebars_replace(vars, template);

//     assert.equal(actual_value, expected_value);
//   });

//   it('should replace multiple handlebar values in a string', () => {
//     const vars = {
//       'Var1': 'Val1',
//       'Var2': 'Val2'
//     };
//     const template = '{Var1} {Var2}';

//     const expected_value = 'Val1 Val2';
//     const actual_value = handlebars_replace(vars, template);

//     assert.equal(actual_value, expected_value);
//   });

//   it('should do nothing if there are no handlebar values in a string', () => {
//     const vars = {};
//     const template = 'Hello World!';

//     const actual_value = handlebars_replace(vars, template);
    
//     assert.equal(actual_value, template);

//   });

//   it('should throw an error if an undefined handlebar value is encountered', () => {
//     const vars = {
//       'Var1': 'Val1'
//     };

//     const template = '{Var1} {Var2}';

//     assert.throws(() => handlebars_replace(vars, template));
//   });
// });

// describe('handlebars_replace_object', () => {
//   it('should recursively perform replacement in an object', () => {
//     const vars = {
//       'Var1': 'Val1'
//     };
//     const template: any = {
//       'prop': '{Var1}',
//       'objprop': {
//         'prop2': '{Var1}'
//       }
//     };

//     const expected_value = {
//       'prop': 'Val1',
//       'objprop': {
//         'prop2': 'Val1'
//       }
//     };
//     const actual_value = handlebars_replace_object(vars, template);

//     assert.deepEqual(actual_value, expected_value);
//   });

//   it('should have a base case', () => {
//     const vars = {
//       'Var1': 'Val1'
//     };

//     const template = {
//       'prop': '{Var1}'
//     };
//     const expected_value = {
//       'prop': 'Val1'
//     };
//     const actual_value = handlebars_replace_object(vars, template);
//     assert.deepEqual(actual_value, expected_value);
//   });
// });

// describe('verify_template_format', () => {
//   it('should verify that an unknown object has all of the given properties', () => {
//     const yaml = {
//       'path': 'somevalue',
//       'columns': 'somevalue',
//       'dataseries': 'somevalue'
//     };
    
//     const expected_value = true;
//     const actual_value = verify_template_format(yaml);

//     assert.equal(actual_value, expected_value);
//   });

//   it('should correcty detect that an unknown object does not have all of the given properies', () => {
//     const yaml = {};

//     const expected_value = false;
//     const actual_value = verify_template_format(yaml);

//     assert.equal(actual_value, expected_value);
//   });
// });

// describe('generate_series_from_template', () => {
//   it('should have tests written for it', () => assert.fail());
// });