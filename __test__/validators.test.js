const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');

const gql = input => {
  return input.join('');
};

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

  const hasError = ({ errors: [obj] }, message) => {
    expect(obj.message).toMatch(message);
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
});
