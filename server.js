const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');

// Inicializa Firebase con tu archivo de clave
const serviceAccount = require('./firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tu-proyecto.firebaseio.com"
});

// Crear servidor con Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos (como tu juego)
app.use(express.static('public'));

// Crear una base de datos en Firestore para almacenar puntajes
const db = admin.firestore();

// Variables para gestionar jugadores
let players = [];

io.on('connection', (socket) => {
  console.log('Un jugador se ha conectado: ' + socket.id);

  // Registrar jugador cuando se conecta
  players.push({ id: socket.id, score: 0 });

  // Enviar bienvenida al jugador
  socket.emit('welcome', `Bienvenido al juego, tu ID es ${socket.id}`);

  // Actualizar puntaje cuando un jugador responde
  socket.on('respuesta', (data) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      player.score += data.puntos; // Asignar puntos según respuesta
    }
    console.log(`Jugador ${socket.id} puntaje actualizado: ${player.score}`);

    // Guardar resultados en Firebase
    db.collection('puntajes').doc(socket.id).set({
      puntaje: player.score
    });

    // Enviar puntaje actualizado al jugador
    socket.emit('puntaje', player.score);

    // Enviar lista de jugadores con puntajes actualizados a todos los clientes
    io.emit('actualizarResultados', players);
  });

  // Cuando un jugador se desconecta
  socket.on('disconnect', () => {
    console.log('Jugador desconectado: ' + socket.id);
    players = players.filter(p => p.id !== socket.id);

    // Enviar la lista actualizada de jugadores
    io.emit('actualizarResultados', players);
  });
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
