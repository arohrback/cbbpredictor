const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs").promises;

const siteUrl = "https://kenpom.com/index.php";

const fetchData = async () => {
  const result = await axios.get(siteUrl);
  return cheerio.load(result.data);
};

const scrapeData = async () => {
  let teams = [];
  const $ = await fetchData();
  let headers = [];
  $('table#ratings-table thead:first-of-type tr').each((index, element) => {
    headers[index] = [];
    var colIndex = 0;
    $(element).find('th').each((headerIndex, headerElement) => {
      let colSpan = parseInt($(headerElement).attr('colspan')) || 1;
      for (let spanIndex = colIndex;spanIndex<colIndex+colSpan;spanIndex++) {
        headers[index][spanIndex] = $(headerElement).text() == '' ? null : camelCase($(headerElement).text());
      }
      colIndex += colSpan;
    });
  });
  while (headers.length > 1) {
    let bottomHeader = headers.pop();
    bottomHeader.forEach((element, index) => {
      headers[headers.length-1][index] = headers[headers.length-1][index] ? headers[headers.length-1][index] + '::' + element : element;
    });
  }
  headers = headers.pop();
  headers.forEach((element, index) => {
    if (element == headers[index-1]) {
      headers[index-1] = headers[index-1] + '::val';
      headers[index] = headers[index] + '::rk';
    }
  })
  $('table#ratings-table tbody tr').each((index, row) => {
    var teamObj = {};
    headers.forEach((element, headerIndex) => {
      let myValue = $(row).find('td:nth-of-type(' + (headerIndex+1) + ')').text();
      if (!isNaN(myValue)) {
        myValue = myValue * 1;
      }
      let params = element.split('::');
      params.reduce((obj, i, idx, src) => {
        if (!obj.hasOwnProperty(i)) {
          obj[i] = (idx == src.length - 1 ? myValue : {});
        }
        return obj[i];
      }, teamObj);
    })
    teams.push(teamObj);
  });
  teams.sort((a, b) => {
    if (a.rk == b.rk) {
      return 0;
    }
    return a.rk > b.rk ? 1 : -1;
  });
  return {
    scrapeDate: Date.now(),
    scrapeSite: siteUrl,
    teams: teams,
    averageTeam: {
      offense: teams.map(tm => tm.adjO.val).reduce(totaller) / teams.length,
      defense: teams.map(tm => tm.adjD.val).reduce(totaller) / teams.length,
      tempo: teams.map(tm => tm.adjT.val).reduce(totaller) / teams.length,
    }
  }
}

/**
 * accumulator function
 */
const totaller = function(acc, cur) {
  return acc + cur;
}
/**
 * "Safer" String.toLowerCase()
 */
const lowerCase = function(str) {
  return str.toLowerCase();
}

/**
 * "Safer" String.toUpperCase()
 */
const upperCase = function(str) {
  return str.toUpperCase();
}

/**
 * Remove non-word chars.
 */
const removeNonWord = function(str) {
  return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, "");
}

/**
 * Replaces all accented chars with regular ones
 */
const replaceAccents = function(str) {
  // verifies if the String has accents and replace them
  if (str.search(/[\xC0-\xFF]/g) > -1) {
    str = str
      .replace(/[\xC0-\xC5]/g, "A")
      .replace(/[\xC6]/g, "AE")
      .replace(/[\xC7]/g, "C")
      .replace(/[\xC8-\xCB]/g, "E")
      .replace(/[\xCC-\xCF]/g, "I")
      .replace(/[\xD0]/g, "D")
      .replace(/[\xD1]/g, "N")
      .replace(/[\xD2-\xD6\xD8]/g, "O")
      .replace(/[\xD9-\xDC]/g, "U")
      .replace(/[\xDD]/g, "Y")
      .replace(/[\xDE]/g, "P")
      .replace(/[\xE0-\xE5]/g, "a")
      .replace(/[\xE6]/g, "ae")
      .replace(/[\xE7]/g, "c")
      .replace(/[\xE8-\xEB]/g, "e")
      .replace(/[\xEC-\xEF]/g, "i")
      .replace(/[\xF1]/g, "n")
      .replace(/[\xF2-\xF6\xF8]/g, "o")
      .replace(/[\xF9-\xFC]/g, "u")
      .replace(/[\xFE]/g, "p")
      .replace(/[\xFD\xFF]/g, "y");
  }

  return str;
}

/**
 * Convert string to camelCase text.
 */
const camelCase = function(str) {
  str = replaceAccents(str);
  str = removeNonWord(str)
    .replace(/\-/g, " ") //convert all hyphens to spaces
    .replace(/\s[a-z]/g, upperCase) //convert first char of each word to UPPERCASE
    .replace(/\s+/g, "") //remove spaces
    .replace(/^[A-Z]/g, lowerCase); //convert first char to lowercase
  str = str.length < 3 ? lowerCase(str) : str;
  return str;
}

module.exports = {
  scrapeData: scrapeData
}
