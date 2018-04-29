const { visit } = require('graphql/language');
const { extractName, extractArguments, typeInfo } = require('./utils');
const debug = require('debug')('graphql-super-schema:inputs');

function createFieldTransformer(name, fields, config) {
  return (object, requestConfig) => {
    // do validation here later...
    return Object.entries(object).reduce((sum, [key, value]) => {
      const { transformers } = fields[key];
      sum[key] = transformers.reduce((sum, validator) => {
        debug('register validator', name, key, validator.name);
        return validator.function(value, validator.args, {
          type: fields[key],
          ...requestConfig,
          ...config,
        });
      }, value);
      return sum;
    }, {});
  };
}

function createObjectTransformer(input, config) {
  return (object, requestConfig) => {
    return input.objectValidators.reduce((sum, validator) => {
      return validator.function(object, validator.args, {
        type: input,
        ...requestConfig,
        ...config,
      });
    }, object);
  };
}

function processFieldDirective(source, field, node, { transformers }) {
  const directiveName = extractName(node);

  // not our directive so return the node and move on.
  if (!transformers[directiveName]) {
    // eslint-disable-next-line
    console.warn('Unknown validator', directiveName);
    return node;
  }

  field.transformers.push({
    name: directiveName,
    function: transformers[directiveName],
    args: extractArguments(node.arguments),
  });

  // once we've consumed the directive then we can remove the node.
  return null;
}

function processInputDirective(source, input, node, { transformers }) {
  const directiveName = extractName(node);

  // not our directive so return the node and move on.
  if (!transformers[directiveName]) {
    // eslint-disable-next-line
    console.warn('Unknown validator', directiveName);
    return node;
  }

  input.objectValidators.push({
    name: directiveName,
    function: transformers[directiveName],
    args: extractArguments(node.arguments),
  });

  // once we've consumed the directive then we can remove the node.
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
        inputObj = { name, fields: [], objectValidators: [] };
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
          transformers: [],
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
      // resolve any outstanding references to input types in the transformers.
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
          // because field transformers may reference other input field transformers which
          // have not been fully resolved yet. Once this entire loop is finished _then_
          // the validator will be ready to be called.
          debug('create nested validator', field.type, field.name);
          field.transformers.push({
            name: 'nested',
            function: createFieldTransformer(
              inputType.name,
              inputMapping[inputType.name].fields,
              config,
            ),
            args: {},
          });

          return field;
        })
        .reduce((sum, field) => {
          sum[field.name] = field;
          return sum;
        }, inputFieldMap);

      const objectTransformer = createObjectTransformer(input, config);
      const fieldsTransformer = createFieldTransformer(
        inputName,
        inputFieldMap,
        config,
      );

      const transformer = (value, requestConfig) =>
        objectTransformer(
          fieldsTransformer(value, requestConfig),
          requestConfig,
        );

      sum[inputName] = {
        ...input,
        transformer,
      };

      return sum;
    },
    {},
  );

  return [inputAST, inputs];
}

module.exports = processInput;
