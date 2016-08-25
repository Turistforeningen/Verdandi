# Testing

## Run Tests

```
npm run test
npm run test:watch
```

## Run Linter

```
npm run lint
npm run lint:watch
```

## Structure

### `index.js`

The main test file. This sets up the test suite by connecting to the database,
inserting test data and making sure everything is ready for testing.

### `./support`

Here are support files required by the test. `./support/env.js` are environment
variables loaded when tests are run.

### `./fixtures`

Here are test data used for the test suite. We try not hard-coding test-values
in the test suite if we can put it into the test data files.

### `./unit`

Unit tests tests individual functions, primarily those in `/lib`.

### `./acceptance`

Acceptance tests are tests which simulates how the API will be used by an
application testing the REST API interface.
