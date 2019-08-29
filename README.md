# cucumber-selenium-browserstack
Node.js package to assist in the connection between cucumber BDD tests and BrowserStack.

https://www.npmjs.com/package/cucumber-selenium-browserstack

This project is meant to help people begin using Cucumber-style feature documents, and immediately be able to connect them using Selenium to BrowserStack. It requires some environment varaibles to work. I recommend using `dotenv` to manage these, but doing so is not required.

For a full description and example of how to use all the tools provided by this package, please visit https://github.com/luke80/cucumber-js-browserstack

## Installation

```
npm install cucumber-selenium-browserstack
```

## Example

Sample `features/support/world.js` file. Yours may include whatever world construction logic you need. The configuration and selenium driver are required to make the connections work. For more information about setting up a world for your tests to run, please refer to the help documentation for cucumber.
```js
require('dotenv').config();
var { setWorldConstructor } = require('cucumber');
var { scaffold } = require('cucumber-selenium-browserstack');

let configuration = require('../../conf/' + (process.env.CONFIG_FILE || 'default') + '.conf.js').config;
scaffold(configuration);

class TestingWorld {
  constructor(configuration) {
    this.config = configuration;
    this.driver = null;
  }
}

setWorldConstructor(TestingWorld.bind(null, [configuration]));

```

Sample `features/pages-load.feature` file. This is a cucumber formatted feature file. For more examples of how to use cucumber, please see the help documentation for cucumber.
```
Feature: Various important pages load
  In order to know the site is working
  As a user
  I want to see specific words on a few pages

  Scenario Outline: Pages contain words
    When I type in the path <Path>
    Then the page has the title <Copy>

    Examples:
      | Path                                      | Copy          |
      | /search/howsearchworks/                   | Google Search |
      | /search/howsearchworks/crawling-indexing/ | Google Search |
      | /search/howsearchworks/algorithms/        | Google Search |
      | /search/howsearchworks/responses/         | Google Search |

  Scenario: Can find search results
    When I type in the path /ncr
    Then I type "BrowserStack" into "Search the web"
    Then I click on "Google Search"
    Then the page has the title "BrowserStack - Google Search"

```

Sample `features/steps/request.js` file. This is an example of how to connect the feature to selenium and BrowserStack. Most of this is available to you without `cucumber-selenium-browserstack`. Pay specific attention to the constants loaded in the require statement on line 3 below. Also, the uses of them in the cucumber `Given`, `When`, and `Then`s.
```js
const { When, Then } = require("cucumber");
const assert = require('cucumber-assert');
const { addSelector, getElement, getPage, detectPageTitleMatch } = require('cucumber-selenium-browserstack');

addSelector(/^(Enter your .+?\.?)$/i, 'input[placeholder=\'%s\']');
addSelector(/^(Search the web\.?)$/i, 'input[name=\'q\']');
addSelector(/^Improve your Website\.?$/i, 'a[href$=\'test-my-site\']');
addSelector(/^(Test My Site\.?)$/i, 'button[value=\'%s\']');
addSelector(/^(Google Search)$/i, 'input[value=\'%s\']');
addSelector(/^(Is your site fast enough\?)$/i, { xpath: `//*[contains(text(), '%s')]` });

When(/^I type in the path ['"]?([^'"]+)['"]?$/i, async function (path) {
  await getPage(path, this.driver, this.config);
  if (!(await this.driver.getTitle())) {
    throw `Error retrieving the page at '${path}'`;
  }
});

When(/^I click on ['"]?(.+?)['"]?(?: and see ['"]?(.+?)['"]?$|$)/, async function (selectionDescription, confirmationDescription) {
  return await clickElement(selectionDescription, this.driver, confirmationDescription);
});

Then(/^the page has the title ['"]?(.+?)['"]?$/, async function (copy) {
  return await assert.notEqual(detectPageTitleMatch(copy, this.driver), true, `Expected the page to have title copy '${copy}', but did not.`);
});

Then(/^I type ['"]?(.+?)['"]? into ['"]?(.+?)['"]?$/, async function (typeString, selectionDescription) {
  let typing = await (await getElement(selectionDescription, this.driver, false)).sendKeys(typeString);
  await this.driver.takeScreenshot(true);
  return typing;
});

Then(/a new tab opens and I switch to it/i, async function () {
  let tabs = await this.driver.getAllWindowHandles();
  if (tabs.length > 1) {
    this.driver.switchTo().window(tabs[1]);
    return true;
  }
  return false;
});

```
