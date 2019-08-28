let { scaffold } = require('./scaffold.js');

module.exports = {
  scaffold: scaffold,
  addSelector: function (pattern, selector = null) {
    global.selectorMap = global.selectorMap || [];
    if (pattern instanceof String) {
      pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (pattern instanceof RegExp && typeof selector === 'string') {
      global.selectorMap.push({ pattern: pattern, selector: {css:selector}});
    }
    else if (pattern instanceof RegExp && typeof selector === 'object') {
      global.selectorMap.push({ pattern: pattern, selector: selector});
    }
    else {
      console.warn('Did not add selector. The format looks bad.');
      throw 'Invalid selector configuration. Please fix it before running the test.';
    }
  },
  getSelectorFromDescription: function (description) {
    const selectorMap = global.selectorMap || [{
      pattern: /the login button\.?/i,
      selector: {css:'button.login'}
    }, {
      pattern: /the logout button\.?/i,
      selector: {css:'button.logout'}
    }];
    let selector;
    for (let mapItem of selectorMap) {
      if (mapItem.pattern instanceof RegExp && (m = mapItem.pattern.exec(description)) !== null) {
        /* jshint -W083 */
        let i = 1;
        let selectorKey = Object.keys(mapItem.selector)[0];
        let selectorText = mapItem.selector[selectorKey].replace(/%s/g, () => m[i++]); // This potentially confusing syntax iteratively replaces %s with matched groups within the pattern regexp.
        /* jshint +W083 */
        selector = {};
        selector[selectorKey] = selectorText;
        return selector;
      }
    }
    if (!selector) {
      throw `Invalid selector configured for description ${description}. Make sure you add a valid match using addSelector`;
    }
    return selector;
  },
  detectElementWithSelector: async function (selector, driver) {
    let elements = await driver.findElements(selector);
    return !!elements.length;
  },
  getElementWithSelector: async function (selector, driver, takeScreenshot=true) {
    if (await module.exports.detectElementWithSelector(selector, driver)) {
      let element = await driver.findElement(selector);
      if (takeScreenshot) {
        await driver.takeScreenshot(true);
      }
      return element;
    }
    else {
      throw `Selector found no element; '${selector}'`;
    }
  },
  getElement: async function (selectorDescription, driver, takeScreenshot=true) {
    return await module.exports.getElementWithSelector(await module.exports.getSelectorFromDescription(selectorDescription), driver, takeScreenshot);
  },
  clickElement: async function (selectorDescription, driver, successSelector=null, takeScreenshot=true) {
    let element = await module.exports.getElement(selectorDescription, driver, false);
    if (successSelector !== null) {
      let test = !(await element.click().then(async () => {
        return await driver.wait(async function() {
          let selector = await module.exports.getSelectorFromDescription(successSelector);
          let element = await module.exports.getElementWithSelector(selector, driver, false);
          return (!!element && element.isDisplayed());
        }, 5000);
      }));
      if (takeScreenshot) {
        await driver.takeScreenshot(true);
      }
      return test;
    }
    else {
      let click = await element.click();
      if (takeScreenshot) {
        await driver.takeScreenshot(true);
      }
      return click;
    }
  },
  detectPageSourceMatch: async function (copy, driver) {
    let test = !(await driver.wait(async function() {
      return await driver.getPageSource().then(function(source) {
        return source.indexOf(copy) > -1;
      });
    }, 5000));
    return test;
  },
  detectPageTitleMatch: async function (copy, driver, returnTitle=false) {
    let t = null;
    let test = !(await driver.wait(function() {
      return driver.getTitle().then(function(title) {
        t = title;
        return title.indexOf(copy) > -1;
      });
    }, 5000));
    return (!returnTitle) ? test : t;
  },
  getPageTitle: async function (driver, expectedTitle = null) {
    let t = null;
    if (expectedTitle) {
      await driver.wait(function() {
        return driver.getTitle().then(function(title) {
          t = title;
          return title.indexOf(expectedTitle) > -1;
        });
      }, 5000);
    }
    else {
      t = await driver.getTitle();
    }
    return t;
  },
  getPage: async function(path, driver, config) {
    const protocol = config.protocol || process.env.TESTING_PROTOCOL || 'https://';
    const host = (config.host || process.env.TESTING_HOST).replace(/(?:^https?:\/\/|[\/\\]$)/, '');
    let page = await driver.get(protocol + host + path);
    await driver.takeScreenshot();
    return page;
  }
};
