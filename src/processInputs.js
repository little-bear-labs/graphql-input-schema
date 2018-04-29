const constants = require('./constants');
const { visit } = require('graphql/language');
const {
  extractName,
  extractArguments,
  extractDirectiveArg,
  typeInfo,
} = require('./utils');
const debug = require('debug')('graphql-super-schema:inputs');

function extractInputClass(source, directive) {
  if (extractName(directive) !== 'class') {
    return null;
  }

  if (!directive) {
    return null;
  }

  return extractDirectiveArg(
    source,
    directive,
    constants.inputClassDirectiveArg,
    'StringValue',
  );
}

function createValidator(name, fields) {
  return object => {
    // do validation here later...
    return Object.entries(object).reduce((sum, [key, value]) => {
      const { fieldValidators } = fields[key];
      sum[key] = fieldValidators.reduce((sum, validator) => {
        debug('register validator', name, key, validator.name);
        return validator.function(value, validator.args, fields[key]);
      }, value);
      return sum;
    }, {});
  };
}

function processFieldDirective(source, field, node, { validators }) {
  const directiveName = extractName(node);

  // not our directive so return the node and move on.
  if (!validators[directiveName]) {
    // eslint-disable-next-line
    console.warn('Unknown validator', directiveName);
    return node;
  }

  field.fieldValidators.push({
    name: directiveName,
    function: validators[directiveName],
    args: extractArguments(node.arguments),
  });

  // once we've consumed the directive then we can remove the node.
  return null;
}

function processInputDirective(source, input, node, { classes }) {
  const classType = extractInputClass(source, node);
  if (classType && !classes[classType]) {
    throw new Error(`Unhandled class : ${classType}`);
  }
  input.classType = classType;
  input.classConstructor = classes[classType];

  // input objects do not typically process directives. Delete the node.
  return null;
}

function processInput(source, doc, config) {
  const inputMapping = {};
  let inputObj = null;
  let field = null;

  const inputAST = visit(doc, {
    Document(node) {
      return node;
    },
    InputObjectTypeDefinition: {
      enter(node) {
        const name = extractName(node);
        inputObj = { name, fields: [] };
        return node;
      },
      leave(node) {
        inputObj.fields = inputObj.fields.reduce((sum, field) => {
          sum[field.name] = field;
          return sum;
        }, {});
        inputMapping[inputObj.name] = inputObj;
        debug('register type', inputObj);
        inputObj = null;
        return node;
      },
    },
    InputValueDefinition: {
      enter(node) {
        if (!inputObj) return node;
        field = {
          name: extractName(node),
          ...typeInfo(node),
          fieldValidators: [],
        };
        return node;
      },
      leave(node) {
        if (!inputObj) return node;
        inputObj.fields.push(field);
        field = null;
        return node;
      },
    },
    Directive: {
      enter(node) {
        // only process directives when we are an input object field.
        if (!field && !inputObj) return node;
        return node;
      },
      leave(node) {
        if (field) {
          return processFieldDirective(source, field, node, config);
        }
        return processInputDirective(source, inputObj, node, config);
      },
    },
  });

  const inputs = Object.entries(inputMapping).reduce(
    (sum, [inputName, input]) => {
      // resolve any outstanding references to input types in the validators.
      const inputFieldMap = {};
      Object.values(input.fields)
        .map(field => {
          const { type, isCustomType } = field;
          // if it's not some kind of custom input type then move on.
          if (isCustomType === false) {
            return field;
          }

          // must be both a custom type and input type for us to apply the object validation.
          const inputType = inputMapping[type];
          if (!inputType) {
            return field;
          }

          // XXX: Note how this is modified by reference. This is very intentional
          // because field validators may reference other input field validators which
          // have not been fully resolved yet. Once this entire loop is finished _then_
          // the validator will be ready to be called.
          debug('create nested validator', field.type, field.name);
          field.fieldValidators.push({
            name: 'nested',
            function: createValidator(
              inputType.name,
              inputMapping[inputType.name].fields,
            ),
            args: {},
          });

          return field;
        })
        .reduce((sum, field) => {
          sum[field.name] = field;
          return sum;
        }, inputFieldMap);

      sum[inputName] = {
        ...input,
        validator: createValidator(inputName, inputFieldMap),
      };

      return sum;
    },
    {},
  );

  return [inputAST, inputs];
}

module.exports = processInput;
