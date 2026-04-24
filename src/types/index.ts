export type Gender    = "male" | "female";
export type AgeGroup  = "child" | "teenager" | "adult" | "senior";
export type SortField = "age" | "created_at" | "gender_probability";
export type SortOrder = "ASC" | "DESC";

export interface Profile {
  id:                  string;
  name:                string;
  gender:              Gender;
  gender_probability:  number;
  age:                 number;
  age_group:           AgeGroup;
  country_id:          string;
  country_name:        string;
  country_probability: number;
  created_at:          string;
}

export interface ProfileFilters {
  gender?:                  Gender;
  age_group?:               AgeGroup;
  country_id?:              string;
  min_age?:                 number;
  max_age?:                 number;
  min_gender_probability?:  number;
  min_country_probability?: number;
}

export interface Pagination {
  page:   number;
  limit:  number;
  offset: number;
}

export interface SuccessResponse<T> {
  status: "success";
  page:   number;
  limit:  number;
  total:  number;
  data:   T[];
}

export interface ErrorResponse {
  status:  "error";
  message: string;
}

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      filters?:    ProfileFilters;
      sortBy?:     SortField;
      sortOrder?:  SortOrder;
      pagination?: Pagination;
      rawQuery?:   string;
    }
  }
}