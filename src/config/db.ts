import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function initDB(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id                  VARCHAR(36)  PRIMARY KEY,
      name                VARCHAR(255) NOT NULL UNIQUE,
      gender              VARCHAR(10)  NOT NULL,
      gender_probability  FLOAT        NOT NULL,
      age                 INT          NOT NULL,
      age_group           VARCHAR(20)  NOT NULL,
      country_id          VARCHAR(2)   NOT NULL,
      country_name        VARCHAR(255) NOT NULL,
      country_probability FLOAT        NOT NULL,
      created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_gender      ON profiles(gender);
    CREATE INDEX IF NOT EXISTS idx_profiles_age         ON profiles(age);
    CREATE INDEX IF NOT EXISTS idx_profiles_age_group   ON profiles(age_group);
    CREATE INDEX IF NOT EXISTS idx_profiles_country_id  ON profiles(country_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at  ON profiles(created_at);
  `);
  console.log("Database initialised");
}