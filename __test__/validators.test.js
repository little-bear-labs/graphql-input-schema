const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');
const { SIMPLE_SINGLE } = require('../src/inputValidators');
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
    { method: 'isAlpha', valid: 'foo', invalid: '1222' },
    { method: 'isAlphanumeric', valid: 'foo', invalid: '1222--^^^^###' },
    {
      method: 'isJSON',
      valid: JSON.stringify({ foo: 1 }),
      invalid: '1222--^^^^###',
    },
  ].forEach(({ method, valid, invalid }) => {
    describe(method, () => {
      const schema = makeExecutableSchema({
        typeDefs: gql`
            input Input {
              value: String! @${method}
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
        hasError(result, method);
      });

      test('valid', async () => {
        expect(SIMPLE_SINGLE).toContain(method);
        const result = await execute(schema, {
          input: { value: valid },
        });
        expect(result.errors).not.toBeTruthy();
      });
    });
  });
});
