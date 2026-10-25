const express = require('express');
const app = express();
app.use('/tasks', require('./routes/tasks'));
app.listen(3000);
