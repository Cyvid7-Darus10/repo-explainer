const router = require('express').Router();
router.get('/', async (req, res) => res.json([]));
router.post('/', async (req, res) => res.status(201).json(req.body));
module.exports = router;
