# GraphQL Super Schema [![Build Status](https://travis-ci.org/ConduitVC/graphql-super-schema.svg?branch=master)](https://travis-ci.org/ConduitVC/graphql-super-schema)

This library uses AST rewriting techniques to provide directives for input types. The library comes with built in support to convert input types into classes (newables) and validate fields (nested & array support included) of input types. This is intended to cut down on boilerplate and make your graphql usage more declarative.

Transformers will raise informational errors without returning back values passed by the client if transformers fail.

## Usage

The API is intended to be a drop in replacement for [graphql-tools](https://github.com/apollographql/graphql-tools) `makeExecutableSchema`.

```js
const { makeExecutableSchema } = require('graphql-super-schema');

class UserCreation {
  constructor(input) {
    Object.assign(this, input);
  }
}

const resolvers = {
  Mutation: {
    createUser(
      root,
      { user /* if validation passes this will be a User instance */ },
      ctx,
    ) {
      // ...
    },
  },
};

const schema = makeExecutableSchema({
  typeDefs: `
    # your graphql schema as usual ...

    # Additional functionality for input types
    input CreateUser @class(name: "UserCreation") {
      name: String!
        @ValidateMinLength(min: 3)
        @ValidateByteLength(min: 0, max: 255)
    }

    type Mutation {
      createUser(user: CreateUser): ID!
    }
  `,
  resolvers,
  classes: { User },
});
```

### Custom Transformers

In addition to the many built in transformers it's easy to add more.

```js
const schema = makeExecutableSchema({
  // ... stuff above
  transformers: {
    // transformers are also "transformers" able to transform individual field values.
    toUpperCase: value => value.toUpperCase(),
    ValidateIsFoo: value => {
      if (value !== 'foo') throw new Error('where is the foo?');
      // must return original or transformed value.
      return value;
    },
  },
});
```

NOTE: The built in transformers will (unless otherwise noted) iterate through arrays and validate each element. For maximum flexibility custom iterators must implement that functionality themselves if they wish to specifically validate elements instead of arrays. The `TypeMeta` will tell if you if the given type is an array.

NOTE: If the element is `nullable` and the value is null transformers will not be run.

### Type signature for validator/transformer functions.

````js
type TypeMeta = {
  nullable: boolean,
  // GraphQL type name (such as String)
  type: string,
  // Is the type wrapped up in an Array?
  list?: boolean,
  // Is the GraphQL type a user created type ?
  isCustomType: boolean,
};

type Arguments = {
  [key: string]: mixed,
};

// Arguments are taken from the GraphQL arguments passed into the directive.
// For example to get the arguments { min: 5, really: true } the following
// would be passed.
//
// ```graphql
// @ValidatorName(min: 5, really: true)
// ```
type ValidatorFn = (value: mixed, args: Arguments, meta: TypeMeta) => mixed;
````

## Transformers

Transformers are all from [class-transformers](https://github.com/typestack/class-validator#manual-validation) see their documentation for more details.

### @ValidateIsIn(in: [String | Int | Float]!)

Validate if value is in list of "in"

### @ValidateIsNoIn(in: [String | Int | Float]!)

Validate if value is not in list of "in"

### @ValidateMinLength(min: Int!)

### @ValidateMaxLength(max: Int!)

### @ValidateGreaterThan(number: Int!)

### @ValidateLessThan(number: Int!)

### @ValidateLength(min: Int!, max: Int!)

### @ValidateByteLength(min: Int!, max: Int!)

### @ValidateIsAlpha

### @ValidateIsAlphanumeric

### @ValidateIsAscii

### @ValidateIsBase64

### @ValidateIsCreditCard

### @ValidateIsEmail

### @ValidateIsFQDN

### @ValidateIsURL

### @ValidateIsFullWidth

### @ValidateIsHalfWidth

### @ValidateIsVariableWidth

### @ValidateIsHexColor

### @ValidateIsHexadecimal

### @ValidateIsISIN

### @ValidateIsISO8601

### @ValidateIsJSON

### @ValidateIsLowercase

### @ValidateIsMongoId

### @ValidateIsMultibyte

### @ValidateIsSurrogatePair

### @ValidateIsUppercase

### @ValidateIsMilitaryTime

### @ValidateIsPositive

### @ValidateIsNegative
