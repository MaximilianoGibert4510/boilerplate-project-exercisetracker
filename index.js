const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Conexión DB.
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB: ', err));

//Definimos schemas
const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true, // Asegura que el nombre de usuario sea único
      trim: true // Elimina espacios en blanco al principio y al final
    }
  });

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
  

// Crea un modelo con el esquema definido
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Ruta para registrar un usuario
app.post('/api/users', (req, res) => {

  const { username } = req.body;

  console.log(username);

  // Verifica si el nombre de usuario está presente
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Crea un nuevo usuario
  const newUser = new User({ username });

  // Guarda el usuario en la base de datos
  newUser.save()
    .then(user => res.json({ username: user.username, _id: user._id }))
    .catch(err => res.status(500).json({ error: 'Error saving user' }));
});

//Ruta para agregar ejercicios a un usuario con su id
app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

// Verifica si el cuerpo de la solicitud tiene los datos necesarios
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

// Si no se proporciona una fecha, usa la fecha actual
  const exerciseDate = date ? new Date(date) : new Date();

// Crea un nuevo ejercicio
const newExercise = new Exercise({
  userId,
  description,
  duration,
  date: exerciseDate
});

// Log de búsqueda del usuario
console.log(`Buscando al usuario con ID: ${userId}`); 
 // Encuentra al usuario y agrega el ejercicio
 User.findById(userId)
 .then(user => {
   if (!user) {
    // Log si el usuario no existe
    console.log(`Usuario con ID: ${userId} no encontrado`); 
     return res.status(404).json({ error: 'User not found' });
   }

   // Log de usuario encontrado
   console.log(`Usuario encontrado: ${user.username}`); 

   // Asocia el ejercicio al usuario
newExercise.save()
     .then(exercise => {

      // Log al agregar el ejercicio
      console.log(`Ejercicio agregado para el usuario ${user.username}: ${exercise.description}`);
       // Responde con la información del ejercicio guardado y el usuario
       res.json({
         username: user.username,
         description: exercise.description,
         duration: exercise.duration,
         _id: user._id,
         date: exercise.date.toDateString()
       });
     })     
     .catch(err => {
      // Log de error al guardar ejercicio
     console.error('Error al guardar el ejercicio:', err);
      res.status(500).json({ error: err })});
 })
 .catch(err => {
  // Log de error al buscar al usuario
  console.error('Error al buscar al usuario:', err);
  res.status(500).json({ error: 'Error finding user' })});
});


//Ruta para obtener la lista de usuarios.
app.get('/api/users', (req, res) => {
  User.find({})
    .then(users => {
      res.json(users);  // Devuelve la lista de usuarios en formato JSON
    })
    .catch(err => {
      res.status(500).json({ error: 'Error al obtener los usuarios' });
    });
});

// Ruta para obtener el log de ejercicios de un usuario
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Buscar el usuario por ID
  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Configurar los filtros de fecha
      const filter = {};
      if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = new Date(from);
        if (to) filter.date.$lte = new Date(to);
      }

      // Buscar ejercicios asociados al usuario con filtros y límite
      Exercise.find({userId: user._id, ...filter})
        .limit(parseInt(limit) || 0)
        .then(exercises => {
          const log = exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          }));

          // Respuesta con el log de ejercicios
          res.json({
            username: user.username,
            count: log.length,
            _id: user._id,
            log
          });
        })
        .catch(err => res.status(500).json({ error: 'Error fetching exercises' }));
    })
    .catch(err => res.status(500).json({ error: 'Error finding user' }));
});


const listener = app.listen(process.env.PORT || 3001, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
