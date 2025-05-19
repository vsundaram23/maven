const express = require('express');
const router = express.Router();

const {
  getAllVisibleAutoProviders,
  getVisibleAutoProviderById
} = require('../controllers/autoProviderController');

router.get('/', getAllVisibleAutoProviders);

router.get('/:id', getVisibleAutoProviderById);

module.exports = router;