-- A identidade de acesso não deve variar apenas por maiúsculas/minúsculas.
CREATE UNIQUE INDEX "users_username_lower_unique"
  ON "users" (lower("username"));
