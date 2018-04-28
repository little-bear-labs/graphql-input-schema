const fs = require('fs');
const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');

describe('inputs', () => {
  it('should do things', async () => {
    class User {}

    const resolvers = {
      User: {},
      Query: {},
      Mutations: {
        createUser: (root, args, ctx) => {
          console.log(args, ctx);
        },
        createUserForReal: () => null,
        createString: () => null,
      },
    };

    const raw = fs.readFileSync(__dirname + '/graphql/inputs.graphql', 'utf8');
    const schema = makeExecutableSchema({
      typeDefs: raw,
      resolvers,
      classes: {
        User,
      },
    });

    const result = await graphql({
      schema,
      source: raw,
      requestString: `
        mutation foo(user: InputUser!) {
          createUser(user: user) {
            id
          }
        }
      `,
      variableValues: {
        user: {
          name: 'example',
          input: {
            someThing: 1,
          },
        },
      },
    });

    console.log(result);
  });
});
