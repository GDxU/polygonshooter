'use strict';

const express = require('express');
const router = express.Router();

const LanguageMiddleware = require('./languagemiddleware');

/* GET home page. */
router.get('/',
    LanguageMiddleware,
    function (data, req, res, next) {
      res.render('index', {
      title: 'Express',
      I18N_DATA: data.i18n_stringified,  // json-object is sent to the client
      gameID:req.query.id,
    });
});

module.exports = router;
