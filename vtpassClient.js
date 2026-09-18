const axios = require("axios");

const BASE_URL =
  process.env.VTPASS_ENV === "live"
    ? process.env.VTPASS_LIVE_BASE_URL
    : process.env.VTPASS_SANDBOX_BASE_URL;

const API_KEY = process.env.VTPASS_API_KEY;
const PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const SECRET_KEY = process.env.VTPASS_SECRET_KEY;

if (!API_KEY || !PUBLIC_KEY || !SECRET_KEY) {
  console.warn(
    "[vtpassClient] Missing VTpass keys in environment variables"
  );
}

function generateRequestId() {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes());
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${stamp}${suffix}`;
}

function getHeaders(method) {
  if (method === "GET") {
    return { "api-key": API_KEY, "public-key": PUBLIC_KEY };
  }
  return { "api-key": API_KEY, "secret-key": SECRET_KEY };
}

async function vtpassGet(path, params = {}) {
  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: getHeaders("GET"),
    params,
  });
  return res.data;
}

async function vtpassPost(path, body = {}) {
  const res = await axios.post(`${BASE_URL}${path}`, body, {
    headers: getHeaders("POST"),
  });
  return res.data;
}

function getServiceCategories() {
  return vtpassGet("/service-categories");
}

function getServicesByCategory(identifier) {
  return vtpassGet("/services", { identifier });
}

function getVariations(serviceID) {
  return vtpassGet("/service-variations", { serviceID });
}

function getWalletBalance() {
  return vtpassGet("/balance");
}

function purchase(payload) {
  const body = { request_id: generateRequestId(), ...payload };
  return vtpassPost("/pay", body);
}

function requeryTransaction(request_id) {
  return vtpassPost("/requery", { request_id });
}

module.exports = {
  generateRequestId,
  getServiceCategories,
  getServicesByCategory,
  getVariations,
  getWalletBalance,
  purchase,
  requeryTransaction,
};
