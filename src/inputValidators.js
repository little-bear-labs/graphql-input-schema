const { Validator } = require('class-validator');
const validator = new Validator();

const SIMPLE_SINGLE = [
  'isAlpha',
  'isAlphanumeric',
  'isAscii',
  'isBase64',
  'isCreditCard',
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
  if (!result) {
    throw new Error(err());
  }
  return value;
};

const runValidatorSingleValue = (method, meta, value, args, err) => {
  if (!meta.list) {
    return runValidator(method, value, args, err);
  }

  return value.reduce((sum, toValidate) => {
    return runValidator(method, toValidate, args, err);
  }, value);
};

// eslint-disable-next-line
function IsLength(value, config) {
  return value;
}

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

module.exports = {
  IsLength,
  ValidateIsIn,
  ValidateIsNotIn,

  // for testing....
  SIMPLE_SINGLE,
};

SIMPLE_SINGLE.forEach(method => {
  module.exports[method] = (value, _, meta) => {
    return runValidatorSingleValue(method, meta, value, [], () => {
      return `value fails pattern ${method}`;
    });
  };
});
