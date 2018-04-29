# GraphQL Super Schema

This library uses AST rewriting techniques to provide directives for input types. The library comes with built in support to convert input types into classes (newables) and validate fields (nested & array support included) of input types. This is intended to cut down on boilerplate and make your graphql usage more declarative.

Validators will raise informational errors without returning back values passed by the client if validators fail.

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

### Custom Validators

In addition to the many built in validators it's easy to add more.

```js
const schema = makeExecutableSchema({
  // ... stuff above
  validators: {
    // validators are also "transformers" able to transform individual field values.
    toUpperCase: value => value.toUpperCase(),
    ValidateIsFoo: value => {
      if (value !== 'foo') throw new Error('where is the foo?');
      // must return original or transformed value.
      return value;
    },
  },
});
```

## Validators

Validators are all from [class-validators](https://github.com/typestack/class-validator#manual-validation) see their documentation for more details.

### @ValidateIsIn(in: [String | Int | Float]!)

Validate if value is in list of "in"

### @ValidateIsNoIn(in: [String | Int | Float]!)

Validate if value is not in list of "in"

### @ValidateMinLength(min: Int!)

### @ValidateMaxLength(max: Int!)

### ValidateGreaterThan(number: Int!)

### ValidateLessThan(number: Int!)

### ValidateLength(min: Int!, max: Int!)

### ValidateByteLength(min: Int!, max: Int!)

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
