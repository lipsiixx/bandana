import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "https://bandana-dance.ru";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

class ApiService {
  // ==================== СОБЫТИЯ ====================
  async getEvents() {
    try {
      const response = await api.get("/api/events");
      return response.data;
    } catch (err) {
      console.warn(
        "События недоступны (возможно, атака или лимит):",
        err.message,
      );
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== ГАЛЕРЕЯ ====================
  async getGalleryFilters() {
    try {
      const response = await api.get("/api/gallery-filters");
      return response.data;
    } catch (err) {
      console.warn("Фильтры галереи не загрузились:", err.message);
      return {
        success: true,
        error: true,
        data: ["Все"],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async getGallery() {
    try {
      const response = await api.get(`/api/gallery`);
      return response.data;
    } catch (err) {
      console.warn("Галерея недоступна:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== КОМАНДА ====================
  async getTeams() {
    try {
      const response = await api.get("/api/teams");
      return response.data;
    } catch (err) {
      console.warn("Команда недоступна:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== ВИДЕО ====================
  async getVideo() {
    try {
      const response = await api.get("/api/video");
      return response.data;
    } catch (err) {
      console.warn("Видео недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== КОНТАКТНАЯ ФОРМА ====================
  async postContact(data) {
    try {
      const response = await api.post("/api/contact-form", data);
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки формы:", err.message);
      return { success: false };
    }
  }

  // ==================== МАСТЕР-КЛАССЫ ====================

  // Получить все мастер-классы
  async getMasterClasses() {
    try {
      const response = await api.get("/api/masterclasses");
      return response.data;
    } catch (err) {
      console.warn("Мастер-классы недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // Получить мастер-класс по ID
  async getMasterClassById(id) {
    try {
      const response = await api.get(`/api/masterclasses/${id}`);
      return response.data;
    } catch (err) {
      console.warn("Мастер-класс не найден:", err.message);
      return {
        success: false,
        error: true,
        data: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // Получить отзывы мастер-класса (с пагинацией)
  async getMasterClassReviews(masterClassId, page = 1, limit = 10) {
    try {
      const response = await api.get(
        `/api/masterclasses/${masterClassId}/reviews`,
        {
          params: { page, limit },
        },
      );
      return response.data;
    } catch (err) {
      console.warn("Отзывы мастер-класса недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        pagination: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // Отправить отзыв на мастер-класс
  async sendMasterClassReview(masterClassId, data) {
    try {
      const response = await api.post(
        `/api/masterclasses/${masterClassId}/send-review`,
        data,
      );
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки отзыва:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка отправки отзыва",
      };
    }
  }

  // Получить одобренные отзывы мастер-класса (без пагинации, для виджетов)
  async getApprovedMasterClassReviews(masterClassId, limit = 20) {
    try {
      const response = await api.get(
        `/api/masterclasses/${masterClassId}/reviews/approved`,
        {
          params: { limit },
        },
      );
      return response.data;
    } catch (err) {
      console.warn("Отзывы мастер-класса недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== ЗАНЯТИЯ ПО ТАНЦАМ ====================

  async getDanceClasses() {
    try {
      const response = await api.get("/api/dance-classes");
      return response.data;
    } catch (err) {
      console.warn("Занятия недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async getDanceClassReviews(danceClassId, page = 1, limit = 10) {
    try {
      const response = await api.get(`/api/dance-classes/${danceClassId}/reviews`, {
        params: { page, limit },
      });
      return response.data;
    } catch (err) {
      console.warn("Отзывы занятия недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        pagination: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async sendDanceClassReview(danceClassId, data) {
    try {
      const response = await api.post(`/api/dance-classes/${danceClassId}/send-review`, data);
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки отзыва:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка отправки отзыва",
      };
    }
  }

  async getApprovedDanceClassReviews(danceClassId, limit = 20) {
    try {
      const response = await api.get(`/api/dance-classes/${danceClassId}/reviews/approved`, {
        params: { limit },
      });
      return response.data;
    } catch (err) {
      console.warn("Отзывы занятия недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== ОТЗЫВЫ ОБ УСЛУГАХ ====================

  // Одобренные отзывы об услугах — slug="all" для всех услуг сразу
  async getServiceReviews(slug = "all", page = 1, limit = 10) {
    try {
      const response = await api.get(`/api/services/${slug}/reviews`, {
        params: { page, limit },
      });
      return response.data;
    } catch (err) {
      console.warn("Отзывы об услугах недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        pagination: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // Отзыв об услуге — только на странице заказа, после завершения (status === "completed")
  async submitOrderReview(token, data) {
    try {
      const response = await api.post(`/api/orders/by-token/${token}/review`, data);
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки отзыва:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка отправки отзыва",
      };
    }
  }

  // ==================== ОТЗЫВЫ ДЛЯ СОБЫТИЙ ====================

  // Отправить отзыв на событие
  async sendEventReview(eventId, data) {
    try {
      const response = await api.post("/api/send-review", {
        event_id: eventId,
        ...data,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки отзыва:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка отправки отзыва",
      };
    }
  }

  // Получить опубликованные отзывы для событий
  async getPublishedReviews(eventId = null, page = 1, limit = 10) {
    try {
      const params = { page, limit };
      if (eventId && eventId !== "all") {
        params.event_id = eventId;
      }
      const response = await api.get("/api/reviews", { params });
      return response.data;
    } catch (err) {
      console.warn("Отзывы недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        pagination: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async refreshCookie() {
    try {
      const response = await api.get("/api/refresh-cookie");
      return response.data;
    } catch (err) {
      console.warn("Ошибка обновления куки:", err.message);
      return { success: false };
    }
  }

  // ==================== О СЕБЕ ====================
  async getAbout() {
    try {
      const response = await api.get("/api/about");
      return response.data;
    } catch (err) {
      console.warn("Блок «о себе» недоступен:", err.message);
      return { success: false, error: true, data: null };
    }
  }

  // ==================== УСЛУГИ И ЗАКАЗЫ ====================

  async getServices() {
    try {
      const response = await api.get("/api/services");
      return response.data;
    } catch (err) {
      console.warn("Услуги недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async getServiceBySlug(slug) {
    try {
      const response = await api.get(`/api/services/${slug}`);
      return response.data;
    } catch (err) {
      console.warn("Услуга недоступна:", err.message);
      return {
        success: false,
        error: true,
        data: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // Создаёт черновик заказа (шаг 1 визарда) — возвращает {orderId, token, orderNumber}
  async createOrder(data) {
    try {
      const response = await api.post("/api/orders", data);
      return response.data;
    } catch (err) {
      console.warn("Ошибка создания заказа:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка создания заказа",
      };
    }
  }

  // Сохраняет прогресс визарда (каждый шаг); finalize:true — для шага подтверждения
  async patchOrder(orderId, token, fields) {
    try {
      const response = await api.patch(`/api/orders/${orderId}`, {
        token,
        ...fields,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка сохранения заказа:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка сохранения заказа",
      };
    }
  }

  async uploadOrderFiles(orderId, token, files, onProgress) {
    try {
      const form = new FormData();
      form.append("token", token);
      for (const file of files) form.append("files", file);
      const response = await api.post(`/api/orders/${orderId}/source-files`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
          : undefined,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка загрузки файла:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка загрузки файла",
      };
    }
  }

  async addOrderLink(orderId, token, url, note) {
    try {
      const response = await api.post(`/api/orders/${orderId}/source-links`, {
        token,
        url,
        note,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка добавления ссылки:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка добавления ссылки",
      };
    }
  }

  async getOrderStatus(token) {
    try {
      const response = await api.get(`/api/orders/by-token/${token}`);
      return response.data;
    } catch (err) {
      console.warn("Заказ недоступен:", err.message);
      return {
        success: false,
        error: true,
        data: null,
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  async postOrderMessage(token, body) {
    try {
      const response = await api.post(`/api/orders/by-token/${token}/messages`, {
        body,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка отправки сообщения:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка отправки сообщения",
      };
    }
  }

  // Уведомления об одобрении/отклонении/блокировке отзыва (для текущего посетителя)
  async getNotifications() {
    try {
      const response = await api.get("/api/notifications");
      return response.data;
    } catch (err) {
      console.warn("Уведомления недоступны:", err.message);
      return {
        success: false,
        error: true,
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }
}

const apiService = new ApiService();
export default apiService;
