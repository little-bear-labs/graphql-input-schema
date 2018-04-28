const constants = require('./constants');
const {
  extractName,
  extractArguments,
  extractDirectiveArg,
  typeInfo,
} = require('./utils');

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

function processInputType(source, node, { validators, classes }) {
  const classType = extractInputClass(source, node);
  // extract all field validators...
  const fields = node.fields.map(field => {
    const name = extractName(field);
    const fieldValidators = field.directives.reduce(
      (appliedValidators, directive) => {
        const directiveName = extractName(directive);
        if (!validators[directiveName]) return appliedValidators;
        const args = extractArguments(directive.arguments);
        return [
          ...appliedValidators,
          {
            function: validators[directiveName],
            args,
          },
        ];
      },
      [],
    );
    return {
      name,
      fieldValidators,
      ...typeInfo(field),
    };
  });

  if (classType && !classes[classType]) {
    throw new Error(`Unhandled class : ${classType}`);
  }

  return {
    classType,
    classConstructor: classes[classType],
    fields,
  };
}

function createValidator(name, fields) {
  return object => {
    // do validation here later...
    console.log(name, 'running validation', object);
  };
}

function processInput(source, doc, config) {
  // build the resolver maps...
  const inputMapping = doc.definitions.reduce((sum, node) => {
    switch (node.kind) {
      case 'InputObjectTypeDefinition':
        sum[extractName(node)] = processInputType(source, node, config);
        break;
    }
    return sum;
  }, {});

  return Object.entries(inputMapping).reduce((sum, [inputName, input]) => {
    // resolve any outstanding references to input types in the validators.
    const fields = input.fields.map(field => {
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
      field.fieldValidators.push(
        createValidator(inputType.name, inputType.fields),
      );

      return field;
    });

    sum[inputName] = {
      ...input,
      validator: createValidator(inputName, fields),
    };

    return sum;
  }, {});
}

module.exports = processInput;
