const UV_STATES = [
    { max: 0,        state: 'night',    level: 'Night',     message: 'No UV radiation. No sunscreen needed.',      barColor: '#ffe135' },
    { max: 2,        state: 'low',      level: 'Low',       message: 'Low UV. No sunscreen needed.',               barColor: '#0a0a0a' },
    { max: 5,        state: 'moderate', level: 'Moderate',  message: 'Moderate UV. Consider SPF 30+ sunscreen.',   barColor: '#0a0a0a' },
    { max: 7,        state: 'high',     level: 'High',      message: 'High UV. Apply sunscreen and seek shade.',   barColor: '#0a0a0a' },
    { max: Infinity, state: 'extreme',  level: 'Very High', message: 'Extreme UV. Full protection required.',      barColor: '#ffe135' },
];

function getState(uv) {
    return UV_STATES.find(s => uv <= s.max);
}

function setLoading(on) {
    const btn  = document.querySelector('.check-btn');
    const text = btn.querySelector('.btn-text');
    btn.classList.toggle('loading', on);
    btn.disabled = on;
    text.textContent = on ? 'Locating...' : 'Check UV Index';
}

function clearBodyStates() {
    document.body.classList.remove('state-night','state-low','state-moderate','state-high','state-extreme');
}

// Always runs in the browser — no server restrictions
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const city =
            addr.city       ||
            addr.town       ||
            addr.village    ||
            addr.suburb     ||
            addr.county     ||
            addr.state      ||
            data.display_name?.split(',')[0] ||
            'Unknown';
        const country = addr.country_code?.toUpperCase() || '';
        return country ? `${city}, ${country}` : city;
    } catch {
        return 'Unknown Location';
    }
}

async function getUV() {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Always geocode client-side in parallel with the UV fetch
            // Server returns city=null when it can't geocode (e.g. demo mode on Render)
            const [uvRes, clientCity] = await Promise.all([
                fetch(`/uv?lat=${lat}&lng=${lng}`),
                reverseGeocode(lat, lng)
            ]);

            const data = await uvRes.json();

            const uv    = data.uv;
            const uvMax = data.uv_max;

            // Prefer server city if valid, otherwise use client-geocoded city
            const city = (data.city && data.city.trim() !== '')
                ? data.city
                : clientCity;

            const s = getState(uv);

            clearBodyStates();
            document.body.classList.add('state-' + s.state);

            const pct = Math.min((uv / 11) * 100, 100);
            const bar = document.getElementById('uvBar');
            bar.style.width      = pct + '%';
            bar.style.background = s.barColor;

            document.getElementById('uvValue').textContent    = uv.toFixed(1);
            document.getElementById('levelLabel').textContent = s.level;
            document.getElementById('message').textContent    = s.message;
            document.getElementById('city').textContent       = city;
            document.getElementById('uvMax').textContent      = uvMax.toFixed(1);

            const card = document.getElementById('card');
            card.classList.remove('hidden');
            requestAnimationFrame(() => card.classList.add('visible'));

        } catch (e) {
            alert('Could not fetch UV data. Try again.');
        } finally {
            setLoading(false);
        }
    }, () => {
        alert('Location access denied.');
        setLoading(false);
    });
}