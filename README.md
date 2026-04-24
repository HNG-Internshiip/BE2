# Insighta Labs — Intelligence Query Engine API

A REST API for querying demographic profile data with advanced filtering, sorting, pagination, and natural language search. Built with Node.js, Express, TypeScript, and PostgreSQL.

---

## Table of Contents

- [Setup](#setup)
- [Endpoints](#endpoints)
- [Natural Language Parsing](#natural-language-parsing)
- [Limitations](#limitations)
- [Error Reference](#error-reference)

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted e.g. [Neon](https://neon.tech))

### Install & Run

```bash
# Install dependencies
npm install

# Copy environment file and fill in your DATABASE_URL
cp .env.example .env

# Seed the database with 2026 profiles
node scripts/seed.js

# Start development server
npm run dev

# Build and start production server
npm run build && npm start
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: `3000`) |
| `SEED_FILE` | Path to seed JSON (default: `data/profiles.json`) |

---

## Endpoints

### `GET /api/profiles`

Returns a paginated list of profiles with optional filtering and sorting.

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `gender` | `male` \| `female` | Filter by gender |
| `age_group` | `child` \| `teenager` \| `adult` \| `senior` | Filter by age group |
| `country_id` | string (ISO-2) | e.g. `NG`, `KE`, `GH` |
| `min_age` | integer | Minimum age (inclusive) |
| `max_age` | integer | Maximum age (inclusive) |
| `min_gender_probability` | float (0–1) | Minimum gender confidence score |
| `min_country_probability` | float (0–1) | Minimum country confidence score |
| `sort_by` | `age` \| `created_at` \| `gender_probability` | Default: `created_at` |
| `order` | `asc` \| `desc` | Default: `asc` |
| `page` | integer ≥ 1 | Default: `1` |
| `limit` | integer 1–50 | Default: `10` |

All filters are combinable. A request with no filters returns all profiles.

**Example Request**

```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Example Response**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 312,
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}
```

---

### `GET /api/profiles/search?q=<query>`

Parses a plain-English query and returns matching profiles. Supports the same `page` and `limit` pagination parameters.

**Example Requests**

```
GET /api/profiles/search?q=young males from nigeria
GET /api/profiles/search?q=adult females above 30 from kenya&page=2&limit=20
GET /api/profiles/search?q=senior men from ghana
GET /api/profiles/search?q=teenagers between 15 and 18
```

**Example Response**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 87,
  "data": [...]
}
```

**Uninterpretable Query Response**

```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

---

## Natural Language Parsing

The `/api/profiles/search` endpoint uses a fully **rule-based parser** — no AI, no external APIs. It is deterministic, zero-latency, and runs entirely in-process.

The parser operates in four sequential passes over the lowercased query string.

---

### Pass 1 — Gender

Scans individual tokens against two fixed sets of gender words.

| Tokens | Maps to |
|---|---|
| `male`, `man`, `men`, `boy`, `boys`, `males` | `gender = male` |
| `female`, `woman`, `women`, `girl`, `girls`, `females` | `gender = female` |

The phrase `male and female`, `female and male`, or `both genders` cancels the gender filter so both genders are returned.

---

### Pass 2 — Age Keywords

#### "young" — special keyword (numeric range only, not a stored age group)

```
"young"  →  min_age = 16, max_age = 24
```

`young` is a parsing-only concept. It does not correspond to any value stored in the `age_group` column.

#### Age group keywords

| Keyword(s) | `age_group` filter | Default numeric bounds |
|---|---|---|
| `child`, `children` | `child` | `max_age = 12` |
| `teenager`, `teenagers`, `teen`, `teens` | `teenager` | `min_age = 13, max_age = 19` |
| `adult`, `adults` | `adult` | `min_age = 18, max_age = 59` |
| `senior`, `seniors`, `elderly`, `old` | `senior` | `min_age = 60` |

Default numeric bounds are only applied if no bounds were already set by `young` in the same pass.

---

### Pass 3 — Numeric Age Thresholds

These patterns override or refine the default bounds from Pass 2.

| Pattern | Filter applied |
|---|---|
| `above N` / `older than N` | `min_age = N` |
| `over N` | `min_age = N + 1` |
| `below N` / `younger than N` | `max_age = N` |
| `under N` | `max_age = N - 1` |
| `between N and M` | `min_age = N, max_age = M` |
| `aged N` / `age N` | `min_age = N, max_age = N` |

---

### Pass 4 — Country Resolution

Country names and demonyms are resolved to ISO-2 codes via a lookup table. The parser tries the longest possible phrase first (up to 4 words) to correctly resolve names like `south africa` before falling back to shorter matches.

The preposition `from` is not required — a country name or demonym anywhere in the query is matched.

**Supported countries (sample)**

| Query phrase | `country_id` |
|---|---|
| `nigeria` / `nigerian` | `NG` |
| `kenya` / `kenyan` | `KE` |
| `ghana` / `ghanaian` | `GH` |
| `south africa` / `south african` | `ZA` |
| `angola` / `angolan` | `AO` |
| `ethiopia` / `ethiopian` | `ET` |
| `senegal` / `senegalese` | `SN` |
| `tanzania` / `tanzanian` | `TZ` |
| `cameroon` / `cameroonian` | `CM` |
| `ivory coast` / `ivorian` | `CI` |

Full list of ~50 African nations is defined in `src/services/nlp.service.ts`.

---

### Mapping Examples

| Query | Filters produced |
|---|---|
| `young males` | `gender=male, min_age=16, max_age=24` |
| `females above 30` | `gender=female, min_age=30` |
| `people from angola` | `country_id=AO` |
| `adult males from kenya` | `gender=male, age_group=adult, country_id=KE` |
| `male and female teenagers above 17` | `age_group=teenager, min_age=17` |
| `senior women from ghana` | `gender=female, age_group=senior, min_age=60, country_id=GH` |
| `men between 25 and 40` | `gender=male, min_age=25, max_age=40` |
| `children under 10` | `age_group=child, max_age=9` |

---

## Limitations

### Country coverage
The lookup table covers ~50 African nations and their common demonyms. Countries outside Africa are not included as they do not appear in the dataset. Queries referencing unlisted countries will not extract a country filter.

### "young" conflicts with age groups
Combining `young` with an age group keyword (e.g. `young adults`) applies both sets of bounds simultaneously — `min_age=16, max_age=24` from `young` and `age_group=adult` from `adults`. If a numeric threshold in Pass 3 then overrides the bounds, the result may be an impossible range that returns zero rows rather than an error.

### No negation
Phrases like `not from nigeria` or `males excluding seniors` are not supported. The negation is silently ignored and the positive term is matched instead.

### No OR logic
The parser only supports AND logic across all filters. `males or females from kenya` will drop the gender filter (detected as both-gender pattern) and filter only by country.

### Typos and misspellings
There is no fuzzy matching. `nigria` will not match Nigeria.

### Sorting on search
The `/api/profiles/search` endpoint defaults to `created_at ASC` and does not accept `sort_by` or `order` parameters. Use `GET /api/profiles` directly for full sort control.

### Ordinal and relative phrases
Expressions like `the oldest profiles` or `top 10 adults` are not supported.

---

## Error Reference

All errors follow a consistent structure:

```json
{ "status": "error", "message": "<description>" }
```

| Status Code | Condition |
|---|---|
| `400` | Missing or empty required parameter |
| `422` | Invalid parameter type or out-of-range value |
| `404` | Route not found |
| `500` | Internal server error |

Unknown query parameters (e.g. `?foo=bar`) return `400` with `"Invalid query parameters"`.