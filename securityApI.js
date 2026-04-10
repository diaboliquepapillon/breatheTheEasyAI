import "dotenv/config";
import express from "express";
import axios from "axios";
import rateLimit from "express-rate-limit";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use(cors());
app.use(express.json());

function parseLatLon(latRaw, lonRaw) {
  const lat = typeof latRaw === "string" ? parseFloat(latRaw) : Number(latRaw);
  const lon = typeof lonRaw === "string" ? parseFloat(lonRaw) : Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "Invalid coordinates" };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { error: "Coordinates out of range" };
  }
  return { lat, lon };
}

app.get("/api/mapbox", limiter, async (req, res) => {
  try {
    const token = process.env.MAPBOX_TOKEN;
    if (!token) {
      return res.status(503).json({ error: "Mapbox token not configured" });
    }

    const parsed = parseLatLon(req.query.lat, req.query.lon);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const { lat, lon } = parsed;

    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`,
      {
        params: { access_token: token },
        timeout: 12_000,
        validateStatus: () => true,
      },
    );

    if (response.status >= 400) {
      console.error("Mapbox error status:", response.status);
      return res.status(502).json({ error: "Upstream geocoding error" });
    }

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching data from Mapbox:", error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
