const { BeforeAll, Before, After, AfterAll, setDefaultTimeout } = require('cucumber');
const { Builder, logging } = require('selenium-webdriver');
const { Local } = require('browserstack-local');

module.exports = {
  scaffold: function (configuration) {
    logging.installConsoleHandler();
    logging.getLogger('promise.ControlFlow').setLevel(logging.Level.ALL);

    BeforeAll(async () => {
      let config = configuration; //require('../conf/' + (process.env.CONFIG_FILE || 'default') + '.conf.js').config;
      detectEnvironmentProblems(!config.singleSession);
      if (config.capabilities[parseInt(process.env.TASK_ID || 0)]["browserstack.local"]) {
        // Code to start browserstack local before start of test and stop browserstack local after end of test
        global.bsLocal = new Local();
        let localConfig = {
          'key': process.env.BROWSERSTACK_ACCESS_KEY,
          'verbose': 'true'
        };
        if (config.proxy && config.proxy !== 'undefined') {
          var proxyPieces = config.proxy.match(/\w+\:\/\/([\w\.-]+)(?:\:(\d+))?/);
          if (proxyPieces) {
            if (proxyPieces.length > 1) {
              localConfig.proxyHost = proxyPieces[1];
            }
            if (proxyPieces.length > 2) {
              localConfig.proxyPort = proxyPieces[2];
            }
          }
          else {
            console.warn('Proxy configuration not parsed.');
          }
        }
        return await new Promise(async (resolve, reject) => {
          global.bsLocal.start(localConfig, async function (error) {
            if (error) {
              //throw 'Failed to create a local tunnel.';
              return reject(error);
            }
            if (config.singleSession) {
              global.driver = await global.createBrowserStackSession();
              return await resolve();
            }
          });
        });
      }
      else {
        if (config.singleSession) {
          global.driver = await global.createBrowserStackSession();
          await global.driver.manage().window().maximize();
          return await global.driver;
        }
      }
    });

    Before(async function (scenario) {
      if (process.env.BROWSERSTACK_USERNAME === '' || process.env.BROWSERSTACK_ACCESS_KEY === '') {
        return 'skipped';
      }
      if (!this.config.singleSession) {
        let name = scenario.pickle.name + ' - ' + scenario.sourceLocation.uri + ' - line ' + scenario.sourceLocation.line;
        this.driver = await global.createBrowserStackSession(name);
        await this.driver.manage().window().maximize();
        return await this.driver;
      }
      else {
        this.driver = global.driver;
        return await this.driver;
      }
    });

    After(async function (scenario) {
      let world = this;
      if (scenario.result) {
        if (scenario.result.status === 'failed' && this.driver) {
          await this.driver.takeScreenshot();
        }
      }
      if (this.driver) {
        await this.driver.sleep(2000).then(async () => {
          if (!world.config.singleSession) {
            world.driver.session_.then(function (sessionData) {
              console.log('\nBrowserStack Session Complete:', sessionData.id_);
              //console.log('\nSee the resulting build record on BrowserStack:', `https://automate.browserstack.com/builds/${process.env.BUILD_ID}/sessions/${sessionData.id_}`);
            });
            await this.driver.takeScreenshot();
            return await world.driver.quit();
          }
        });
      }
    });

    AfterAll(async () => {
      if (global.driver) {
        global.driver.session_.then(function (sessionData) {
          console.log('\nBrowserStack Session Complete:', sessionData.id_);
          //console.log('\nSee the resulting build record on BrowserStack:', `https://automate.browserstack.com/builds/${process.env.BUILD_ID}/sessions/${sessionData.id_}`);
        });
        return await global.driver.quit().then(async () => {
          if (global.bsLocal) {
            await global.bsLocal.stop(async () => { return await Promise.resolve(); });
          }
        });
      }
    });

    global.createBrowserStackSession = async function (name) {
      let b = new Builder();
      let config = configuration; //require('../conf/' + (process.env.CONFIG_FILE || 'default') + '.conf.js').config;
      let task = parseInt(process.env.TASK_ID || 0);
      let proxy = (config.proxy && config.proxy != 'undefined') ? config.proxy : process.env.PROXY;
      config.capabilities[task]['browserstack.user'] = process.env.BROWSERSTACK_USERNAME;
      config.capabilities[task]['browserstack.key'] = process.env.BROWSERSTACK_ACCESS_KEY;
      if (name) {
        config.capabilities[task].name = name;
      }
      if (proxy) {
        b.usingWebDriverProxy(proxy);
      }
      return await b.usingServer('http://hub-cloud.browserstack.com/wd/hub')
        .withCapabilities(config.capabilities[task])
        .build();
    };

    detectEnvironmentProblems = function () {
      let credentialsMissing = (!process.env.BROWSERSTACK_USERNAME || !process.env.BROWSERSTACK_ACCESS_KEY);
      let promiseManagerNotDisabled = (!process.env.SELENIUM_PROMISE_MANAGER);
      let problems = (credentialsMissing || promiseManagerNotDisabled);
      if (problems) {
        throw 'Environment configuration error detected. Please verify you have your credentials stored in BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY. Also ensure you\'ve disabled the promise manager with SELENIUM_PROMISE_MANAGER=0';
      }
      return false;
    };

    let timeoutSeconds = 30;
    setDefaultTimeout(timeoutSeconds * 1000);
  }
};