import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import AdmZip from "adm-zip";
import chalk from 'chalk';
import fs from "fs-extra";
import Mime from "mime-types";
import { displaylog } from "../../service/displayError.js";
import { getNameSpacePrefix } from "../../service/getNamespacePrefix.js";

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages("mo-dx-plugin", "org");

export default class StaticResourceDeploy extends SfCommand<any> {
  public static description = messages.getMessage("staticresourceDeploy");

  public static examples = [
    "$ sfdx deploy:staticresource -p <filepath>",
    "$ sfdx deploy:staticresource -p <filepath> --cachecontrol public",
    "$ sfdx deploy:staticresource -p <filepath> --cachecontrol public --resourcefolder <name of the folder where you have single page app>"
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    filepath: Flags.string({
      char: "p",
      description: "file path of the resource bundle"
    }),
    resourcefolder: Flags.string({
      char: "r",
      description:
        "name of the folder where you have single page app, This defaults to staticresources",
      default: "staticresources"
    }),
    cachecontrol: Flags.string({
      char: "c",
      description: "cache control, defaults to public",
      default: "private"
    })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<any> {
    const { flags } = await this.parse(StaticResourceDeploy);

    this.spinner.start(chalk.bold.yellowBright("Saving"));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const namespacePrefix = await getNameSpacePrefix(conn);

    interface StaticResource {
      Body: string;
      Id: string;
      ContentType: string;
      CacheControl: string;
      Name: string;
    }

    try {
      // find the depth of the file from static Resource folder
      const resourcepath = flags.filepath
        .split(flags.resourcefolder + "/")
        .pop();
      const folderorfilename = resourcepath.split("/")[0];
      let staticResourceName: string;
      let contentType: string | boolean;
      let body: string;

      staticResourceName = folderorfilename.split(".")[0];
      // check if resource is bundled or individual file with extension
      if (folderorfilename === staticResourceName) {
        // zip the resource and get the body as archive
        const resourcebundlepath = flags.filepath.slice(
          0,
          flags.filepath.indexOf(flags.resourcefolder)
        );
        const zipper = new AdmZip();
        zipper.addLocalFolder(
          resourcebundlepath +
            "/" +
            flags.resourcefolder +
            "/" +
            staticResourceName
        );
        body = zipper.toBuffer().toString("base64");
        contentType = "application/zip";
      } else {
        body = await fs.readFile(flags.filepath, "utf8");
        const buff = Buffer.alloc(body.length, body);
        body = buff.toString("base64");
        contentType = Mime.lookup(folderorfilename.split(".")[1]);
        if (contentType === false) {
          contentType = "application/octet-stream";
        }
      }

      // check if static resource already exists
      const staticResources = (await conn.tooling
        .sobject("StaticResource")
        .find({
          Name: staticResourceName,
          NameSpacePrefix: namespacePrefix
        })) as StaticResource[];

      if (staticResources.length > 0) {
        const staticresourceToUpdate = {} as StaticResource;
        staticresourceToUpdate.Id = staticResources[0].Id;
        staticresourceToUpdate.Body = body;
        await conn.tooling
          .sobject("StaticResource")
          .update(staticresourceToUpdate);
      } else {
        // Create a new Static Resource
        const staticresource = {} as StaticResource;
        staticresource.Body = body;
        staticresource.ContentType = contentType;
        staticresource.CacheControl = flags.cachecontrol;
        staticresource.Name = staticResourceName;
        await conn.tooling.sobject("StaticResource").create(staticresource);
      }
      this.endTime = new Date().getTime();
      const executionTime = (this.endTime - this.startTime) / 1000;
      this.spinner.stop(
        chalk.bold.greenBright(`StaticResource Deployed Successfully ✔.Command execution time: ${executionTime} seconds`)
      );
    } catch (e) {
      this.spinner.stop(
        chalk.bold.redBright("Static Resource Save Failed ✖")
      );
      displaylog(String(e), this);
    }

    return "{}";
  }
}
