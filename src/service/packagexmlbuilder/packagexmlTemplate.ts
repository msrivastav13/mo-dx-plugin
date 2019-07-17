export class PackageXmlTemplate {

    public static createHeader(): string {
      let header = '<?xml version="1.0" encoding="UTF-8"?>\n';
      header = header + '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
      return header;
    }

    public static createFooter(version: string): string {
      let footer = '  <version>' + version + '</version>\n';
      footer = footer + '</Package>\n';
      return footer;
    }

    public static startType(): string {
      return '  <types>\n';
    }

    public static endType(): string {
      return '  </types>\n';
    }

    public static nameTag(metadataType: string): string {
      return '    <name>' + metadataType + '</name>\n';
    }

    public static createMember(member: string): string {
      return '    <members>' + member + '</members>\n';
    }

}
