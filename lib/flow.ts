import { parseStringPromise, Builder } from 'xml2js';
import JSZip from 'jszip';

/**
 * Normalizes and groups duplicate sibling tags in Flow XML to comply with Salesforce schema rules
 */
export async function normalizeFlowXml(xml: string): Promise<string> {
  function sortKeysAlphabetically(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sortKeysAlphabetically);
    }
    
    const sortedObj: any = {};
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    
    for (const key of keys) {
      sortedObj[key] = sortKeysAlphabetically(obj[key]);
    }
    
    return sortedObj;
  }

  try {
    if (!xml || xml.trim() === '') {
      return xml;
    }
    const parsed = await parseStringPromise(xml);
    if (parsed && parsed.Flow) {
      const visualKeys = [
        'screens',
        'recordCreates',
        'recordUpdates',
        'recordLookups',
        'recordDeletes',
        'actionCalls',
        'assignments',
        'decisions',
        'loops'
      ];

      visualKeys.forEach(key => {
        if (parsed.Flow[key] && Array.isArray(parsed.Flow[key])) {
          parsed.Flow[key].forEach((item: any) => {
            if (!item.locationX) {
              item.locationX = ['150'];
            }
            if (!item.locationY) {
              item.locationY = ['150'];
            }
          });
        }
      });

      // Also inject coordinates into the start node to comply with Salesforce v60.0 validation
      if (parsed.Flow.start && Array.isArray(parsed.Flow.start)) {
        parsed.Flow.start.forEach((item: any) => {
          if (!item.locationX) {
            item.locationX = ['150'];
          }
          if (!item.locationY) {
            item.locationY = ['150'];
          }
        });
      }

      // Auto-heal screen footer button validation rule: at least one navigation button must be active
      if (parsed.Flow.screens && Array.isArray(parsed.Flow.screens)) {
        parsed.Flow.screens.forEach((screen: any) => {
          const isAllowBackFalse = screen.allowBack?.[0] === 'false';
          const isAllowFinishFalse = screen.allowFinish?.[0] === 'false';
          if (isAllowBackFalse && isAllowFinishFalse) {
            screen.allowFinish = ['true'];
          }
        });
      }

      // Relocate trigger/object/filter elements mistakenly generated at root Flow node to start node
      const misplacedRootKeys = ['recordTriggerType', 'triggerType', 'object', 'filterLogic', 'filters'];
      let shouldMigrateToStart = false;

      if (parsed.Flow.recordTriggerType !== undefined || parsed.Flow.triggerType !== undefined || parsed.Flow.object !== undefined) {
        shouldMigrateToStart = true;
      }

      if (shouldMigrateToStart) {
        if (!parsed.Flow.start) {
          parsed.Flow.start = [{}];
        } else if (!Array.isArray(parsed.Flow.start)) {
          parsed.Flow.start = [parsed.Flow.start];
        }

        const startNode = parsed.Flow.start[0];

        misplacedRootKeys.forEach(key => {
          if (parsed.Flow[key] !== undefined) {
            if (startNode[key] === undefined) {
              startNode[key] = parsed.Flow[key];
            }
            delete parsed.Flow[key];
          }
        });
      }

      // Auto-heal processType based on start element record-trigger criteria
      let hasRecordTrigger = false;
      if (parsed.Flow.start && Array.isArray(parsed.Flow.start)) {
        const startNode = parsed.Flow.start[0];
        if (startNode.object || startNode.recordTriggerType || startNode.triggerType) {
          hasRecordTrigger = true;
        }
      }

      if (hasRecordTrigger) {
        // Force processType to AutoLaunchedFlow for record-triggered flows
        parsed.Flow.processType = ['AutoLaunchedFlow'];
        
        if (parsed.Flow.start && Array.isArray(parsed.Flow.start)) {
          const startNode = parsed.Flow.start[0];
          if (!startNode.triggerType) {
            startNode.triggerType = ['RecordAfterSave'];
          }
          if (!startNode.recordTriggerType) {
            startNode.recordTriggerType = ['CreateAndUpdate'];
          }
        }
      } else {
        const isScreenFlow = parsed.Flow.processType && (
          (Array.isArray(parsed.Flow.processType) && parsed.Flow.processType[0] === 'Flow') ||
          (parsed.Flow.processType === 'Flow')
        );
        if (isScreenFlow) {
          // Screen flows cannot have record-trigger properties inside start
          if (parsed.Flow.start && Array.isArray(parsed.Flow.start)) {
            const startNode = parsed.Flow.start[0];
            delete startNode.object;
            delete startNode.recordTriggerType;
            delete startNode.triggerType;
            delete startNode.filterLogic;
            delete startNode.filters;
          }
        }
      }

      // Auto-sanitize recordUpdates, recordLookups, and recordDeletes to comply with Salesforce schema rules
      const sanitizableKeys = ['recordUpdates', 'recordLookups', 'recordDeletes'];
      sanitizableKeys.forEach(key => {
        if (parsed.Flow[key] && Array.isArray(parsed.Flow[key])) {
          parsed.Flow[key].forEach((item: any) => {
            const hasInputReference = item.inputReference && Array.isArray(item.inputReference) && item.inputReference.length > 0 && item.inputReference[0];
            if (hasInputReference) {
              delete item.filterLogic;
              delete item.filters;
              delete item.object;
            } else {
              const hasFilterLogic = item.filterLogic !== undefined;
              const hasFilters = item.filters && Array.isArray(item.filters) && item.filters.length > 0;
              if (hasFilterLogic && !hasFilters) {
                delete item.filterLogic;
              }
            }

            // Auto-heal empty stringValue assignments on non-text fields (like Lookups/Dates)
            if (item.inputAssignments && Array.isArray(item.inputAssignments)) {
              item.inputAssignments.forEach((assignment: any) => {
                if (assignment.value && Array.isArray(assignment.value)) {
                  assignment.value.forEach((valObj: any) => {
                    if (valObj.stringValue && Array.isArray(valObj.stringValue)) {
                      const strVal = valObj.stringValue[0];
                      if (strVal === '' || strVal === null || strVal === undefined) {
                        delete assignment.value;
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });

      // Also sanitize start element's filterLogic
      if (parsed.Flow.start && Array.isArray(parsed.Flow.start)) {
        parsed.Flow.start.forEach((item: any) => {
          const hasFilterLogic = item.filterLogic !== undefined;
          const hasFilters = item.filters && Array.isArray(item.filters) && item.filters.length > 0;
          if (hasFilterLogic && !hasFilters) {
            delete item.filterLogic;
          }
        });
      }

      // Root level & non-filter element global sanitization
      const validFilterKeys = ['recordUpdates', 'recordLookups', 'recordDeletes', 'start'];
      const invalidKeysForNonFilterNodes = ['filterLogic', 'filters', 'object', 'recordTriggerType', 'triggerType'];

      // 1. Remove misplaced elements from the root Flow node
      invalidKeysForNonFilterNodes.forEach(key => {
        if (parsed.Flow[key] !== undefined) {
          delete parsed.Flow[key];
        }
      });

      // 2. Remove invalid filter/trigger elements from non-filter nodes (e.g. actionCalls, screens, assignments)
      Object.keys(parsed.Flow).forEach(key => {
        if (!validFilterKeys.includes(key) && Array.isArray(parsed.Flow[key])) {
          parsed.Flow[key].forEach((item: any) => {
            invalidKeysForNonFilterNodes.forEach(invalidKey => {
              if (item[invalidKey] !== undefined) {
                delete item[invalidKey];
              }
            });
          });
        }
      });

      // Recursively sort all elements inside the Flow node alphabetically
      parsed.Flow = sortKeysAlphabetically(parsed.Flow);
    }

    const builder = new Builder({
      renderOpts: { pretty: true, indent: '    ', newline: '\n' },
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    return builder.buildObject(parsed);
  } catch (e) {
    console.error('Error normalizing Flow XML:', e);
    return xml;
  }
}

export interface FlowNode {
  id: string;
  type: 'action' | 'decision' | 'start' | 'end' | 'loop' | 'assignment';
  label: string;
  description?: string;
  next?: string;
  rules?: { label: string; next: string }[];
}

/**
 * Parses Salesforce Flow XML into a flat list of UI nodes
 */
export async function parseFlowXmlToNodes(xml: string): Promise<FlowNode[]> {
  try {
    const result = await parseStringPromise(xml);
    const flow = result.Flow;
    if (!flow) return [];

    const nodes: FlowNode[] = [];

    // Start Node
    if (flow.start) {
      nodes.push({
        id: 'start',
        type: 'start',
        label: flow.label?.[0] || 'Start',
        next: flow.start[0].connector?.[0]?.targetReference?.[0]
      });
    }

    // Decisions
    (flow.decisions || []).forEach((d: any) => {
      nodes.push({
        id: d.name[0],
        type: 'decision',
        label: d.label[0],
        rules: (d.rules || []).map((r: any) => ({
          label: r.label[0],
          next: r.connector[0].targetReference[0]
        })),
        next: d.defaultConnector?.[0]?.targetReference?.[0]
      });
    });

    // Actions (Record Create, Update, Lookup, Delete)
    ['recordCreates', 'recordUpdates', 'recordLookups', 'recordDeletes', 'actionCalls'].forEach(key => {
      (flow[key] || []).forEach((a: any) => {
        nodes.push({
          id: a.name[0],
          type: 'action',
          label: a.label[0],
          next: a.connector?.[0]?.targetReference?.[0]
        });
      });
    });

    // Assignments
    (flow.assignments || []).forEach((a: any) => {
      nodes.push({
        id: a.name[0],
        type: 'assignment',
        label: a.label[0],
        next: a.connector?.[0]?.targetReference?.[0]
      });
    });

    return nodes;
  } catch (e) {
    console.error('Error parsing Flow XML:', e);
    return [];
  }
}

/**
 * Builds a zip file for Flow Metadata API deployment
 */
export async function buildFlowZip(fullName: string, xml: string): Promise<Buffer> {
  const zip = new JSZip();
  
  // 1. Add the flow file
  zip.file(`flows/${fullName}.flow`, xml);
  
  // 2. Add package.xml
  const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${fullName}</members>
        <name>Flow</name>
    </types>
    <version>60.0</version>
</Package>`;
  zip.file('package.xml', packageXml);

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Specialized system prompt for generating Salesforce Flow XML
 */
export function buildFlowSystemPrompt() {
  return `You are a Salesforce Flow Expert. Your task is to generate valid Salesforce Flow Metadata XML (version 60.0).
  
CRITICAL RULES:
1. Output ONLY valid XML. No markdown formatting, no explanations.
2. The root element must be <Flow xmlns="http://soap.sforce.com/2006/04/metadata">.
3. Every connector must reference a valid targetReference that exists in the XML.
4. Include <status>Active</status> or <status>Draft</status>.
5. Use standard API names for objects and fields.
6. Ensure all required elements like <label>, <processType>, and <start> are present.
7. CRITICAL: Inside screen elements (<screens>), each field in <fields> represents a FlowScreenField.
   - You MUST use <fieldText> to define the display label of the input field.
   - Do NOT use <label> inside a <fields> element (it is schema-invalid and fails deployment).
   - Each screen field must have a <name> (unique API name), <dataType> (e.g., String, Date, Number), <fieldType> (always "InputField" for inputs, "DisplayText" for display blocks), and <isRequired> (true/false).
   - Navigation Rules: Every screen must have at least one active navigation button. Do NOT set both <allowBack> and <allowFinish> to false (at least one must be true, typically <allowFinish>true</allowFinish> and <allowBack>false</allowBack>).
8. CRITICAL: Every visual element like <screens>, <recordCreates>, <recordUpdates>, <recordLookups>, <recordDeletes>, <assignments>, <decisions>, and <loops> MUST have coordinate values <locationX>150</locationX> and <locationY>150</locationY> defined to prevent deployment failures.

Example of a valid Screen Flow XML:
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Employee Registration Flow</label>
    <processType>Flow</processType>
    <start>
        <connector><targetReference>Registration_Screen</targetReference></connector>
    </start>
    <screens>
        <name>Registration_Screen</name>
        <label>Employee Registration Form</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <allowBack>false</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <fields>
            <name>Employee_Name</name>
            <dataType>String</dataType>
            <fieldText>Employee Name</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>true</isRequired>
        </fields>
        <fields>
            <name>Email_Address</name>
            <dataType>String</dataType>
            <fieldText>Email Address</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>false</isRequired>
        </fields>
        <connector><targetReference>Create_Employee_Record</targetReference></connector>
    </screens>
    <recordCreates>
        <name>Create_Employee_Record</name>
        <label>Create Employee Record</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <object>Employee_Project__c</object>
        <inputAssignments>
            <field>Name</field>
            <value><elementReference>Employee_Name</elementReference></value>
        </inputAssignments>
        <inputAssignments>
            <field>Email__c</field>
            <value><elementReference>Email_Address</elementReference></value>
        </inputAssignments>
        <connector><targetReference>Success_Screen</targetReference></connector>
    </recordCreates>
    <screens>
        <name>Success_Screen</name>
        <label>Registration Successful</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <allowBack>false</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <fields>
            <name>Success_Message</name>
            <fieldText>Employee record has been successfully created!</fieldText>
            <fieldType>DisplayText</fieldType>
        </fields>
    </screens>
    <status>Active</status>
</Flow>`;
}
