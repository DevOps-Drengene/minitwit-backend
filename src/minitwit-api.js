const express = require('express');

const app = express();
const port = process.env.PORT || 5001;

app.get('/latest', (_req, res) => {
    return res.status(200).send('Dummy latest return');
});

app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
});
