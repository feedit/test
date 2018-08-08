'use strict';

const fs = require('fs');
const path = require('path');
const xutil = require('xutil');
const request = require('request');
const xml2map = require('xml2map');
const Render = require('microtemplate').render;
const translate = require('google-translate-api');

const templateFile = path.join(__dirname, 'template.html');
const template = fs.readFileSync(templateFile, 'utf8');

const pkg = require('../package');

const _ = xutil.merge({}, xutil);

_.sleep = second => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, second || 1000);
  });
};

_.requestXML = async url => {
  const options = {
    url,
    headers: {
      'User-Agent': 'request',
    },
  };

  const xml = await new Promise(resolve => {
    request(options, (error, response, body) => {
      resolve(body);
    });
  });
  return xml2map.tojson(xml);
};

_.translateNode = async $ => {
  const list = [ 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ];
  for (let i = 0; i < list.length; i++) {
    const tags = $(list[i]);
    for (let j = 0; j < tags.length; j++) {
      const node = $(tags[j]);
      const content = node.text().trim();
      let text = '';
      if (content && content.length > 100) {
        try {
          await _.sleep(5000);
          text = (await translate(content, {
            from: 'en',
            to: 'zh-CN',
          })).text;
          console.log(text);
        } catch (e) {
          console.log(e.stack);
        }
        node.html(`
          <div class="feedit-item">
            <span>${text}</span>
            <span class="feedit-en">${content}</span>
          </div>
        `);
      }
    }
  }
  return $;
};

_.beautify = ($, options) => {
  const body = $('body').html();
  return Render(template, {
    ...options,
    content: body,
  }, {
    tagOpen: '<#',
    tagClose: '#>',
  });
};

_.archiveToDir = options => {
  const {
    HOME,
    FEEDIT_ROOT,
  } = process.env;
  const distPath = path.join(FEEDIT_ROOT || HOME, pkg.name, options.siteId, options.title);
  _.mkdir(distPath);
  const file = path.join(distPath, 'index.html');
  fs.writeFileSync(file, options.html);
  console.log(file);
};

module.exports = _;