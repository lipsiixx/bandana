import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://bandana-dance.ru";

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export default client;
