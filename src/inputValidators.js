const { Validator } = require('class-validator');
const validator = new Validator();

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

module.exports = {
  IsLength,
  ValidateIsIn,
};
