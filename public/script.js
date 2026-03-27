const UV_STATES = [
    { max: 0, state: 'night', level: 'Night', message: 'No UV radiation. No sunscreen needed.', barColor: '#ffe135' },
    { max: 2, state: 'low', level: 'Low', message: 'Low UV. No sunscreen needed.', barColor: '#0a0a0a' },
    { max: 5, state: 'moderate', level: 'Moderate', message: 'Moderate UV. Consider SPF 30+ sunscreen.', barColor: '#0a0a0a' },
    { max: 7, state: 'high', level: 'High', message: 'High UV. Apply sunscreen and seek shade.', barColor: '#0a0a0a' },
    { max: 10, state: 'very-high', level: 'Very High', message: 'Very High UV. Strong protection needed.', barColor: '#ffe135' },
    { max: Infinity, state: 'extreme', level: 'Extreme', message: 'Extreme UV. Avoid sun exposure.', barColor: '#ffe135' },
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
    document.body.classList.remove(
        'state-night','state-low','state-moderate',
        'state-high','state-very-high','state-extreme'
    );
}

async function getUV() {
    setLoading(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const res  = await fetch(`/uv?lat=${lat}&lng=${lng}`);
            const data = await res.json();

            // ✅ SAFE values
            const uv    = data.uv ?? 0;
            const uvMax = data.uv_max ?? 0;
            const city  = data.city ?? "Unknown";

            const s = getState(uv);

            clearBodyStates();
            document.body.classList.add('state-' + s.state);

            const pct = Math.min((uv / 11) * 100, 100);
            const bar = document.getElementById('uvBar');
            bar.style.width = pct + '%';
            bar.style.background = s.barColor;

            document.getElementById('uvValue').textContent   = uv.toFixed(1);
            document.getElementById('levelLabel').textContent = s.level;
            document.getElementById('message').textContent   = s.message;
            document.getElementById('city').textContent      = city;
            document.getElementById('uvMax').textContent     = uvMax.toFixed(1);

            const card = document.getElementById('card');
            card.classList.remove('hidden');
            requestAnimationFrame(() => card.classList.add('visible'));

        } catch (e) {
            alert('Could not fetch UV data.');
        } finally {
            setLoading(false);
        }
    }, () => {
        alert('Location access denied.');
        setLoading(false);
    });
}