export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface CategoriesListResponse {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryFormInput {
  name: string;
  description: string | null;
  active: boolean;
}
