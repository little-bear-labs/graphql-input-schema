const fs = require('fs');
const { makeExecutableSchema } = require('../src/transformer');
const { graphql } = require('graphql');
const deepMerge = require('lodash.merge');

describe('inputs', () => {
  const resolverFixtures = {
    User: {
      id(root) {
        return root;
      },
    },
    Query: {},
    Mutation: {
      createUsers: () => {},
      createUser: () => {},
      createUserForReal: () => null,
      createString: () => null,
    },
  };

  class User {
    constructor(obj) {
      Object.assign(this, obj);
    }
  }

  const classes = {
    User,
  };

  const loadSchema = (fixture, resolvers, fixtureClasses = classes) => {
    const raw = fs.readFileSync(
      __dirname + `/graphql/${fixture}.graphql`,
      'utf8',
    );

    return makeExecutableSchema({
      typeDefs: raw,
      resolvers,
      classes: fixtureClasses,
    });
  };

  it('should transform user and users into classes', async () => {
    let ranResolver = false;

    const resolvers = deepMerge({}, resolverFixtures, {
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
      },
    });

    const schema = loadSchema('inputs', resolvers);

    await graphql({
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

    expect(ranResolver).toBeTruthy();
  });

  it('should transform an array of users into classes', async () => {
    let ranResolver = false;

    const resolvers = deepMerge({}, resolverFixtures, {
      Mutation: {
        createUsers: (root, args) => {
          ranResolver = true;
          expect(Array.isArray(args.users)).toEqual(true);
          args.users.forEach(user => expect(user).toBeInstanceOf(User));
        },
      },
    });

    const schema = loadSchema('inputs', resolvers);

    const result = await graphql({
      schema,
      source: `
        mutation foo($users: [InputUser]!) {
          createUsers(users: $users) {
            id
          }
        }
      `,
      variableValues: {
        users: [
          {
            name: 'example',
            input: {
              someThing: 1,
            },
          },
        ],
      },
    });
    expect(ranResolver).toBeTruthy();
  });
});
