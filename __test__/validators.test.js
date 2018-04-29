const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');
const allValidators = require('../src/inputValidators');
// for syntax highlighting...
const { stripIndent: gql } = require('common-tags');

describe('validators', () => {
  const resolvers = {
    Mutation: {
      test: () => {},
    },
    Query: {},
  };
  const executeArray = (schema, variables) => {
    return graphql({
      schema,
      source: `
        mutation test($input: [Input]!) {
          test(input: $input)
        }
      `,
      variableValues: variables,
    });
  };
  const execute = (schema, variables) => {
    return graphql({
      schema,
      source: `
        mutation test($input: Input!) {
          test(input: $input)
        }
      `,
      variableValues: variables,
    });
  };

  const hasError = (result, message) => {
    expect(result.errors).toBeTruthy();
    expect(result.errors[0].message).toMatch(message);
  };

  describe('isIn', () => {
    const schema = makeExecutableSchema({
      typeDefs: gql`
        input Input {
          value: [String]! @ValidateIsIn(in: ["one", "two", "three"])
        }

        type Mutation {
          test(input: [Input]!): ID
        }

        type Query {
          test: String
        }
      `,
      resolvers,
    });
    test('valid', async () => {
      const result = await executeArray(schema, {
        input: { value: ['one', 'two'] },
      });
      expect(result.errors).not.toBeTruthy();
    });

    test('invalid', async () => {
      const result = await executeArray(schema, {
        input: { value: ['three', 'four'] },
      });
      hasError(result, 'not in list one, two, three');
    });
  });
  describe('isNotIn', () => {
    const schema = makeExecutableSchema({
      typeDefs: gql`
        input Input {
          value: [String]! @ValidateIsNotIn(in: ["one", "two", "three"])
        }

        type Mutation {
          test(input: [Input]!): ID
        }

        type Query {
          test: String
        }
      `,
      resolvers,
    });
    test('invalid', async () => {
      const result = await executeArray(schema, {
        input: { value: ['one', 'two'] },
      });
      hasError(result, 'disallowed');
    });

    test('valid', async () => {
      const result = await executeArray(schema, {
        input: { value: ['four'] },
      });
      expect(result.errors).not.toBeTruthy();
    });
  });

  // some of the simple single values
  [
    { method: 'ValidateIsAlpha', valid: 'foo', invalid: '1222' },
    {
      method: 'ValidateIsAlphanumeric',
      valid: 'foo',
      invalid: '1222--^^^^###',
    },
    {
      method: 'ValidateIsJSON',
      valid: JSON.stringify({ foo: 1 }),
      invalid: '1222--^^^^###',
    },
    {
      method: 'ValidateLessThan',
      valid: 1,
      invalid: 200,
      args: 'number: 101',
      message: 'greater than 101',
    },
    {
      method: 'ValidateGreaterThan',
      valid: 200,
      invalid: 1,
      args: 'number: 101',
      message: 'less than 101',
    },
    {
      method: 'ValidateLength',
      valid: 'aa',
      invalid: 'aaaaaa',
      args: 'min: 2, max: 5',
      message: '2-5',
    },
    {
      method: 'ValidateByteLength',
      valid: 'aa',
      invalid: 'aaaaaa',
      args: 'min: 2, max: 5',
      message: '2-5',
    },
  ].forEach(({ method, valid, invalid, message, args }) => {
    describe(method, () => {
      const schema = makeExecutableSchema({
        typeDefs: gql`
            input Input {
              value: String! @${method}${args ? `(${args})` : ''}
            }

            type Mutation {
              test(input: Input!): ID
            }

            type Query {
              test: String
            }
          `,
        resolvers,
      });
      test('invalid', async () => {
        const result = await execute(schema, {
          input: { value: invalid },
        });
        hasError(result, message || method);
      });

      test('valid', async () => {
        expect(Object.keys(allValidators)).toContain(method);
        const result = await execute(schema, {
          input: { value: valid },
        });
        expect(result.errors).not.toBeTruthy();
      });
    });
  });
});
