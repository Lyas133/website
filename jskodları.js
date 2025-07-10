// OpenWeather API anahtarı
const API_KEY = '8ad2d638a98e8ec47a7dce4164509d1a'; // Kendi anahtarınız olmalı
const BASE_URL = 'https://api.openweathermap.org/data/2.5'; //

// Hava durumu ikonları
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

// Harita değişkeni ve işaretleyici
let map = null; //
let marker = null; //

// Enter tuşu ile arama fonksiyonu kaldırıldı çünkü artık metin girişi yok.

async function getWeather() {
    const citySelect = document.getElementById('citySelect');
    const city = citySelect.value.trim(); // Sadece dropdown'dan değeri al

    if (!city) {
        showError('Lütfen bir şehir seçin.'); // Mesaj güncellendi
        return;
    }

    showLoading(true);
    hideError();
    hideWeatherCard();
    hideMapSection();

    try {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // CORS hatasını aşmak için proxy
        const weatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=tr`;
        
        let weatherResponse;
        try {
            weatherResponse = await fetch(weatherUrl);
        } catch (corsError) {
            console.log('CORS hatası, proxy ile deneniyor...');
            weatherResponse = await fetch(proxyUrl + weatherUrl);
        }

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 401) {
                throw new Error('API anahtarı geçersiz veya henüz aktif değil. Lütfen birkaç dakika bekleyin.');
            } else if (weatherResponse.status === 404) {
                throw new Error(`Şehir bulunamadı: ${city}`);
            } else {
                throw new Error(`HTTP ${weatherResponse.status}: ${weatherResponse.statusText}`);
            }
        }

        const weatherData = await weatherResponse.json();
        
        displayWeather(weatherData);
        displayMap(weatherData.coord.lat, weatherData.coord.lon, weatherData.name);

    } catch (error) {
        console.error('Hata detayı:', error);
        showError('Hava durumu verisi alınırken bir hata oluştu: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Yeni: Cihaz konumuna göre hava durumunu getiren fonksiyon
function getDeviceLocationWeather() {
    const currentLocationInfoDiv = document.getElementById('currentLocationInfo');
    currentLocationInfoDiv.innerHTML = '<p>Konum alınıyor...</p>'; // Konum alınırken mesaj göster

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                const weatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`;

                let weatherResponse;
                try {
                    weatherResponse = await fetch(weatherUrl);
                } catch (corsError) {
                    console.log('Cihaz konumu CORS hatası, proxy ile deneniyor...');
                    weatherResponse = await fetch(proxyUrl + weatherUrl);
                }

                if (!weatherResponse.ok) {
                    throw new Error(`HTTP ${weatherResponse.status}: ${weatherResponse.statusText}`);
                }

                const weatherData = await weatherResponse.json();
                
                // Cihaz konum hava durumunu görüntüle
                currentLocationInfoDiv.innerHTML = `
                    <p><strong>Konum:</strong> ${weatherData.name}, ${weatherData.sys.country}</p>
                    <p><strong>Sıcaklık:</strong> ${Math.round(weatherData.main.temp)}°C</p>
                    <p><strong>Hava:</strong> ${weatherData.weather[0].description} ${weatherIcons[weatherData.weather[0].icon] || ''}</p>
                `;

            } catch (error) {
                console.error('Cihaz konumu hava durumu hatası:', error);
                currentLocationInfoDiv.innerHTML = `<p>Cihaz konumu hava durumu alınamadı: ${error.message}</p>`;
            }
        }, (error) => {
            console.error('Konum alınamadı:', error);
            let errorMessage = 'Konum bilgisi alınamadı.';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += ' Konum izni reddedildi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += ' Konum bilgisi mevcut değil.';
                    break;
                case error.TIMEOUT:
                    errorMessage += ' Konum isteği zaman aşımına uğradı.';
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage += ' Bilinmeyen bir hata oluştu.';
                    break;
            }
            currentLocationInfoDiv.innerHTML = `<p>${errorMessage}</p>`;
        });
    } else {
        currentLocationInfoDiv.innerHTML = '<p>Tarayıcınız konum servislerini desteklemiyor.</p>';
    }
}


// UNIX zaman damgasını HH:MM formatına dönüştüren yardımcı fonksiyon
function formatTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000); // Unix timestamp saniye cinsindendir, JS Date ms cinsinden bekler
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Hava durumuna göre arka planı ayarlayan fonksiyon
function setThemedBackground(weatherMain) {
    const body = document.body;
    // Mevcut tüm tema sınıflarını kaldır
    body.classList.remove(
        'clear-sky-bg', 'clouds-bg', 'rain-bg', 'snow-bg', 'thunderstorm-bg', 'mist-bg'
    );

    // Hava durumuna göre yeni tema sınıfı ekle
    switch (weatherMain) {
        case 'Clear':
            body.classList.add('clear-sky-bg');
            break;
        case 'Clouds':
            body.classList.add('clouds-bg');
            break;
        case 'Rain':
        case 'Drizzle':
            body.classList.add('rain-bg');
            break;
        case 'Snow':
            body.classList.add('snow-bg');
            break;
        case 'Thunderstorm':
            body.classList.add('thunderstorm-bg');
            break;
        case 'Mist':
        case 'Smoke':
        case 'Haze':
        case 'Dust':
        case 'Fog':
        case 'Sand':
        case 'Ash':
        case 'Squall':
            body.classList.add('mist-bg');
            break;
        default:
            // Varsayılan arka plan stilini koru veya başka bir varsayılan ekle
            break;
    }
}

function displayWeather(currentData) {
    const icon = weatherIcons[currentData.weather[0].icon] || '🌤️';
    
    document.getElementById('weatherIcon').textContent = icon;
    document.getElementById('temperature').textContent = Math.round(currentData.main.temp) + '°C';
    document.getElementById('cityName').textContent = currentData.name + ', ' + currentData.sys.country;
    document.getElementById('weatherDesc').textContent = currentData.weather[0].description;
    document.getElementById('feelsLike').textContent = Math.round(currentData.main.feels_like) + '°C';
    document.getElementById('humidity').textContent = currentData.main.humidity + '%';
    document.getElementById('windSpeed').textContent = Math.round(currentData.wind.speed * 3.6) + ' km/h';
    document.getElementById('pressure').textContent = currentData.main.pressure + ' hPa';
    document.getElementById('visibility').textContent = currentData.visibility ? (currentData.visibility / 1000).toFixed(1) + ' km' : 'N/A';
    document.getElementById('uvIndex').textContent = 'N/A'; // UV indeksi her zaman N/A

    // Güneş Doğuş/Batış Saatleri
    document.getElementById('sunrise').textContent = formatTime(currentData.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(currentData.sys.sunset);

    setThemedBackground(currentData.weather[0].main);
    setWeatherAnimation(currentData.weather[0].main);

    showWeatherCard();
}

// Haritayı görüntüleme fonksiyonu
function displayMap(lat, lon, cityName) {
    document.getElementById('mapSection').style.display = 'block';

    if (map === null) {
        // Harita henüz başlatılmadıysa başlat
        map = L.map('weatherMap').setView([lat, lon], 10); // 10 varsayılan zoom seviyesi

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    } else {
        // Harita zaten varsa sadece görünümü güncelle
        map.setView([lat, lon], 10);
    }

    // Önceki işaretleyiciyi kaldır
    if (marker !== null) {
        map.removeLayer(marker);
    }

    // Yeni işaretleyici ekle
    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<b>${cityName}</b>`).openPopup();

    // Haritanın boyutlarının doğru ayarlandığından emin olmak için invalidateSize çağrısı
    map.invalidateSize();
}

function showWeatherCard() {
    document.getElementById('weatherCard').style.display = 'block';
}

function hideWeatherCard() {
    document.getElementById('weatherCard').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingMessage').style.display = show ? 'block' : 'none';
}

// Harita bölümünü gizle
function hideMapSection() {
    document.getElementById('mapSection').style.display = 'none';
}

// Sayfa yüklendiğinde İstanbul'u seç ve hava durumunu getir
window.onload = function() {
    document.getElementById('citySelect').value = 'İstanbul';
    getWeather();
    getDeviceLocationWeather(); // Cihaz konum hava durumunu da sayfa yüklendiğinde getir
};

// Şehri Onayla butonuna tıklanınca hava durumu getir
document.getElementById('confirmCityBtn').addEventListener('click', getWeather);

// Animation functions
function createRainDrops() {
    const rainContainer = document.createElement('div');
    rainContainer.style.position = 'fixed';
    rainContainer.style.top = '0';
    rainContainer.style.left = '0';
    rainContainer.style.width = '100%';
    rainContainer.style.height = '100%';
    rainContainer.style.pointerEvents = 'none';
    rainContainer.style.zIndex = '-1';
    rainContainer.id = 'rainContainer';
    
    document.body.appendChild(rainContainer);
    
    for (let i = 0; i < 200; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 1.5 + 0.8) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.width = Math.random() * 2 + 1 + 'px';
        drop.style.height = Math.random() * 15 + 10 + 'px';
        rainContainer.appendChild(drop);
    }
}

function createSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.style.position = 'fixed';
    snowContainer.style.top = '0';
    snowContainer.style.left = '0';
    snowContainer.style.width = '100%';
    snowContainer.style.height = '100%';
    snowContainer.style.pointerEvents = 'none';
    snowContainer.style.zIndex = '-1';
    snowContainer.id = 'snowContainer';
    
    document.body.appendChild(snowContainer);
    
    const snowflakes = ['❄', '❅', '❆'];
    
    for (let i = 0; i < 150; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 7 + 7) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.fontSize = (Math.random() * 1.5 + 1) + 'em';
        snowContainer.appendChild(snowflake);
    }
}

function createClouds() {
    const cloudContainer = document.createElement('div');
    cloudContainer.style.position = 'fixed';
    cloudContainer.style.top = '0';
    cloudContainer.style.left = '0';
    cloudContainer.style.width = '100%';
    cloudContainer.style.height = '100%';
    cloudContainer.style.pointerEvents = 'none';
    cloudContainer.style.zIndex = '-1';
    cloudContainer.id = 'cloudContainer';
    
    document.body.appendChild(cloudContainer);
    
    for (let i = 0; i < 8; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.top = Math.random() * 40 + '%';
        cloud.style.width = Math.random() * 150 + 100 + 'px';
        cloud.style.height = Math.random() * 70 + 50 + 'px';
        cloud.style.animationDuration = (Math.random() * 25 + 40) + 's';
        cloud.style.animationDelay = Math.random() * 15 + 's';
        cloudContainer.appendChild(cloud);
    }
}

function createSunRays() {
    const sunContainer = document.createElement('div');
    sunContainer.style.position = 'fixed';
    sunContainer.style.top = '10%';
    sunContainer.style.right = '10%';
    sunContainer.style.width = '200px';
    sunContainer.style.height = '200px';
    sunContainer.style.pointerEvents = 'none';
    sunContainer.style.zIndex = '-1';
    sunContainer.id = 'sunContainer';
    
    document.body.appendChild(sunContainer);
    
    for (let i = 0; i < 24; i++) {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        ray.style.left = '50%';
        ray.style.bottom = '50%';
        ray.style.transformOrigin = 'bottom center';
        ray.style.transform = `rotate(${i * (360 / 24)}deg)`;
        ray.style.setProperty('--angle', `${i * (360 / 24)}deg`);
        ray.style.animationDelay = Math.random() * 2 + 's';
        ray.style.width = Math.random() * 4 + 2 + 'px';
        ray.style.height = Math.random() * 80 + 40 + 'px';
        sunContainer.appendChild(ray);
    }
}


function clearAnimations() {
    const containers = ['rainContainer', 'snowContainer', 'cloudContainer', 'sunContainer'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.remove();
        }
    });
}

function setWeatherAnimation(weatherCondition) {
    clearAnimations();

    switch (weatherCondition) {
        case 'Rain':
        case 'Drizzle':
            createRainDrops();
            break;
        case 'Snow':
            createSnowflakes();
            break;
        case 'Clouds':
            createClouds();
            break;
        case 'Clear':
            createSunRays();
            break;
        default:
            break;
    }
}