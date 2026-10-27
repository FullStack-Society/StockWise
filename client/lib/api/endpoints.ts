// Every backend URL lives here. If your FastAPI routes differ, change them in this one file.
export const ENDPOINTS = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  inventory: "/api/inventory/",
  inventoryItem: (id: number) => `/api/inventory/${id}`,
  // Tried in order; the first one that exists is used.
  categories: ["/api/inventory/categories/", "/api/categories/"],
};
