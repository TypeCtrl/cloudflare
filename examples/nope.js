var cloudscraper = require('cloudscraper');

cloudscraper.post('https://www.digbt.org/search/ubuntu/?u=y').then(console.log, console.error);
