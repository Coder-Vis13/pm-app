import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const USER_ID = import.meta.env.VITE_USER_ID;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (USER_ID) {
    config.headers["X-User-Id"] = USER_ID;
  }

  return config;
});

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function handleApiError(error: unknown): never {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;

    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message ??
      "An unexpected error occurred";

    throw new ApiError(status, message, error.response?.data);
  }

  throw error;
}

export const get = async (
  url: string,
  params?: Record<string, unknown>
) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const post = async (
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
) => {
  try {
    const response = await api.post(url, body, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const patch = async (
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
) => {
  try {
    const response = await api.patch(url, body, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const del = async (
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
) => {
  try {
    const response = await api.delete(url, {
      data: body,
      params,
    });

    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export default api;