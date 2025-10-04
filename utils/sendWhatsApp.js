import axios from "axios";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export const sendWhatsApp = async (to, message) => {
  try {
    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;

    const data = {
      messaging_product: "whatsapp",
      to: to, // full number with country code, e.g., "918057509308"
      type: "text",
      text: { body: message },
    };

    const headers = {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ WhatsApp message sent:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Error sending WhatsApp:", err.response?.data || err.message);
  }
};
