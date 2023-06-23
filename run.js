/**
 * 
 * Drutex by Karol Sójka
 * 
 * */
const r = require('rethinkdb');
const axios = require('axios');

// Konfiguracja połączenia z bazą danych RethinkDB
const dbConfig = {
  host: 'localhost', // Adres hosta bazy danych
  port: 28015, // Port bazy danych
  db: 'letterTracker', // Nazwa bazy danych
};

let latitude = 52.759142,
longitude = 21.592441

let authToken = null;

let reqInstance;

let trackId;


function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

// Funkcja do dodawania logów do bazy danych
async function addLog() {
  try {
    const connection = await r.connect(dbConfig);
    const log = {
      trackId: trackId,
      latitude: latitude,
      longitude: longitude,
      timestamp: Date.now()
    };

    await r.table('waypoints').insert(log).run(connection);
    console.log('Dodano waypoints log:', log);
    connection.close();

    latitude += generateRandomNumber(-0.000044, 0.000044)
    longitude += generateRandomNumber(0.000011, 0.000044)

  } catch (error) {
    console.error('Błąd podczas dodawania logu:', error);
  }
}

//najpierw rejestracja takiego konta - jak juz istnieje to nic sie zlego nei stanie przeciez :D
async function loginOrRegister() {
  await axios.post('http://localhost:3000/auth/register', {
    email: 'robot@onx.pl',
    password: 'password',
    firstName: 'Mr',
    lastName: 'Robot'
  })
  .then(response => {
    authToken = response.data.type + " " + response.data.access_token;
    console.log('Zarejestrowano pomyslnie', authToken)
  })
  .catch(async error => {
    
    //logowanie jesli konto juz istnieje
    await axios.post('http://localhost:3000/auth/login', {
      email: 'robot@onx.pl',
      password: 'password',
    })
    .then(response => {
      authToken = response.data.type + " " + response.data.access_token;
      console.log('Zalogowano pomyslnie', authToken)
    })
    .catch(error => {
      console.error('Błąd podczas logowania:', error);
    });

  });
}

async function startTracking() {
  return await reqInstance.post('http://localhost:3000/tracks/start')
  .then(response => {
    console.log('Praca rozpoczęta', response.data)
    trackId = response.data._id
  })
  .catch(error => {
    console.log("Nie udało się rozpocząc pracy")
  });
}

async function stopTracking() {
  return await reqInstance.post('http://localhost:3000/tracks/stop', {trackId: trackId})
  .then(response => {
    console.log('Praca zakonczona', response.data)
  })
  .catch(error => {
    console.log("Nie udało się zakonczyc pracy: ")
  });
}


async function run() {
  await loginOrRegister();

  if( authToken ) {

    reqInstance = axios.create({
      headers: {
        Authorization : authToken
      }
    })

    await startTracking();

    // if(!trackId) {
    //   console.log('Proba zakonczenia poprzedniej pracy...')
    //   await stopTracking()

    //   await startTracking();
    // }

    if(trackId) {
      setInterval(addLog, 5000);
    }

  }
}


process.on('SIGINT', async () => {
  console.log('Zamknięcie aplikacji');

  await stopTracking()

  process.exit(0); // Wyłącz proces
});

run()
