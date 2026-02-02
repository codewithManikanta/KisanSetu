const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ listings: [] });
});

module.exports = router;
