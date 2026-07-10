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
        data: [],
        message: "Сервер временно недоступен. Попробуйте позже.",
      };
    }
  }

  // ==================== ГАЛЕРЕЯ ====================
  async getGalleryFilters() {
    try {
      const response = await api.get("/api/gallery-filters");
      console.log(response);
      return response.data;
    } catch (err) {
      console.warn("Фильтры галереи не загрузились:", err.message);
      return { success: true, data: ["Все"] };
    }
  }

  async getGallery() {
    try {
      const response = await api.get(`/api/gallery`);
      return response.data;
    } catch (err) {
      console.warn("Галерея недоступна:", err.message);
      return { success: false, data: [] };
    }
  }

  // ==================== КОМАНДА ====================
  async getTeams() {
    try {
      const response = await api.get("/api/teams");
      return response.data;
    } catch (err) {
      console.warn("Команда недоступна:", err.message);
      return { success: false, data: [] };
    }
  }

  // ==================== ВИДЕО ====================
  async getVideo() {
    try {
      const response = await api.get("/api/video");
      return response.data;
    } catch (err) {
      console.warn("Видео недоступны:", err.message);
      return { success: false, data: [] };
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
      return { success: false, data: [] };
    }
  }

  // Получить мастер-класс по ID
  async getMasterClassById(id) {
    try {
      const response = await api.get(`/api/masterclasses/${id}`);
      return response.data;
    } catch (err) {
      console.warn("Мастер-класс не найден:", err.message);
      return { success: false, data: null };
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
      return { success: false, data: [], pagination: null };
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
      return { success: false, data: [] };
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
      return { success: false, data: [], pagination: null };
    }
  }

  async blockUser(reviewId, reason) {
    try {
      const response = await api.post(`/api/admin/block-user/${reviewId}`, {
        reason,
      });
      return response.data;
    } catch (err) {
      console.warn("Ошибка блокировки пользователя:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка блокировки",
      };
    }
  }

  // Разблокировка пользователя (только для админов)
  async unblockUser(cookieId) {
    try {
      const response = await api.post(`/api/admin/unblock-user/${cookieId}`);
      return response.data;
    } catch (err) {
      console.warn("Ошибка разблокировки пользователя:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || "Ошибка разблокировки",
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
}

export default new ApiService();
