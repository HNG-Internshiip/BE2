import { Request, Response } from "express";
import { pool } from "../config/db";
import { parseQuery } from "../services/nlp.service";
import type { ProfileFilters, SortField, SortOrder, Pagination, Profile } from "../types";

interface QueryBundle {
  countSQL:    string;
  countParams: unknown[];
  dataSQL:     string;
  dataParams:  unknown[];
}

function buildQuery(
  filters:    ProfileFilters,
  sortBy:     SortField,
  sortOrder:  SortOrder,
  pagination: Pagination,
): QueryBundle {
  const conditions: string[] = [];
  const params:     unknown[] = [];
  let   idx = 1;

  const add = (col: string, op: string, val: unknown): void => {
    conditions.push(`${col} ${op} $${idx++}`);
    params.push(val);
  };

  if (filters.gender                  != null) add("gender",              "=",  filters.gender);
  if (filters.age_group               != null) add("age_group",           "=",  filters.age_group);
  if (filters.country_id              != null) add("country_id",          "=",  filters.country_id);
  if (filters.min_age                 != null) add("age",                 ">=", filters.min_age);
  if (filters.max_age                 != null) add("age",                 "<=", filters.max_age);
  if (filters.min_gender_probability  != null) add("gender_probability",  ">=", filters.min_gender_probability);
  if (filters.min_country_probability != null) add("country_probability", ">=", filters.min_country_probability);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSQL    = `SELECT COUNT(*)::INT AS total FROM profiles ${where}`;
  const countParams = [...params];

  // sortBy is already validated; map to exact column name
  const col = sortBy === "created_at"         ? "created_at"
            : sortBy === "age"                ? "age"
            :                                   "gender_probability";

  const dataSQL = `
    SELECT
      id, name, gender, gender_probability,
      age, age_group, country_id, country_name, country_probability,
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM profiles
    ${where}
    ORDER BY ${col} ${sortOrder}
    LIMIT $${idx++} OFFSET $${idx}
  `;
  const dataParams = [...params, pagination.limit, pagination.offset];

  return { countSQL, countParams, dataSQL, dataParams };
}

// ── GET /api/profiles ────────────────────────────────────────────────────────
export async function getProfiles(req: Request, res: Response): Promise<void> {
  try {
    const { countSQL, countParams, dataSQL, dataParams } = buildQuery(
      req.filters!,
      req.sortBy!,
      req.sortOrder!,
      req.pagination!,
    );

    const [countResult, dataResult] = await Promise.all([
      pool.query<{ total: number }>(countSQL, countParams),
      pool.query<Profile>(dataSQL, dataParams),
    ]);

    res.json({
      status: "success",
      page:   req.pagination!.page,
      limit:  req.pagination!.limit,
      total:  countResult.rows[0].total,
      data:   dataResult.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

// ── GET /api/profiles/search ─────────────────────────────────────────────────
export async function searchProfiles(req: Request, res: Response): Promise<void> {
  try {
    const filters = parseQuery(req.rawQuery!);

    if (!filters) {
      res.status(400).json({ status: "error", message: "Unable to interpret query" });
      return;
    }

    const { countSQL, countParams, dataSQL, dataParams } = buildQuery(
      filters,
      "created_at",
      "ASC",
      req.pagination!,
    );

    const [countResult, dataResult] = await Promise.all([
      pool.query<{ total: number }>(countSQL, countParams),
      pool.query<Profile>(dataSQL, dataParams),
    ]);

    res.json({
      status: "success",
      page:   req.pagination!.page,
      limit:  req.pagination!.limit,
      total:  countResult.rows[0].total,
      data:   dataResult.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}