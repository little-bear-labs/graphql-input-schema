const { Validator } = require('class-validator');
const validator = new Validator();
const debug = require('debug')('graphql-super-schema:transformers');

const SIMPLE_SINGLE = [
  'isAlpha',
  'isAlphanumeric',
  'isAscii',
  'isBase64',
  'isCreditCard',
  'IsEmail',
  'IsFQDN',
  'IsURL',
  'isFullWidth',
  'isHalfWidth',
  'isVariableWidth',
  'isHexColor',
  'isHexadecimal',
  'isISIN',
  'isISO8601',
  'isJSON',
  'isLowercase',
  'isMongoId',
  'isMultibyte',
  'isSurrogatePair',
  'isUppercase',
  'isMilitaryTime',
  'isPositive',
  'isNegative',
];

const runValidator = (method, value, args, err) => {
  const result = validator[method](value, ...args);
  debug('run validator', { method, value, result });
  if (!result) {
    throw new Error(err());
  }
  return value;
};

const runValidatorSingleValue = (method, meta, value, args, err) => {
  if (!meta.type.list) {
    return runValidator(method, value, args, err);
  }

  return value.reduce((sum, toValidate) => {
    return runValidator(method, toValidate, args, err);
  }, value);
};

function ValidateIsIn(value, { in: inputs }, meta) {
  return runValidatorSingleValue(
    'isIn',
    meta,
    value,
    [inputs],
    () => `value is not in list ${inputs.join(', ')}`,
  );
}

function ValidateIsNotIn(value, { in: inputs }, meta) {
  return runValidatorSingleValue(
    'isNotIn',
    meta,
    value,
    [inputs],
    () => `value disallowed from list ${inputs.join(', ')}`,
  );
}

function ValidateGreaterThan(value, { number }) {
  if (value < number) throw new Error(`value is less than ${number}`);
  return value;
}

function ValidateLessThan(value, { number }) {
  if (value > number) throw new Error(`value is greater than ${number}`);
  return value;
}

function ValidateLength(value, { min, max }, meta) {
  return runValidatorSingleValue(
    'length',
    meta,
    value,
    [min, max],
    () => `value must be between the length of ${min}-${max}`,
  );
}

function ValidateMinLength(value, { min }, meta) {
  return runValidatorSingleValue(
    'minLength',
    meta,
    value,
    [min],
    () => `value must be minimum length of ${min}`,
  );
}

function ValidateMaxLength(value, { max }, meta) {
  return runValidatorSingleValue(
    'maxLength',
    meta,
    value,
    [max],
    () => `value must be maximum length of ${max}`,
  );
}

function ValidateByteLength(value, { min, max }, meta) {
  return runValidatorSingleValue(
    'isByteLength',
    meta,
    value,
    [min, max],
    () => `value must be between the btye length of ${min}-${max}`,
  );
}

function classDirective(value, { name }, { classes }) {
  const classConstructor = classes[name];
  if (!classConstructor) {
    throw new Error(`Class ${name} is not registered`);
  }
  return new classConstructor(value);
}

module.exports = {
  ValidateLength,
  ValidateByteLength,
  ValidateIsIn,
  ValidateIsNotIn,
  ValidateLessThan,
  ValidateGreaterThan,
  ValidateMinLength,
  ValidateMaxLength,
  class: classDirective,
};

SIMPLE_SINGLE.forEach(method => {
  const name = 'Validate' + method[0].toUpperCase() + method.slice(1);
  module.exports[name] = (value, _, meta) => {
    return runValidatorSingleValue(method, meta, value, [], () => {
      return `value fails pattern ${name}`;
    });
  };
});
