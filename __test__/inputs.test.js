const fs = require('fs');
const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');
const { printSchema } = require('graphql/utilities');

describe('inputs', () => {
  it('should do things', async () => {
    let ranResolver = false;
    class User {
      constructor(obj) {
        Object.assign(this, obj);
      }
    }

    const resolvers = {
      User: {
        id(root) {
          return root;
        },
      },
      Query: {},
      Mutation: {
        createUser: (root, args) => {
          ranResolver = true;
          expect(args.user).toBeInstanceOf(User);
          expect(args.user).toMatchObject({
            name: 'example',
            input: {
              someThing: 1,
            },
          });
          return args.user;
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
      source: `
        mutation foo($user: InputUser!) {
          createUser(user: $user) {
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
    expect(ranResolver).toBeTruthy();
  });
});
