# sfdx-retrieve:dxsource plugin

A plugin for Salesforce DX CLI that retrieves metadata from unmanaged package/changeset and creates a package.xml manifest and converts source code to SalesforceDX format.

## Setup
### Install as plugin
1. Install plugin: `sfdx plugins:install mo-dx-plugin`


### Install from source
1. Install the SDFX CLI.

2. Clone the repository: `git clone git@github.com:msrivastav13/mo-dx-plugin.git`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link` .

```
USAGE
  $ sfdx retrieve:dxsource

OPTIONS
  -n, --packagename=packagename                   (required) the name of the package you want to retrieve

  -p, --pathname=pathname                         [default: force-app] where to convert the result to...defaults to
                                                  force-app

  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org

  --apiversion=apiversion                         override the api version used for api requests made by this command

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>
```

_See code: [src/commands/retrieve/dxsource.ts](https://github.com/ForceProjects/mo-dx-plugin/blob/v0.0.1/src/commands/retrieve/dxsource.ts)_
