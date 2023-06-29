/**
 * 
 * Drutex by Karol Sójka
 * 
 * */
const r = require('rethinkdb');
const axios = require('axios');

// Konfiguracja połączenia z bazą danych RethinkDB
const dbConfig = {
  //host: 'app-tracker.onx.ovh', // Adres hosta bazy danych
  host: 'localhost',
  port: 28015, // Port bazy danych
  db: 'letterTracker', // Nazwa bazy danych
  user:'admin',
  //password: '38cd1a92-534e-506c-b624-796001ba584a',
  password: 'localpass'
};


let latitude = 52.759142,
longitude = 21.592441

let authToken = null;

let reqInstance;

let mongoId;


function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

// Funkcja do dodawania logów do bazy danych
async function addLog(connection) {
  // try {
    const point = {
      lat: latitude,
      lng: longitude,
      timestamp: Date.now(),
    };

    r.table('trackers').filter({mongoId:mongoId}).update({
    'points': r.row('points').append(point)
    }).run(connection)

    console.log('Dodano waypoint:', point);
    //connection.close();

    latitude += generateRandomNumber(-0.000044, 0.000044)
    longitude += generateRandomNumber(0.000011, 0.000044)

  // } catch (error) {
  //   console.error('Błąd podczas dodawania logu:', error);
  // }
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
      console.log(response, 'Zalogowano pomyslnie', authToken)
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
    mongoId = response.data._id
  })
  .catch(error => {
    console.log("Nie udało się rozpocząc pracy")
  });
}

async function stopTracking() {
  return await reqInstance.post('http://localhost:3000/tracks/stop', {trackId: mongoId})
  .then(response => {
    console.log('Praca zakonczona', response.data)
  })
  .catch(error => {
    console.log("Nie udało się zakonczyc pracy: ", error)
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

    // if(!mongoId) {
    //   console.log('Proba zakonczenia poprzedniej pracy...')
    //   await stopTracking()

    //   await startTracking();
    // }

    if(mongoId) {

      const connection = await r.connect(dbConfig);

      await r.table('trackers').insert({mongoId: mongoId, points: [], secondsTotal:111, distance:123}).run(connection);

      setInterval(addLog, 3000, connection);
    }

  }
}


async function stop() {
  console.log('Zamknięcie aplikacji');

  await stopTracking()

  process.exit(0); // Wyłącz proces
}

process.on('SIGINT', async () => {
  await stop()
});

run()
