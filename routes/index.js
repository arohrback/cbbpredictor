var express = require('express');
var router = express.Router();
const fs = require("fs").promises;
const Parser = require("../parser");
const Scraper = require("../scraper");

let teamsFile = 'data/teams.json';
let pageTitle = 'KenPom Predictor';

const sigma = 10.25;

const resultsFileExists = () => {
  return fs.stat(teamsFile)
    .then(stats => {
      return stats.isFile();
    })
    .catch(err => {
      if (err.code === 'ENOENT') {
        return false;
      } else {
        throw err;
      }
    });
}

const readResultsFile = () => {
  return fs.readFile(teamsFile).then( (data) => {
    return JSON.parse(data);
  });
}

const getData = async (force = false) => {
  return resultsFileExists().then( exists => {
    if (!exists || force) {
      // if not then download it
      return Scraper.scrapeData().then( returnData => {
        // Save the data to the server-side JSON file for later retrieval
        // without slamming the website.
        let json = JSON.stringify(returnData);
        return fs.writeFile(teamsFile, json).then( writeRes => {
          return readResultsFile();
        });
      });
    }
    return readResultsFile();
  });
}

const getTeams = (data) => {
  return data.teams.map(t => t.team);
}

const erf = (x) => {
  // https://stackoverflow.com/questions/1906064/gauss-error-function-implementation-for-javascript
  var z;
  const ERF_A = 0.147;
  var the_sign_of_x;
  if(0==x) {
      the_sign_of_x = 0;
      return 0;
  } else if(x>0){
      the_sign_of_x = 1;
  } else {
      the_sign_of_x = -1;
  }

  var one_plus_axsqrd = 1 + ERF_A * x * x;
  var four_ovr_pi_etc = 4/Math.PI + ERF_A * x * x;
  var ratio = four_ovr_pi_etc / one_plus_axsqrd;
  ratio *= x * -x;
  var expofun = Math.exp(ratio);
  var radical = Math.sqrt(1-expofun);
  z = radical * the_sign_of_x;
  return z;
}

const chanceToWin = (score, opp) => {
  let margin = score - opp;
  let denominator = sigma * Math.sqrt(2);
  return (50 * (1 + erf(margin / denominator))).toFixed(2);
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  getData().then( results => {
    res.render('index', {
      title: pageTitle,
      scrapeDate: results.scrapeDate,
      scrapeSite: results.scrapeSite,
      teams: getTeams(results)
    });
  });
});

router.get('/teamData/:teamId', async function(req, res, next) {
  getData().then( data => {
    res.render('teamData', data.teams[req.params.teamId], function(err, html) {
      if (err) {
        throw new Error(`teamData could not be rendered because ${err.message}`);
      } else {
        res.status(200).send({ team: data.teams[req.params.teamId], rendered: html });
      }
    });
  });
})

router.get('/refreshData', async function(req, res, next) {
  getData(true).then( data => {
    res.render('metadata', { scrapeDate: data.scrapeDate, scrapeSite: data.scrapeSite }, function(err, html) {
      if (err) {
        throw new Error(`metadata could not be rendered because ${err.message}`);
      } else {
        res.status(200).send({ success: 1, html: html, teams: data.teams });
      }
    });
  });
});

router.get('/teamList', async function(req, res, next) {
  getData().then( data => {
    res.render('teamlist', { teams: getTeams(data) }, function(err, html) {
      if (err) {
        throw new Error(`metadata could not be rendered because ${err.message}`);
      } else {
        res.status(200).send({ html: html, teams: getTeams(data) });
      }
    })
  })
});

router.get('/predict/:teamA/:teamB/:site', async function(req, res, next) {
  getData().then( data => {
    let teamA = data.teams[req.params.teamA];
    let teamB = data.teams[req.params.teamB];
    let averageTeam = data.averageTeam;
    let site = req.params.site;
    let expectedT = teamA.adjT.val * teamB.adjT.val / averageTeam.tempo;
    if (site == 'home') { // adjust for A at home
      teamAO = teamA.adjO.val * 1.014;
      teamAD = teamA.adjD.val * 0.986;
      teamBO = teamB.adjO.val * 0.986;
      teamBD = teamB.adjD.val * 1.014;
    } else if (site == 'road') { // adjust for B at home
      teamAO = teamA.adjO.val * 0.986;
      teamAD = teamA.adjD.val * 1.014;
      teamBO = teamB.adjO.val * 1.014;
      teamBD = teamB.adjD.val * 0.986;
    } else {
      teamAO = teamA.adjO.val;
      teamAD = teamA.adjD.val;
      teamBO = teamB.adjO.val;
      teamBD = teamB.adjD.val;
    }
    let teamAper = teamAO * teamBD / averageTeam.offense;
    let teamBper = teamAD * teamBO / averageTeam.offense;
    let prediction = {
      adjO: teamAO,
      adjD: teamAD,
      score: teamAper * expectedT / 100,
      margin: (teamAper - teamBper) * expectedT / 100,
      site: site,
      prob: chanceToWin(teamAper * expectedT / 100, teamBper * expectedT / 100)
    };
    res.render('prediction', prediction, function(err, html) {
      if (err) {
        throw new Error(`prediction failed because ${err.message}`);
      } else {
        res.status(200).send({ prediction: prediction, rendered: html })
      }
    });
  });
});

module.exports = router;
