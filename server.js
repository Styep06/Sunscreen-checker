const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3000;

let requestCount = 0;

app.use(express.static("public"));

// Reverse geocode lat/lng → city name via OpenStreetMap Nominatim
async function getCity(lat, lng) {
    try {
        const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: { lat, lon: lng, format: "json" },
            headers: { "User-Agent": "SunscreenChecker/1.0" }
        });

        const addr = res.data.address || {};
        const city =
            addr.city    ||
            addr.town    ||
            addr.village ||
            addr.suburb  ||
            addr.county  ||
            addr.state   ||
            "Unknown";

        const country = addr.country_code?.toUpperCase() || "";
        return country ? `${city}, ${country}` : city;

    } catch {
        return "Unknown Location";
    }
}

app.get("/uv", async (req, res) => {
    const { lat, lng } = req.query;

    try {
        requestCount++;

        // DEMO MODE
        if (process.env.USE_API === "false") {
            const city = await getCity(lat, lng);
            return res.json({
                uv: 6,
                uv_max: 9,
                city
            });
        }

        const [uvResponse, city] = await Promise.all([
            axios.get("https://api.openuv.io/api/v1/uv", {
                params: { lat, lng },
                headers: { "x-access-token": process.env.API_KEY }
            }),
            getCity(lat, lng)
        ]);

        const uv    = uvResponse.data.result.uv;
        const uvMax = uvResponse.data.result.uv_max;

        res.json({ uv, uv_max: uvMax, city });

    } catch (error) {
        console.error("ERROR:", error.response?.data || error.message);

        res.json({
            uv: 2,
            uv_max: 6,
            city: "Fallback Mode"
        });
    }
});

app.get("/stats", (req, res) => {
    res.json({
        requests: requestCount,
        remaining: process.env.USE_API === "false"
            ? "Unlimited (Demo)"
            : 1000 - requestCount
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});