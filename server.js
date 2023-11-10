const fs = require('fs');
const WebSocket = require('ws');
const os = require("os");

const keywords = {
    'winter': ['https://img3.akspic.ru/previews/3/3/9/4/7/174933/174933-plyazh_na_skorostnom_katere-ostrov_vikingov-zima-ozero-sneg-500x.jpg', 
            'https://img3.akspic.ru/previews/7/8/5/4/7/174587/174587-zima-illustracia-mir-sinij-svet-500x.jpg', 
            'https://img3.akspic.ru/previews/5/7/7/3/7/173775/173775-zima-alpy-franciya-kanada-gora-500x.jpg'],
    'forest': ['https://img1.akspic.ru/previews/6/1/0/6/7/176016/176016-otrazhenie-voda-rastenie-list-prirodnyj_landshaft-500x.jpg', 
            'https://img2.akspic.ru/previews/3/2/0/6/7/176023/176023-dikaya_mestnost-oblako-rastenie-gora-prirodnyj_landshaft-500x.jpg', 
            'https://img3.akspic.ru/previews/4/0/9/5/7/175904/175904-priroda-voda-gidroresursy-rastenie-prirodnyj_landshaft-500x.jpg'],
    'stars': ['https://img2.akspic.ru/previews/1/8/0/3/13081/13081-astronomiya-zvezda-galaktika-nebo-astronomicheskij_obekt-500x.jpg', 
            'https://img2.akspic.ru/previews/8/4/6/5/3/135648/135648-chernyy-nebesnoe_yavlenie-nebo-atmosfera-kosmos-500x.jpg', 
            'https://img1.akspic.ru/previews/3/2/6/5/3/135623/135623-temnota-elektrik-nochnoe_nebo-astronomicheskij_obekt-sinij-500x.jpg'],    
};

let MAX_CONCURRENT_THREADS = 1; 
fs.readFile('config.txt', 'utf8', function(err, data) {
  if (!err) {
    MAX_CONCURRENT_THREADS = Number(data);
    
  } else {
    console.error('Ошибка чтения файла конфигурации config.txt:', err);
  }
}); 

const websocket_server = new WebSocket.Server({ port: 8080 });

function status(response) {  
  if (response.status >= 200 && response.status < 300) {  
    return Promise.resolve(response)  
  } else {  
    return Promise.reject(new Error(response.statusText))  
  }  
}

function buffer(response) {  
  return response.arrayBuffer();
}

function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return btoa( binary );
}

websocket_server.on('connection', (web_socket) => {
  console.log('Соединение с клиентом установлено');
  
  web_socket.on('message', (message) => {
    console.log(`Принято новое сообщение: ${message}`);

    try {
      const input_message = JSON.parse(message);
      
      let output_message = {
        REQUEST : input_message.REQUEST,
        DATA    : input_message.DATA,
      };

      if (input_message.REQUEST == "KEYWORD") {
        output_message.ANSWER = keywords[input_message.DATA]
      } else if (input_message.REQUEST == "LINK") {

        fetch(input_message.DATA)  
        .then(status)  
        .then(buffer)  
        .then(function(data) { 
            output_message.ANSWER = _arrayBufferToBase64(data);

            web_socket.send(JSON.stringify(output_message));
          })
        .catch(function(error) {  
            console.log('Ошибка в запросе!', error);  
        });

        return;

      } else {
        output_message.ANSWER = "FAIL";
      }
      const urls = keywords[message];

      let threadCount = 0; 

      if (threadCount < MAX_CONCURRENT_THREADS) {
        threadCount++;
    
        web_socket.send(JSON.stringify(output_message));
    
        console.log(`Запущен новый поток. (${threadCount} из ${MAX_CONCURRENT_THREADS})`);
      } else {
        console.log('Достигнуто максимальное количество параллельных потоков!!!');
      }
    } catch  (err) {
      console.log(err);
    }
  });

  web_socket.on('close', () => {
    console.log('Связь с клиентом разорвана!');
  });
});


console.log("Сервер запущен!");
console.log("Имя хоста:", os.hostname());