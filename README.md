mo-dx-plugin
============



[![Version](https://img.shields.io/npm/v/mo-dx-plugin.svg)](https://npmjs.org/package/mo-dx-plugin)
[![CircleCI](https://circleci.com/gh/ForceProjects/mo-dx-plugin/tree/master.svg?style=shield)](https://circleci.com/gh/ForceProjects/mo-dx-plugin/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/ForceProjects/mo-dx-plugin?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/mo-dx-plugin/branch/master)
[![Codecov](https://codecov.io/gh/ForceProjects/mo-dx-plugin/branch/master/graph/badge.svg)](https://codecov.io/gh/ForceProjects/mo-dx-plugin)
[![Greenkeeper](https://badges.greenkeeper.io/ForceProjects/mo-dx-plugin.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/ForceProjects/mo-dx-plugin/badge.svg)](https://snyk.io/test/github/ForceProjects/mo-dx-plugin)
[![Downloads/week](https://img.shields.io/npm/dw/mo-dx-plugin.svg)](https://npmjs.org/package/mo-dx-plugin)
[![License](https://img.shields.io/npm/l/mo-dx-plugin.svg)](https://github.com/ForceProjects/mo-dx-plugin/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g mo-dx-plugin
$ mo-dx-plugin COMMAND
running command...
$ mo-dx-plugin (-v|--version|version)
mo-dx-plugin/0.0.0 darwin-x64 node-v8.9.4
$ mo-dx-plugin --help [COMMAND]
USAGE
  $ mo-dx-plugin COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`mo-dx-plugin hello:org [FILE]`](#mo-dx-plugin-helloorg-file)
* [`mo-dx-plugin retrieve:dxsource`](#mo-dx-plugin-retrievedxsource)

## `mo-dx-plugin hello:org [FILE]`

Prints a greeting and your org id(s)!

```
USAGE
  $ mo-dx-plugin hello:org [FILE]

OPTIONS
  -f, --force                                      example boolean flag
  -n, --name=name                                  name to print
  -u, --targetusername=targetusername              username or alias for the target org; overrides default target org
  -v, --targetdevhubusername=targetdevhubusername  username or alias for the dev hub org; overrides default dev hub org
  --apiversion=apiversion                          override the api version used for api requests made by this command
  --json                                           format output as json
  --loglevel=(trace|debug|info|warn|error|fatal)   logging level for this command invocation

EXAMPLES
  $ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
     Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
     My hub org id is: 00Dxx000000001234
  
  $ sfdx hello:org --name myname --targetusername myOrg@example.com
     Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
```

_See code: [src/commands/hello/org.ts](https://github.com/ForceProjects/mo-dx-plugin/blob/v0.0.0/src/commands/hello/org.ts)_

## `mo-dx-plugin retrieve:dxsource`

Prints a greeting and your org id(s)!

```
USAGE
  $ mo-dx-plugin retrieve:dxsource

OPTIONS
  -n, --packagename=packagename                   (required) the name of the package you want to retrieve

  -p, --pathname=pathname                         [default: force-app] where to convert the result to...defaults to
                                                  force-app

  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org

  --apiversion=apiversion                         override the api version used for api requests made by this command

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <pathName>
```

_See code: [src/commands/retrieve/dxsource.ts](https://github.com/ForceProjects/mo-dx-plugin/blob/v0.0.0/src/commands/retrieve/dxsource.ts)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->
# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `hello:org` command: 
1. Start the inspector
  
If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch: 
```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```
  
Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:
```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run hello:org -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program. 
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
<br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
Congrats, you are debugging!
