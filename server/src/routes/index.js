const fs = require('fs');
const path = require('path');
const router = require('express').Router();

fs.readdirSync(__dirname).forEach(file => {
  if (file !== 'index.js' && file.endsWith('.routes.js')) {
    router.use(`/${file.replace('.routes.js', '')}`, require(path.join(__dirname, file)));
  }
});

module.exports = router;