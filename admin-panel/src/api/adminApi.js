import client from "./client";

export const authApi = {
  login: (password) =>
    client.post("/api/admin/auth/login", { password }).then((r) => r.data),
  logout: () => client.post("/api/admin/auth/logout").then((r) => r.data),
  me: () => client.get("/api/admin/auth/me").then((r) => r.data),
};

export const inviteApi = {
  get: (token) => client.get(`/api/admin/invites/${token}`).then((r) => r.data),
  accept: (token, name, password) =>
    client.post(`/api/admin/invites/${token}/accept`, { name, password }).then((r) => r.data),
};

export const accountsApi = {
  list: () => client.get("/api/admin/accounts").then((r) => r.data),
  invite: (email) => client.post("/api/admin/invites", { email }).then((r) => r.data),
  revokeInvite: (id) => client.delete(`/api/admin/invites/${id}`).then((r) => r.data),
  remove: (id) => client.delete(`/api/admin/accounts/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  get: () => client.get("/api/admin/dashboard").then((r) => r.data),
};

export const aboutApi = {
  get: () => client.get("/api/admin/about").then((r) => r.data),
  update: (payload) => client.put("/api/admin/about", payload).then((r) => r.data),
};

export const uploadApi = {
  photo: (file, onProgress) => {
    const form = new FormData();
    form.append("photo", file);
    return client
      .post("/api/admin/upload/photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
          : undefined,
      })
      .then((r) => r.data);
  },
  video: (file) => {
    const form = new FormData();
    form.append("video", file);
    return client
      .post("/api/admin/upload/video", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// Фабрика CRUD-клиента для одной сущности под /api/admin/<resource>
function makeResourceApi(resource) {
  return {
    list: () => client.get(`/api/admin/${resource}`).then((r) => r.data),
    create: (payload) =>
      client.post(`/api/admin/${resource}`, payload).then((r) => r.data),
    update: (id, payload) =>
      client.put(`/api/admin/${resource}/${id}`, payload).then((r) => r.data),
    remove: (id) =>
      client.delete(`/api/admin/${resource}/${id}`).then((r) => r.data),
  };
}

export const eventsApi = makeResourceApi("events");
export const galleryApi = makeResourceApi("gallery");
export const videoApi = makeResourceApi("video");
export const teamsApi = makeResourceApi("teams");
export const masterClassesApi = makeResourceApi("masterclasses");

// sort_order приходит из ResourceManager как строка (текстовое поле) —
// на сервере колонка INTEGER, приводим к числу перед отправкой.
function normalizeServicePayload(payload) {
  return { ...payload, sort_order: Number(payload.sort_order) || 0 };
}

export const servicesApi = {
  list: () => client.get("/api/admin/services").then((r) => r.data),
  create: (payload) =>
    client.post("/api/admin/services", normalizeServicePayload(payload)).then((r) => r.data),
  update: (id, payload) =>
    client.put(`/api/admin/services/${id}`, normalizeServicePayload(payload)).then((r) => r.data),
  remove: (id) => client.delete(`/api/admin/services/${id}`).then((r) => r.data),
};

export const ordersApi = {
  list: (params = {}) => client.get("/api/admin/orders", { params }).then((r) => r.data),
  get: (id) => client.get(`/api/admin/orders/${id}`).then((r) => r.data),
  unreadCount: () => client.get("/api/admin/orders/unread-count").then((r) => r.data),
  setStatus: (id, status, note) =>
    client.post(`/api/admin/orders/${id}/status`, { status, note }).then((r) => r.data),
  setPricing: (id, agreed_price, agreed_deadline) =>
    client
      .post(`/api/admin/orders/${id}/pricing`, { agreed_price, agreed_deadline })
      .then((r) => r.data),
  sendMessage: (id, body) =>
    client.post(`/api/admin/orders/${id}/messages`, { body }).then((r) => r.data),
  archive: (id) => client.post(`/api/admin/orders/${id}/archive`).then((r) => r.data),
  uploadFiles: (id, files, onProgress) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return client
      .post(`/api/admin/orders/${id}/files`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
          : undefined,
      })
      .then((r) => r.data);
  },
};

export const reviewsApi = {
  list: (status = "pending") =>
    client.get("/api/admin/reviews", { params: { status } }).then((r) => r.data),
  byVisitor: (cookieId) =>
    client.get(`/api/admin/reviews/visitor/${cookieId}`).then((r) => r.data),
  approve: (id) =>
    client.post(`/api/admin/reviews/${id}/approve`).then((r) => r.data),
  reject: (id, reason) =>
    client.post(`/api/admin/reviews/${id}/reject`, { reason }).then((r) => r.data),
  block: (id, reason) =>
    client.post(`/api/admin/reviews/${id}/block`, { reason }).then((r) => r.data),
  unblockUser: (cookieId) =>
    client.post(`/api/admin/unblock-user/${cookieId}`).then((r) => r.data),
};
