# mo-dx-plugin

A plugin for Salesforce DX CLI that provides ability to save Apex Classes, Apex Triggers, Visualforce Page, Visualforce Components and AuraBundle(Lightning Components) to Salesforce org (Scratch/Non-Scratch orgs) using Tooling API.

Plugin also provides a retrieve command that can retrieve metadata in salesforceDx source format from salesforce using unmanaged/managed package or changesets.

The commands in this plugin are used within the **_DX Code Companion extension_** (https://marketplace.visualstudio.com/items?itemName=MohithShrivastava.dx-code-companion).

If you are Visual Studio Code user then recommend installing the extension along with the  plugin to avoid having to remember the commands.

## Setup

### **Install as plugin (Recommended approach for Installing)**

 Install plugin using command : `sfdx plugins:install mo-dx-plugin`


### **Install from source(Preferred approach for debugging and enhancing the plugin)**
1. Install the SDFX CLI.

2. Clone the repository: `git clone git@github.com:msrivastav13/mo-dx-plugin.git`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link` .

### **Commands**

* [`sfdx retrieve:dxsource`](#sfdx-retrievedxsource)
* [`sfdx retrieve:pkgsource`](#sfdx-retrievepkgsource)
* [`sfdx deploy:apex`](#sfdx-deployapex)
* [`sfdx deploy:trigger`](#sfdx-deploytrigger)
* [`sfdx deploy:vf`](#sfdx-deployvf)
* [`sfdx deploy:vfcomponent`](#sfdx-deployvfcomponent)
* [`sfdx deploy:aura`](#sfdx-deployaura)
* [`sfdx deploy:lwc`](#sfdx-deploylwc)

## `sfdx retrieve:dxsource`

Retrieves soure code from Managed/Unmamaged package or Changesets.This command works for only Non-scratch orgs .If you are trying to convert a traditional project in Managed/Unmanaged package , this command can help convert the sourcecode to DX format.

```
USAGE
  $ sfdx retrieve:dxsource

OPTIONS
  -n, --packagename=packagename                   (required) the name of the package you want to retrieve.The package parameter value must be enclosed in double quotes.Example if you have a package named HR App the command would be sfdx retrieve:dxsource -n "HR App"

  -p, --pathname=pathname                         [default: force-app] where to convert the result to...defaults to
                                                  force-app

  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org

  -m, --retainmetadata                            provide a random string to retain the mdapiout folder that has source code in mdapi format

  --apiversion=apiversion                         override the api version used for api requests made by this command

  --json                                          format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLES
  $ sfdx retrieve:dxsource -n <package/changeset> // Default authorized org is used as username or org alias
  $ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>
```

_See code: [src/commands/retrieve/dxsource.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/retrieve/dxsource.ts)_

## `sfdx retrieve:pkgsource`

Retrieves soure code from Managed/Unmamaged package or Changesets.This command works for only Non-scratch orgs.This retrieves metadata in traditional source format.

```
USAGE
  $ sfdx retrieve:pkgsource

OPTIONS
  -n, --packagename=packagename                   (required) the name of the package you want to retrieve.The package parameter value must be enclosed in double quotes.Example if you have a package named HR App the command would be sfdx retrieve:pkgsource -n "HR App"

EXAMPLES
  $ sfdx retrieve:pkgsource -n <package/changeset> // Default authorized org is used as username or org alias
```

_See code: [src/commands/retrieve/pkgsource.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/retrieve/pkgsource.ts)_


## `sfdx deploy:apex`

Deploys apex code to the Salesforce Org using Tooling API.

```
USAGE
  $ sfdx deploy:apex

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the apex class you want to save to salesforce. Note you can run pwd command on terminal to obtain the path easily.

EXAMPLES
  $ sfdx deploy:apex -p pathname // Default authorized org is used for the deploy .The pathname parameter must be enclosed in double quotes. Example if your path is /Users/mohith/Desktop/ForceProjects/TestApp/force-app/main/default/classes/Constants.cls then the command to save this class will be sfdx deploy:apex -p "/Users/mohith/Desktop/ForceProjects/TestApp/force-app/main/default/classes/Constants.cls"
```

_See code: [src/commands/deploy/apex.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/apex.ts)_

## `sfdx deploy:trigger`

Deploys apex trigger code to the Salesforce Org using Tooling API.

```
USAGE
  $ sfdx deploy:trigger

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the apex trigger you want to save to salesforce. Note you can run pwd command on terminal to obtain the path easily

EXAMPLES
  $ sfdx deploy:trigger -p pathname // Default authorized org is used for the deploy
```

_See code: [src/commands/deploy/trigger.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/trigger.ts)_

## `sfdx deploy:vf`

Deploys visualforce page to the Salesforce Org using Tooling API.

```
USAGE
  $ sfdx deploy:vf

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the vf page you want to save to salesforce . Note you can run pwd command on terminal to obtain the path.

EXAMPLES
  $ sfdx deploy:vf -p pathname // Default authorized org is used for the deploy
```

_See code: [src/commands/deploy/vf.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/vf.ts)_

## `sfdx deploy:vfcomponent`

Deploys visualforce components to the Salesforce Org using Tooling API.

```
USAGE
  $ sfdx deploy:vfcomponent

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the vf component you want to save

EXAMPLES
  $ sfdx deploy:vfcomponent -p pathname // file path used to save the component to Salesforce.
```

_See code: [src/commands/deploy/vfcomponent.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/vfcomponent.ts)_

## `sfdx deploy:aura`

Deploys aura lightning bundle to the Salesforce Org using Tooling API.

Supports deploying whole aura bundle as well individual files .To deploy the AuraBundle provide the directory path in path(p) parameter

```
USAGE
  $ sfdx deploy:aura

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the aura bundle you want to save to Salesforce.

EXAMPLES
  $ sfdx deploy:aura -p pathname // Default authorized org is used for the deploy
```

_See code: [src/commands/deploy/aura.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/aura.ts)_

## `sfdx deploy:lwc`

Deploys lighnting web component bundle to the Salesforce Org using Tooling API.

Supports deploying lwc bundle as well individual files in lwc bundle .To deploy the Lightning Bundle as a whole provide the directory path in path(p) parameter

```
USAGE
  $ sfdx deploy:lwc

OPTIONS
  --p, --pathname=pathname                   (required) the file path of the lightning web components bundle you want to save to Salesforce.

EXAMPLES
  $ sfdx deploy:lwc -p pathname // Default authorized org is used for the deploy
```

_See code: [src/commands/deploy/lwc.ts](https://github.com/msrivastav13/mo-dx-plugin/blob/master/src/commands/deploy/lwc.ts)_

### Important Note When Using these Commands With Non-Scratch Org

**These commands do not maintain history and files are overriden on server .Make sure you have source control for the project setup so you do not loose anything**
