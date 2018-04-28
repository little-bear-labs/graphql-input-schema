const assert = require('assert');
const { Source, parse: parseGQL } = require('graphql/language');
const processInputs = require('./processInputs');
const inputValidators = require('./inputValidators');
const { extractName, resolveType } = require('./utils');

function buildValidateArgHandler(nullable, validator, classConstructor) {
  return value => {
    if (nullable && value === null) return value;
    const validatedValue = validator(value);
    if (!classConstructor) {
      return validatedValue;
    }
    return new classConstructor(validatedValue);
  };
}

function buildValidateHandler(input, typeMeta) {
  if (!input || !input.validator) {
    return value => value;
  }

  return buildValidateArgHandler(
    typeMeta.nullable,
    input.validator,
    input.classConstructor,
  );
}

function fieldToResolver(typeName, resolvers, field, { inputTypes }) {
  const resolverType = resolvers[typeName];
  if (!resolverType) {
    throw new Error(`Resolvers are missing handlers for type: ${typeName}`);
  }

  const fieldName = extractName(field);
  const resolver = resolverType[fieldName];
  if (!resolver && field.arguments.length) {
    throw new Error(
      `Resolver type ${typeName}.${extractName(field)} is unhandled`,
    );
  }

  // convert arguments into argument preprocessors
  const argHandlers = field.arguments.reduce((sum, arg) => {
    const name = extractName(arg);

    const typeMeta = resolveType(arg.type);
    const input = inputTypes[typeMeta.type];

    return {
      ...sum,
      [name]: buildValidateHandler(input, typeMeta),
    };
  }, {});

  return (root, args, ctx, info) => {
    const parsedArgs = Object.entries(args).reduce((sum, [key, value]) => {
      assert(
        argHandlers[key],
        'missing argument handler this should never happen!',
      );
      sum[key] = argHandlers[key](value);
      return sum;
    }, {});

    return resolver(root, parsedArgs, ctx, info);
  };
}

function makeExecutableSchema({
  typeDefs,
  resolvers = {},
  classes = {},
  validators = {},
  ...otherOptions
}) {
  // XXX: yes we do end up parsing the source twice :/
  const source = new Source(typeDefs);

  const [doc, inputTypes] = processInputs(source, parseGQL(source), {
    classes,
    validators: {
      ...validators,
      ...inputValidators,
    },
  });

  const resolverConfig = {
    inputTypes,
  };

  // build the resolvers
  const topLevelResolvers = doc.definitions
    .filter(({ kind }) => kind === 'ObjectTypeDefinition')
    .map(node => {
      const name = extractName(node);
      const fieldResolvers = node.fields.reduce(
        (sum, field) => ({
          [extractName(field)]: fieldToResolver(
            name,
            resolvers,
            field,
            resolverConfig,
          ),
          ...sum,
        }),
        {},
      );
      return [name, fieldResolvers];
    })
    .reduce(
      (sum, [name, fieldResolvers]) => ({
        ...sum,
        [name]: fieldResolvers,
      }),
      {},
    );

  return require('graphql-tools').makeExecutableSchema({
    typeDefs: doc,
    resolvers: topLevelResolvers,
    ...otherOptions,
  });
}

module.exports = {
  makeExecutableSchema,
};
