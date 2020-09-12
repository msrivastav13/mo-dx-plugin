import { core, flags, SfdxCommand } from "@salesforce/command";
import { AnyJson } from "@salesforce/ts-types";
import * as AdmZip from "adm-zip";
import * as chalk from 'chalk';
import fs = require("fs-extra");
import * as Mime from "mime-types";
import { displaylog } from "../../service/displayError";
import { getNameSpacePrefix } from "../../service/getNamespacePrefix";

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages("mo-dx-plugin", "org");

export default class StaticResourceDeploy extends SfdxCommand {
  public static description = messages.getMessage("staticresourceDeploy");

  public static examples = [
    "$ sfdx deploy:staticresource -p <filepath>",
    "$ sfdx deploy:staticresource -p <filepath> --cachecontrol public",
    "$ sfdx deploy:staticresource -p <filepath> --cachecontrol public --resourcefolder <name of the folder where you have single page app>"
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.string({
      char: "p",
      description: "file path of the resource bundle"
    }),
    resourcefolder: flags.string({
      char: "r",
      description:
        "name of the folder where you have single page app, This defaults to staticresources",
      default: "staticresources"
    }),
    cachecontrol: flags.string({
      char: "c",
      description: "cache control, defaults to public",
      default: "private"
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<AnyJson> {
    this.ux.startSpinner(chalk.bold.yellowBright("Saving"));
    this.startTime = new Date().getTime();

    const conn = this.org.getConnection();

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
      const resourcepath = this.flags.filepath
        .split(this.flags.resourcefolder + "/")
        .pop();
      const folderorfilename = resourcepath.split("/")[0];
      let staticResourceName: string;
      let contentType: string | boolean;
      let body: string;

      staticResourceName = folderorfilename.split(".")[0];
      // check if resource is bundled or individual file with extension
      if (folderorfilename === staticResourceName) {
        // zip the resource and get the body as archive
        const resourcebundlepath = this.flags.filepath.slice(
          0,
          this.flags.filepath.indexOf(this.flags.resourcefolder)
        );
        const zipper = new AdmZip();
        zipper.addLocalFolder(
          resourcebundlepath +
            "/" +
            this.flags.resourcefolder +
            "/" +
            staticResourceName
        );
        body = zipper.toBuffer().toString("base64");
        contentType = "application/zip";
      } else {
        body = await fs.readFile(this.flags.filepath, "utf8");
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
        staticresource.CacheControl = this.flags.cachecontrol;
        staticresource.Name = staticResourceName;
        await conn.tooling.sobject("StaticResource").create(staticresource);
      }
      this.endTime = new Date().getTime();
      const executionTime = (this.endTime - this.startTime) / 1000;
      this.ux.stopSpinner(
        chalk.bold.greenBright(`StaticResource Deployed Successfully ✔.Command execution time: ${executionTime} seconds`)
      );
    } catch (e) {
      this.ux.stopSpinner(
        chalk.bold.redBright("Static Resource Save Failed ✖")
      );
      displaylog(e, this.ux);
    }

    return "{}";
  }
}
