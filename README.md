sjekkut-api (Verdandi)
======================

API backend server for the SjekkUT mobile application.



### Test

```
docker-compose run --rm node npm run test
docker-compose run --rm node npm run lint
```

### Environment variables

* `CHECKIN_MAX_DISTANCE=200` - Used to validate a users proximity to the coordinates it's checking in to. Distance in meters.
* `CHECKIN_TIMEOUT=86400` - Used to validate that a user is not checking in to the same place more often than this timeout allows. Time in seconds.

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

### GET /v3

**Status codes:**

Returns `200 Ok` and an API index on successfull request.

**GET body:**

* **number** `checkin_new.rules.max_distance` - Max distance in meters a user can have to the place it is checking in to.
* **number** `checkin_new.rules.quarantine` - A user can not check in twice to the same place within this period. Time in seconds.

**Example:**

```http
GET /v3 HTTP/1.1
Accept: application/json

HTTP/1.1 Ok
Content-Type: application/json

{
  "checkin_new": {
    "url": "https://sjekkut.app.dnt.no/api/v3/steder/{sted}/besok",
    "rules": {
      "max_distance": 200,
      "quarantine": 86400
    }
  },
  "checkin_get": {
    "url": "https://sjekkut.app.dnt.no/api/v3/steder/{sted}/besok/{oid}"
  },
  "checkin_log": {
    "url": "https://sjekkut.app.dnt.no/api/v3/steder/{sted}/logg"
  },
  "checkin_stats": {
    "url": "https://sjekkut.app.dnt.no/api/v3/steder/{sted}/stats"
  },
  "profile_view": {
    "url": "https://sjekkut.app.dnt.no/api/v3/brukere/{bruker}"
  },
  "list_join": {
    "url": "https://sjekkut.app.dnt.no/api/v3/lister/{liste}/blimed"
  },
  "list_leave": {
    "url": "https://sjekkut.app.dnt.no/api/v3/lister/{liste}/meldav"
  },
  "list_log": {
    "url": "https://sjekkut.app.dnt.no/api/v3/lister/{liste}/logg"
  }
}
```

### GET /v3/steder/{sted}/stats

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v3/steder/524081f9b8cb77df15001660/stats HTTP/1.1
Accept: application/json

HTTP/1.1 Ok
Content-Type: application/json

{
  "data": {
    "count": 2,
  }
}
```

### GET /v3/steder/{sted}/logg

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v3/steder/524081f9b8cb77df15001660/logg HTTP/1.1
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

### POST /v3/steder/{sted}/besok

**Status codes:**

* `201 Created` on successfull checkin.
* `400 Bad Request` on validation error.

**POST body:**

* **number** `lat` - decimal latitude (required)
* **number** `lon` - decimal longitude (required)
* **boolean** `public` - (default `false`)
* **string** `comment` - (default `null`)
* **string** `timestamp` - date and time ISO 8601 (default `Date.now()`)

**Example:**

```http
POST /v3/steder/524081f9b8cb77df15001660/besok HTTP/1.1
Accept: application/json
X-User-Id: 123
X-User-Token: asdf1234

{
  "lat": 12.3456,
  "lon": 98.7654,
  "public": true,
  "comment": "Hello, World!",
  "timestamp": "2016-09-06T12:27:21.594Z"
}

HTTP/1.1 201 Created
Content-Type: application/json
Location: /v3/steder/524081f9b8cb77df15001660/besok/5890f8548a09d70001028d86

{
  "message": "Ok",
  "data": {...}
}
```

### PUT /v3/steder/{sted}/besok/{oid}

**Status codes:**

* `200 OK` on successfull edit
* `400 Bad Request` on validation error.

**PUT body:**

* **boolean** `public`
* **string** `comment`

Other properties will be ignored and remain unchanged.

**Example:**

```http
PUT /v3/steder/524081f9b8cb77df15001660/besok/5890f8548a09d70001028d86 HTTP/1.1
Accept: application/json
X-User-Id: 123
X-User-Token: asdf1234

{
  "public": true,
  "comment": "Hello, World!"
}

HTTP/1.1 200 OK
Content-Type: application/json
Location: /v3/steder/524081f9b8cb77df15001660/besok/5890f8548a09d70001028d86

{
  "message": "Ok",
  "data": {...}
}
```

### PUT /v3/steder/{sted}/besok/{oid}

Send as `Content-Type: multipart/form-data`  with file in field named `photo`. Allowed file types are JPEG and PNG. The photo will be resized to sizes configured in the API, and uploaded to AWS S3. The URLs will be added to the checkin at the property `photos.versions`.

**Status codes:**

- `200 OK` on successfull edit
- `400 Bad Request` on validation error.

**PUT body:**

- **string** `comment`
- **file** `photo`

Other properties will be ignored and remain unchanged.

**Example:**

```http
PUT /v3/steder/524081f9b8cb77df15001660/besok/5890f8548a09d70001028d86 HTTP/1.1
X-User-Id: 123
X-User-Token: asdf1234
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="comment"

Hello again, World!
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="photo"; filename=""
Content-Type:


------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### GET /v3/steder/{sted}/besok/{oid}

**Status codes:**

Returns `200 Ok` for valid checkin.

**Example:**

```http
GET /v3/steder/524081f9b8cb77df15001660/besok/5890f8548a09d70001028d86 HTTP/1.1
Accept: application/json

HTTP/1.1 200 Ok
Content-Type: application/json

{
  "data": {...}
}
```

### GET /v3/brukere/{bruker}

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v3/brukere/1234 HTTP/1.1
Accept: application/json

HTTP/1.1 Ok
Content-Type: application/json

{
  "data": {...}
}
```

### POST /v3/lister/{liste}/blimed

Add the list id to current user's `lister` array.

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
POST /v3/lister/300000000000000000000001/blimed HTTP/1.1
Accept: application/json
X-User-Id: 123
X-User-Token: asdf1234

HTTP/1.1 Ok
Content-Type: application/json

{
  "message": "Ok",
  "data": {...}
}
```

### POST /v3/lister/{liste}/meldav

Remove the list id from current user's `lister` array.

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
POST /v3/lister/300000000000000000000001/meldav HTTP/1.1
Accept: application/json
X-User-Id: 123
X-User-Token: asdf1234

HTTP/1.1 Ok
Content-Type: application/json

{
  "message": "Ok",
  "data": {...}
}
```

### GET /v3/lister/{liste}/logg

**Status codes:**

Returns `200 Ok` on successfull request.

**Example:**

```http
GET /v3/lister/57974036b565590001a98884/logg HTTP/1.1
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

## [MIT lisenced](https://github.com/Turistforeningen/Verdandi/blob/master/LICENSE)
