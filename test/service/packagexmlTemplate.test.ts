import { expect } from 'chai';
import { PackageXmlTemplate } from '../../src/service/packagexmlbuilder/packagexmlTemplate.js';

describe('PackageXmlTemplate', () => {

  describe('createHeader', () => {
    it('generates valid XML header with Package element', () => {
      const header = PackageXmlTemplate.createHeader();
      expect(header).to.contain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(header).to.contain('<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
    });
  });

  describe('createFooter', () => {
    it('generates version tag and closing Package element', () => {
      const footer = PackageXmlTemplate.createFooter('55.0');
      expect(footer).to.contain('<version>55.0</version>');
      expect(footer).to.contain('</Package>');
    });
  });

  describe('startType / endType', () => {
    it('generates opening types tag', () => {
      expect(PackageXmlTemplate.startType()).to.contain('<types>');
    });

    it('generates closing types tag', () => {
      expect(PackageXmlTemplate.endType()).to.contain('</types>');
    });
  });

  describe('nameTag', () => {
    it('wraps metadata type in name tags', () => {
      const result = PackageXmlTemplate.nameTag('ApexClass');
      expect(result).to.contain('<name>ApexClass</name>');
    });
  });

  describe('createMember', () => {
    it('wraps member name in members tags', () => {
      const result = PackageXmlTemplate.createMember('MyClass');
      expect(result).to.contain('<members>MyClass</members>');
    });
  });

  describe('full package.xml assembly', () => {
    it('produces a valid package.xml structure', () => {
      let xml = PackageXmlTemplate.createHeader();
      xml += PackageXmlTemplate.startType();
      xml += PackageXmlTemplate.createMember('MyClass');
      xml += PackageXmlTemplate.nameTag('ApexClass');
      xml += PackageXmlTemplate.endType();
      xml += PackageXmlTemplate.createFooter('55.0');

      expect(xml).to.contain('<?xml version="1.0"');
      expect(xml).to.contain('<members>MyClass</members>');
      expect(xml).to.contain('<name>ApexClass</name>');
      expect(xml).to.contain('<version>55.0</version>');
      expect(xml).to.contain('</Package>');
    });
  });
});
