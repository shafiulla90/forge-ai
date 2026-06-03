import JSZip from 'jszip';

/**
 * Builds a zip file for Apex Class Metadata API deployment
 */
export async function buildApexZip(className: string, body: string): Promise<Buffer> {
  const zip = new JSZip();
  
  // 1. Add the .cls file
  zip.file(`classes/${className}.cls`, body);
  
  // 2. Add the .cls-meta.xml file
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <status>Active</status>
</ApexClass>`;
  zip.file(`classes/${className}.cls-meta.xml`, metaXml);
  
  // 3. Add package.xml
  const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${className}</members>
        <name>ApexClass</name>
    </types>
    <version>60.0</version>
</Package>`;
  zip.file('package.xml', packageXml);

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Interface for Tooling API Compile Error
 */
export interface CompileError {
  line: number;
  column: number;
  problem: string;
}

/**
 * Formats Salesforce Tooling API errors into a standard format
 */
export function formatCompileErrors(result: any): CompileError[] {
  if (result.success) return [];
  
  const errors: CompileError[] = [];
  if (result.deployDetails?.componentFailures) {
    const failures = Array.isArray(result.deployDetails.componentFailures) 
      ? result.deployDetails.componentFailures 
      : [result.deployDetails.componentFailures];
      
    failures.forEach((f: any) => {
      errors.push({
        line: parseInt(f.lineNumber || '0'),
        column: parseInt(f.columnNumber || '0'),
        problem: f.problem
      });
    });
  }
  return errors;
}

/**
 * Builds a zip file for any complex or file-based Metadata API deployment
 */
export async function buildMetadataZip(type: string, name: string, metadata: any): Promise<Buffer> {
  const zip = new JSZip();
  
  if (type === 'ApexClass') {
    const body = metadata.body || '';
    zip.file(`classes/${name}.cls`, body);
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <status>Active</status>
</ApexClass>`;
    zip.file(`classes/${name}.cls-meta.xml`, metaXml);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>ApexClass</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  } 
  else if (type === 'ApexTrigger') {
    const body = metadata.body || '';
    zip.file(`triggers/${name}.trigger`, body);
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexTrigger xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <status>Active</status>
</ApexTrigger>`;
    zip.file(`triggers/${name}.trigger-meta.xml`, metaXml);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>ApexTrigger</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  }
  else if (type === 'ApexPage') {
    const body = metadata.body || metadata.content || '';
    zip.file(`pages/${name}.page`, body);
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>${name}</label>
</ApexPage>`;
    zip.file(`pages/${name}.page-meta.xml`, metaXml);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>ApexPage</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  }
  else if (type === 'LightningComponentBundle') {
    const html = metadata.html || '';
    const js = metadata.js || '';
    const css = metadata.css || '';
    const xml = metadata.xml || `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <isExposed>true</isExposed>
    <masterLabel>${name}</masterLabel>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`;
    
    zip.file(`lwc/${name}/${name}.html`, html);
    zip.file(`lwc/${name}/${name}.js`, js);
    if (css) {
      zip.file(`lwc/${name}/${name}.css`, css);
    }
    zip.file(`lwc/${name}/${name}.js-meta.xml`, xml);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>LightningComponentBundle</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  }
  else if (type === 'AuraDefinitionBundle') {
    const cmp = metadata.cmp || metadata.component || '';
    const controller = metadata.controller || '';
    const helper = metadata.helper || '';
    const style = metadata.style || '';
    const design = metadata.design || '';
    
    zip.file(`aura/${name}/${name}.cmp`, cmp);
    if (controller) zip.file(`aura/${name}/${name}Controller.js`, controller);
    if (helper) zip.file(`aura/${name}/${name}Helper.js`, helper);
    if (style) zip.file(`aura/${name}/${name}.css`, style);
    if (design) zip.file(`aura/${name}/${name}.design`, design);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>AuraDefinitionBundle</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  }
  else if (type === 'Flow') {
    const { normalizeFlowXml } = require('./flow');
    const xml = await normalizeFlowXml(metadata.xml || '');
    zip.file(`flows/${name}.flow`, xml);
    
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${name}</members>
        <name>Flow</name>
    </types>
    <version>60.0</version>
</Package>`;
    zip.file('package.xml', packageXml);
  }
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}
