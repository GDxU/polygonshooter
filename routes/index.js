'use strict';

const express = require('express');
const router = express.Router();

const LanguageMiddleware = require('./languagemiddleware');

/* GET home page. */
router.get('/',
    LanguageMiddleware,
    function (data, req, res, next) {


        let currentLanguage = data.queryLanguage || data.languageID;


      res.render('index', {
      title: 'Express',
      I18N_DATA: data.i18n_stringified,  // json-object is sent to the client
      gameID:req.query.id,
      I18N_LAYOUT: data.getLanguage(currentLanguage),                 // the object is just jused to generate the template
      LANGUAGES:JSON.stringify(data.languages),
      LANGUAGE_ID:JSON.stringify(currentLanguage),
      fs: {
          translate:data.translate
      }
    });
});

module.exports = router;
