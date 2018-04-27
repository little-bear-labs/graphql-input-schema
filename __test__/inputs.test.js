const fs = require('fs');
const { makeExecutableSchema } = require('../src/transformer');

describe('inputs', () => {
  it('should do things', () => {
    class User {}
    const raw = fs.readFileSync(__dirname + '/graphql/inputs.graphql', 'utf8');
    const schema = makeExecutableSchema({
      typeDefs: raw,
      classes: {
        User,
      },
    });
  });
});
