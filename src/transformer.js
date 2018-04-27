const { Source, parse: parseGQL, getLocation } = require('graphql/language');
const constants = require('./constants');
const inputValidators = require('./inputValidators');

class GraphQLError extends Error {
  constructor(source, node, str) {
    const start = getLocation(source, node.loc.start);
    const end = getLocation(source, node.loc.end);
    super(
      `Error at line: ${start.line}:${start.column}-${end.line}:${
        end.column
      }\n${str}`,
    );
  }
}

function extractValueType(source, node, argKind) {
  const { kind, value } = node.value;
  if (kind !== argKind) {
    throw new GraphQLError(
      source,
      node.value,
      `Expected argument to be type of ${argKind} was ${kind}`,
    );
  }
  return value;
}

function extractName(node) {
  return node && node.name && node.name.value;
}

function extractDirectiveArg(source, directive, name, type) {
  const found =
    directive.arguments &&
    directive.arguments.find(arg => {
      return extractName(arg) === name;
    });

  if (!found) return null;
  return extractValueType(source, found, type);
}

function extractInputClass(source, node) {
  const classDirective =
    node.directives &&
    node.directives.find(dir => {
      const name = extractName(dir);
      return name === 'class';
    });

  if (!classDirective) {
    return null;
  }

  return extractDirectiveArg(
    source,
    classDirective,
    constants.inputClassDirectiveArg,
    'StringValue',
  );
}

function extractArgumentValue(arg) {
  const { kind, value } = arg.value;
  switch (kind) {
    case 'IntValue':
      return parseInt(value, 10);
    case 'FloatValue':
      return parseFloat(value);
    case 'StringValue':
    case 'BooleanValue':
      return value;
    default:
      // return the whole argument for downstream usage.
      return arg;
  }
}

function extractArguments(args) {
  if (!args.length) return {};
  return args.reduce((sum, arg) => {
    sum[extractName(arg)] = extractArgumentValue(arg);
    return sum;
  }, {});
}

function processInputType(source, node, { validators, classes }) {
  const classType = extractInputClass(source, node);
  // extract all field validators...
  const fieldValidators = node.fields.reduce((sum, field) => {
    const name = extractName(field);
    sum[name] = field.directives.reduce((applyedValidators, directive) => {
      const directiveName = extractName(directive);
      if (!validators[directiveName]) return applyedValidators;
      const args = extractArguments(directive.arguments);
      applyedValidators.push({
        function: validators[directiveName],
        args,
      });
      return applyedValidators;
    }, []);
    return sum;
  }, {});

  if (classType && !classes[classType]) {
    throw new Error(`Unhandled class : ${classType}`);
  }

  return {
    fieldValidators,
    classType,
    classConstructor: classes[classType],
  };
}

function makeExecutableSchema({ typeDefs, classes, validators = {} }) {
  const source = new Source(typeDefs);
  const doc = parseGQL(source);

  const inputArgs = {
    classes,
    validators: {
      ...validators,
      ...inputValidators,
    },
  };

  // build the resolver maps...
  const inputs = doc.definitions.reduce((sum, node) => {
    switch (node.kind) {
      case 'InputObjectTypeDefinition':
        sum[extractName(node)] = processInputType(source, node, inputArgs);
        break;
    }
    return sum;
  }, {});
  console.log(inputs);
}

module.exports = {
  makeExecutableSchema,
};
