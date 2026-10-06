const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3000;

let requestCount = 0;

app.use(express.static("public"));

// Reverse geocode via Nominatim (used only when API is live, not demo)
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
        return null; // let client handle it
    }
}

app.get("/uv", async (req, res) => {
    const { lat, lng } = req.query;

    try {
        requestCount++;

        // DEMO MODE — return null city so the browser does the geocoding itself
        // (Render free tier blocks outbound requests, so server-side geocoding fails)
        if (process.env.USE_API === "false") {
            return res.json({
                uv: 6,
                uv_max: 9,
                city: null
            });
        }

        // LIVE MODE — fetch UV + city in parallel
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
        res.json({ uv: 2, uv_max: 6, city: null });
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