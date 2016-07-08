![Verðandi](https://raw.githubusercontent.com/Turistforeningen/Verdandi/master/assets/verdandi.png "Skaði")

[![Build status](https://app.wercker.com/status/eeff9d36f7e451fe1f1364c7209adde6/s "Build status")](https://app.wercker.com/project/bykey/eeff9d36f7e451fe1f1364c7209adde6)
[![Codacy grade](https://img.shields.io/codacy/grade/4b0305b11f144bd190f34196631994f2.svg "Codacy grade")](https://www.codacy.com/app/DNT/Verdandi)
[![Codacy coverage](https://img.shields.io/codacy/coverage/4b0305b11f144bd190f34196631994f2.svg "Codacy coverage")](https://www.codacy.com/app/DNT/Verdandi)
[![NPM downloads](https://img.shields.io/npm/dm/verdandi.svg "NPM downloads")](https://www.npmjs.com/package/verdandi)
[![NPM version](https://img.shields.io/npm/v/verdandi.svg "NPM version")](https://www.npmjs.com/package/verdandi)
[![Node version](https://img.shields.io/node/v/verdandi.svg "Node version")](https://www.npmjs.com/package/verdandi)
[![Dependency status](https://img.shields.io/david/Turistforeningen/Verdandi.svg "Dependency status")](https://david-dm.org/Turistforeningen/Verdandi)

API backend server for the Sjekk UT mobile application.

From the Old Norse Verðandi meaning "becoming, happening". Verdandi was one of
the three Norns, or goddesses of destiny, in Norse mythology. She was
responsible for the present.

```
                                        Thence come maidens
                                            much knowing
                                        three from the hall
                                    which under that tree stands;
                                         Urd hight the one,
                                        the second Verdandi,
                                      on a tablet they graved,
                                          Skuld the third;
                                       Laws they established,
                                            life allotted
                                         to the sons of men,
                                        destinies pronounced.
```

## Getting started

Download [Docker for Mac or Windows](https://www.docker.com/products/docker).

Run in this directory:

```
$ docker-compose up
```

### Test

```
docker-compose run --rm node npm run test
docker-compose run --rm node npm run lint
```

## API

### Authentication

Some API endpoints requires the following user authentication headers:

* `X-User-Id` - DNT Connect User ID
* `X-User-Token` - DNT Connect OAuth 2 token

### Response codes

Unless otherwise statet API endpoints will return the following HTTP status
codes:

* `200 Ok` - Successfull GET request
* `201 Created` - Successfull POST or PUT request
* `204 No Content` - Successfull HEAD or DELETE request
* `400 Bad Request` - Bad user supplied data
* `401 Unauthorized` - Missing or invalid user authentication
* `403 Forbidden` - Missing or invalid user permissions
* `404 Not Found` - Resource or endpoint not found
* `500 Internal Server Error` - Internal server error
* `501 Not Implemented` - API endpoint is not implemented yet

### GET /v1/steder/:sted/stats

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v1/steder/524081f9b8cb77df15001660/stats HTTP/1.1
Accept: application/json

HTTP/1.1 Ok
Content-Type: application/json

{
  "data": [
    count: 2,
  ]
}
```

### GET /v1/steder/:sted/logg

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v1/steder/524081f9b8cb77df15001660/logg HTTP/1.1
Accept: application/json

HTTP/1.1 Ok
Content-Type: application/json

{
  "data": [
    {...},
    {...}
  ]
}
```

### POST /v1/steder/:sted/besok

**Status codes:**

Returns `201 Created` on successfull checkin.

**Example:**

```http
POST /v1/steder/524081f9b8cb77df15001660/besok HTTP/1.1
Accept: application/json
X-User-Id: 123
X-User-Token asdf123

{
  "lat": 12.3456,
  "lon": 98.7654
}

HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/steder/524081f9b8cb77df15001660/besok/1234-123-123-1234

{
  "message": "Ok",
  "data": { ... }
}
```

## [MIT lisenced](https://github.com/Turistforeningen/Verdandi/blob/master/LICENSE)
