import express = require('express');
import cors = require('cors');
import path = require('path');
import config from './config';
const { projectPath, PORT } = config;

import indexRouter from './routes/index';
// reload
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(projectPath, '/client/build')));
// var whitelist = ["http://example1.com", "http://example2.com"];
// var corsOptions = {
//   origin: function (origin, callback) {
//     if (whitelist.indexOf(origin) !== -1) {
//       callback(null, true)
//     } else {
//       callback(new Error('Not allowed by CORS'))
//     }
//   }
// }

// app.use(cors(corsOptions));
app.use(cors());

app.use('/api', indexRouter);

app.get('/faq', (req, res) => {
  console.log('sending file', projectPath + '/client/build/');
  res.sendFile(projectPath + '/client/build/');
});

app.listen(PORT, () => {
  console.log(`app listening on port: http://localhost:${PORT}. project path${projectPath}`);
});

// module.exports = app;
